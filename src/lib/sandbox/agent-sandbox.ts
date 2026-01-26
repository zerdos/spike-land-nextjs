/**
 * Vercel Sandbox Agent Service
 *
 * Spawns isolated Vercel Sandbox VMs to run Claude Agent SDK for processing
 * user messages. This provides a push-based alternative to polling.
 *
 * Architecture:
 * 1. User sends message -> API creates SandboxJob -> spawns sandbox
 * 2. Sandbox runs agent-executor.js with context
 * 3. On completion, sandbox POSTs result to callback endpoint
 * 4. Callback endpoint creates agent message and notifies via SSE
 */

import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { Sandbox } from "@vercel/sandbox";
import ms from "ms";

/**
 * Configuration for sandbox execution
 */
const SANDBOX_CONFIG = {
  // Default timeout: 5 minutes (can be extended up to 5 hours on Pro)
  defaultTimeout: ms("5m"),
  // Runtime to use
  runtime: "node24" as const,
  // vCPUs to allocate (2 is a good balance of cost/performance)
  vcpus: 2,
};

/**
 * Context passed to the sandbox for agent execution
 */
interface AgentContext {
  appId: string;
  messageId: string;
  jobId: string;
  codespaceId: string;
  userMessage: string;
  callbackUrl: string;
  callbackSecret: string;
}

/**
 * Result returned from spawning a sandbox
 */
interface SpawnResult {
  success: boolean;
  sandboxId?: string;
  error?: string;
}

/**
 * Get the callback URL for sandbox results
 */
function getCallbackUrl(): string {
  // In production, use the Vercel URL
  if (process.env["VERCEL_URL"]) {
    return `https://${process.env["VERCEL_URL"]}/api/agent/sandbox/callback`;
  }
  // In development, use localhost (sandbox can't reach this - for testing only)
  return `http://localhost:3000/api/agent/sandbox/callback`;
}

/**
 * Agent executor script that runs inside the sandbox
 *
 * This script:
 * 1. Reads context from context.json
 * 2. Fetches current code from testing.spike.land
 * 3. Runs Claude Agent SDK with codespace tools
 * 4. POSTs result to callback URL
 */
const AGENT_EXECUTOR_SCRIPT = `
const { query } = require("@anthropic-ai/claude-agent-sdk");
const fs = require("fs");
const https = require("https");
const http = require("http");

// Read context
const context = JSON.parse(fs.readFileSync("context.json", "utf-8"));
const { appId, messageId, jobId, codespaceId, userMessage, callbackUrl, callbackSecret } = context;

console.log("[sandbox] Starting agent for app:", appId, "message:", messageId);

// Fetch current code from testing.spike.land
async function fetchCurrentCode() {
  return new Promise((resolve, reject) => {
    https.get(
      \`https://testing.spike.land/live/\${codespaceId}/session.json\`,
      { headers: { Accept: "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.code || "");
          } catch {
            resolve("");
          }
        });
      }
    ).on("error", () => resolve(""));
  });
}

// Simple MCP-like tool for codespace operations
function createCodespaceTools(codespaceId) {
  const TESTING_SPIKE_LAND = "https://testing.spike.land";

  return {
    read_code: async () => {
      return new Promise((resolve, reject) => {
        https.get(
          \`\${TESTING_SPIKE_LAND}/live/\${codespaceId}/session.json\`,
          { headers: { Accept: "application/json" } },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                const json = JSON.parse(data);
                resolve(json.code || "");
              } catch {
                resolve("Error parsing response");
              }
            });
          }
        ).on("error", (e) => resolve("Network error: " + e.message));
      });
    },

    update_code: async (code) => {
      return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ code, run: true });
        const req = https.request(
          {
            hostname: "testing.spike.land",
            port: 443,
            path: \`/live/\${codespaceId}/api/code\`,
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                const json = JSON.parse(data);
                resolve(json.success ? "success" : json.error || "Update failed");
              } catch {
                resolve("Error parsing response");
              }
            });
          }
        );
        req.on("error", (e) => resolve("Network error: " + e.message));
        req.write(postData);
        req.end();
      });
    },

    search_and_replace: async (search, replace) => {
      const code = await this.read_code();
      if (code.startsWith("Error") || code.startsWith("Network")) {
        return code;
      }
      const newCode = code.split(search).join(replace);
      if (newCode === code) {
        return "No matches found for the search pattern";
      }
      return this.update_code(newCode);
    },
  };
}

// POST result to callback
async function postCallback(result) {
  return new Promise((resolve, reject) => {
    const url = new URL(callbackUrl);
    const isHttps = url.protocol === "https:";
    const httpModule = isHttps ? https : http;

    const postData = JSON.stringify(result);
    const req = httpModule.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "X-Sandbox-Secret": callbackSecret,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log("[sandbox] Callback response:", res.statusCode, data);
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );
    req.on("error", (e) => {
      console.error("[sandbox] Callback error:", e.message);
      reject(e);
    });
    req.write(postData);
    req.end();
  });
}

// System prompt for the agent
const SYSTEM_PROMPT = \`You are an AI coding assistant integrated with a live code editor.
You help users build and modify their React applications.

IMPORTANT RULES:
1. ALWAYS read the current code first using read_code before making changes
2. Use update_code to replace the entire code when making significant changes
3. Use search_and_replace for small, targeted changes
4. Keep your responses concise and focused on the code changes
5. The code runs in a React environment - export a default component

Available tools:
- read_code: Read the current code from the editor
- update_code: Replace the entire code content
- search_and_replace: Find and replace text in the code\`;

async function main() {
  try {
    const currentCode = await fetchCurrentCode();
    console.log("[sandbox] Current code length:", currentCode.length);

    const tools = createCodespaceTools(codespaceId);

    // Build the prompt with context
    const fullSystemPrompt = currentCode
      ? SYSTEM_PROMPT + "\\n\\nCurrent code:\\n\`\`\`tsx\\n" + currentCode + "\\n\`\`\`"
      : SYSTEM_PROMPT;

    // Run the query (simplified - in production use full SDK with MCP)
    // For now, we'll use a basic approach
    const result = await query({
      prompt: userMessage,
      options: {
        systemPrompt: fullSystemPrompt,
        tools: [], // Disable built-in tools
        permissionMode: "dontAsk",
        persistSession: false,
      },
    });

    let finalResponse = "";
    for await (const message of result) {
      if (message.type === "assistant") {
        const content = message.message?.content || [];
        for (const part of content) {
          if (part.type === "text") {
            finalResponse += part.text || "";
          }
        }
      }
    }

    console.log("[sandbox] Agent response length:", finalResponse.length);

    // Post callback with success
    await postCallback({
      jobId,
      appId,
      messageId,
      success: true,
      response: finalResponse,
    });

  } catch (error) {
    console.error("[sandbox] Agent error:", error.message);

    // Post callback with error
    await postCallback({
      jobId,
      appId,
      messageId,
      success: false,
      error: error.message || "Unknown error",
    });
  }
}

main();
`;

/**
 * Spawn a Vercel Sandbox to process an agent message
 *
 * @param appId - The app ID
 * @param messageId - The user message ID that triggered this
 * @param jobId - The SandboxJob ID for tracking
 * @param codespaceId - The codespace ID for the app
 * @param userMessage - The user's message content
 * @returns SpawnResult with sandboxId on success
 */
export async function spawnAgentSandbox(
  appId: string,
  messageId: string,
  jobId: string,
  codespaceId: string,
  userMessage: string,
): Promise<SpawnResult> {
  const callbackSecret = process.env["SANDBOX_CALLBACK_SECRET"];
  if (!callbackSecret) {
    logger.error("[sandbox] SANDBOX_CALLBACK_SECRET not configured");
    return { success: false, error: "Sandbox callback secret not configured" };
  }

  // Update job status to SPAWNING
  await tryCatch(
    prisma.sandboxJob.update({
      where: { id: jobId },
      data: { status: "SPAWNING" },
    }),
  );

  try {
    logger.info("[sandbox] Creating sandbox for job", { jobId });

    // Create context for the sandbox
    const context: AgentContext = {
      appId,
      messageId,
      jobId,
      codespaceId,
      userMessage,
      callbackUrl: getCallbackUrl(),
      callbackSecret,
    };

    // Create the sandbox
    const sandbox = await Sandbox.create({
      runtime: SANDBOX_CONFIG.runtime,
      resources: { vcpus: SANDBOX_CONFIG.vcpus },
      timeout: SANDBOX_CONFIG.defaultTimeout,
      // Pass auth if running locally (on Vercel, OIDC is automatic)
      ...(process.env["VERCEL_TEAM_ID"] && {
        teamId: process.env["VERCEL_TEAM_ID"],
        projectId: process.env["VERCEL_PROJECT_ID"],
        token: process.env["VERCEL_TOKEN"],
      }),
    });

    const sandboxId = sandbox.sandboxId;
    logger.info("[sandbox] Sandbox created", { sandboxId });

    // Update job with sandbox ID and status
    await tryCatch(
      prisma.sandboxJob.update({
        where: { id: jobId },
        data: {
          sandboxId,
          status: "RUNNING",
        },
      }),
    );

    // Write context file to sandbox
    await sandbox.writeFiles([
      {
        path: "context.json",
        content: Buffer.from(JSON.stringify(context, null, 2)),
      },
      {
        path: "agent-executor.js",
        content: Buffer.from(AGENT_EXECUTOR_SCRIPT),
      },
    ]);

    // Install the Claude Agent SDK
    logger.info("[sandbox] Installing dependencies...");
    const installResult = await sandbox.runCommand("npm", [
      "install",
      "@anthropic-ai/claude-agent-sdk",
    ]);

    if (installResult.exitCode !== 0) {
      const stderr = await installResult.stderr();
      logger.error("[sandbox] npm install failed", { stderr });
      throw new Error(`npm install failed: ${stderr}`);
    }

    // Run the agent executor (detached so we don't block)
    logger.info("[sandbox] Starting agent executor...");
    const cmd = await sandbox.runCommand({
      cmd: "node",
      args: ["agent-executor.js"],
      env: {
        ANTHROPIC_API_KEY: process.env["ANTHROPIC_API_KEY"] || "",
      },
      detached: true,
    });

    logger.info("[sandbox] Agent started", { cmdId: cmd.cmdId, sandboxId });

    // Don't wait for completion - the sandbox will callback when done
    // The sandbox has a timeout and will auto-terminate

    return { success: true, sandboxId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[sandbox] Failed to spawn sandbox", { error: errorMessage });

    // Update job status to FAILED
    await tryCatch(
      prisma.sandboxJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: errorMessage,
          completedAt: new Date(),
        },
      }),
    );

    return { success: false, error: errorMessage };
  }
}

/**
 * Get the status of a sandbox by its ID
 */
export async function getSandboxStatus(
  sandboxId: string,
): Promise<string | null> {
  try {
    const sandbox = await Sandbox.get({ sandboxId });
    return sandbox.status;
  } catch {
    return null;
  }
}

/**
 * Stop a sandbox by its ID
 */
export async function stopSandbox(sandboxId: string): Promise<boolean> {
  try {
    const sandbox = await Sandbox.get({ sandboxId });
    await sandbox.stop();
    return true;
  } catch (error) {
    logger.error("[sandbox] Failed to stop sandbox", { sandboxId, error: String(error) });
    return false;
  }
}
