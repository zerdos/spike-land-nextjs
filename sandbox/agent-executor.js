#!/usr/bin/env node
/**
 * Agent Executor - Runs inside Vercel Sandbox
 *
 * This script:
 * 1. Reads context from context.json (written by the parent process)
 * 2. Fetches current code from testing.spike.land
 * 3. Runs Claude Agent SDK with codespace tools
 * 4. POSTs result to callback URL
 *
 * Expected context.json structure:
 * {
 *   appId: string,
 *   messageId: string,
 *   jobId: string,
 *   codespaceId: string,
 *   userMessage: string,
 *   callbackUrl: string,
 *   callbackSecret: string
 * }
 */

const { query } = require("@anthropic-ai/claude-agent-sdk");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { createCodespaceTools } = require("./codespace-tools");

// System prompt for the agent
const SYSTEM_PROMPT = `You are an AI coding assistant integrated with a live code editor.
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
- search_and_replace: Find and replace text in the code
- find_lines: Find line numbers matching a pattern
- validate_code: Check code for errors without updating`;

/**
 * POST result to callback URL
 */
async function postCallback(callbackUrl, callbackSecret, result) {
  return new Promise((resolve, reject) => {
    const url = new URL(callbackUrl);
    const isHttps = url.protocol === "https:";
    const httpModule = isHttps ? https : http;

    const postData = JSON.stringify(result);
    const req = httpModule.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
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
          console.log(`[agent-executor] Callback response: ${res.statusCode}`);
          resolve({ statusCode: res.statusCode, body: data });
        });
      },
    );

    req.on("error", (e) => {
      console.error(`[agent-executor] Callback error: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log("[agent-executor] Starting...");

  // Read context from file
  let context;
  try {
    const contextJson = fs.readFileSync("context.json", "utf-8");
    context = JSON.parse(contextJson);
    console.log(
      `[agent-executor] Context loaded: app=${context.appId}, message=${context.messageId}`,
    );
  } catch (error) {
    console.error("[agent-executor] Failed to read context:", error.message);
    process.exit(1);
  }

  const {
    appId,
    messageId,
    jobId,
    codespaceId,
    userMessage,
    callbackUrl,
    callbackSecret,
  } = context;

  // Initialize codespace tools
  const tools = createCodespaceTools(codespaceId);

  try {
    // Fetch current code to include in context
    console.log("[agent-executor] Fetching current code...");
    const currentCode = await tools.read_code();

    if (
      currentCode.startsWith("Error") ||
      currentCode.startsWith("Network error")
    ) {
      console.warn("[agent-executor] Could not fetch current code:", currentCode);
    } else {
      console.log(`[agent-executor] Current code length: ${currentCode.length}`);
    }

    // Build system prompt with current code context
    const fullSystemPrompt = currentCode &&
        !currentCode.startsWith("Error") &&
        !currentCode.startsWith("Network error")
      ? `${SYSTEM_PROMPT}\n\nCurrent code:\n\`\`\`tsx\n${currentCode}\n\`\`\``
      : SYSTEM_PROMPT;

    console.log("[agent-executor] Starting agent query...");

    // Run the Claude Agent SDK query
    const result = query({
      prompt: userMessage,
      options: {
        systemPrompt: fullSystemPrompt,
        tools: [], // Disable built-in tools
        permissionMode: "dontAsk",
        persistSession: false,
      },
    });

    // Collect response
    let finalResponse = "";
    for await (const message of result) {
      if (message.type === "assistant") {
        const content = message.message?.content || [];
        for (const part of content) {
          if (part.type === "text") {
            finalResponse += part.text || "";
          }
        }
      } else if (message.type === "result") {
        console.log(`[agent-executor] Query completed: ${message.subtype}`);
      }
    }

    console.log(`[agent-executor] Response length: ${finalResponse.length}`);

    // Post success callback
    await postCallback(callbackUrl, callbackSecret, {
      jobId,
      appId,
      messageId,
      success: true,
      response: finalResponse,
    });

    console.log("[agent-executor] Completed successfully");
  } catch (error) {
    console.error("[agent-executor] Agent error:", error.message);

    // Post error callback
    try {
      await postCallback(callbackUrl, callbackSecret, {
        jobId,
        appId,
        messageId,
        success: false,
        error: error.message || "Unknown error",
      });
    } catch (callbackError) {
      console.error(
        "[agent-executor] Failed to send error callback:",
        callbackError.message,
      );
    }

    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("[agent-executor] Fatal error:", error);
  process.exit(1);
});
