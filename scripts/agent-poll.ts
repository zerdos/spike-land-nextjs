/**
 * Agent Polling Script
 *
 * Polls for pending messages from the Redis queue and processes them.
 * Can update app properties: status, description, name, etc.
 *
 * Usage: yarn agent:poll [--once] [--interval=5000] [--prod] [--stats]
 *
 * Flags:
 *   --once        Run once and exit (don't loop)
 *   --interval=N  Set polling interval in ms (default: 5000)
 *   --prod        Use production API (https://spike.land) instead of localhost
 *   --stats       Show queue statistics and exit
 *
 * SECURITY WARNING: Claude CLI Permissions
 * =========================================
 *
 * This script uses --dangerously-skip-permissions to allow the agent to
 * execute MCP tool calls without interactive confirmation. This is required
 * for autonomous operation but has security implications:
 *
 * 1. The Claude subprocess has unrestricted access to configured MCP tools:
 *    - spike-land: Codespace creation/update operations
 *    - MCP_DOCKER: Browser automation capabilities
 *
 * 2. ISOLATION REQUIREMENTS:
 *    - Run this script in an isolated environment (Docker container, VM)
 *    - Limit network access to required services only
 *    - Use least-privilege credentials for SPIKE_LAND_API_KEY
 *    - Monitor agent activities via lastAgentActivity timestamps
 *
 * 3. Set AGENT_REQUIRE_PERMISSIONS=true to re-enable permission prompts
 *    (useful for debugging but breaks autonomous operation)
 */

import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

// Load environment variables
// Use quiet: true to suppress verbose logging
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

import { type AppBuildStatus, PrismaClient } from "@prisma/client";
import { Redis } from "@upstash/redis";
import { type ChildProcess, spawn } from "child_process";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

// Initialize Prisma with proper adapter
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required for database access. " +
        "Please ensure it is set in your environment.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

const prisma = createPrismaClient();

// Initialize Redis (support both UPSTASH_REDIS_REST_* and KV_REST_API_* naming)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  console.error(
    "Redis credentials not configured. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN",
  );
  process.exit(1);
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

// Redis key helpers
const KEYS = {
  APP_PENDING_MESSAGES: (appId: string) => `app:${appId}:pending_messages`,
  APPS_WITH_PENDING: "apps:with_pending",
  AGENT_WORKING: (appId: string) => `app:${appId}:agent_working`,
} as const;

// Valid status transitions
const VALID_STATUSES: AppBuildStatus[] = [
  "PROMPTING",
  "WAITING",
  "DRAFTING",
  "BUILDING",
  "FINE_TUNING",
  "TEST",
  "LIVE",
  "ARCHIVED",
  "FAILED",
];

/**
 * Permission control for Claude CLI
 * Set AGENT_REQUIRE_PERMISSIONS=true to enable interactive permission prompts
 * (breaks autonomous operation but useful for debugging)
 */
const SKIP_PERMISSIONS = process.env.AGENT_REQUIRE_PERMISSIONS !== "true";

interface AppUpdate {
  name?: string;
  description?: string;
  status?: AppBuildStatus;
  codespaceId?: string;
  codespaceUrl?: string;
  isPublic?: boolean;
  isCurated?: boolean;
  slug?: string;
}

interface ProcessResult {
  success: boolean;
  agentMessage?: string;
  appUpdate?: AppUpdate;
  statusMessage?: string;
}

// Claude Code spawn interfaces
interface ChatMessage {
  id: string;
  role: "USER" | "AGENT" | "SYSTEM";
  content: string;
  createdAt: Date;
  attachments: Array<{
    image: {
      id: string;
      originalUrl: string;
      aiDescription: string | null;
      tags: string[];
    };
  }>;
}

interface ClaudeStreamEvent {
  type: string;
  name?: string;
  content?: unknown;
  text?: string;
  delta?: { text?: string; };
  input?: { codespace_id?: string; }; // For tool_use events
}

interface SpawnResult {
  success: boolean;
  response: string;
  codeUpdated: boolean;
  toolCalls: string[];
  codespaceId?: string; // Extracted from codespace_update tool calls
  error?: string;
}

// Constants for Claude Code spawning
const CLAUDE_TIMEOUT_MS = 300000; // 5 minutes

// Environment detection: --prod flag uses production URL
const isProd = process.argv.includes("--prod");
const PROD_URL = "https://spike.land";
const LOCAL_URL = "http://localhost:3000";
const AGENT_API_URL = isProd
  ? PROD_URL
  : (process.env.NEXT_PUBLIC_APP_URL || LOCAL_URL);

/**
 * Get all app IDs that have pending messages
 */
async function getAppsWithPending(): Promise<string[]> {
  return redis.smembers(KEYS.APPS_WITH_PENDING);
}

/**
 * Dequeue oldest message from an app's queue
 */
async function dequeueMessage(appId: string): Promise<string | null> {
  const messageId = await redis.rpop<string>(KEYS.APP_PENDING_MESSAGES(appId));

  // Check if queue is now empty
  const remaining = await redis.llen(KEYS.APP_PENDING_MESSAGES(appId));
  if (remaining === 0) {
    await redis.srem(KEYS.APPS_WITH_PENDING, appId);
  }

  return messageId;
}

/**
 * Mark agent as working on an app
 */
async function setAgentWorking(appId: string, isWorking: boolean): Promise<void> {
  if (isWorking) {
    await redis.set(KEYS.AGENT_WORKING(appId), "1", { ex: 300 }); // 5 min TTL
  } else {
    await redis.del(KEYS.AGENT_WORKING(appId));
  }

  // Also update in database
  await prisma.app.update({
    where: { id: appId },
    data: {
      lastAgentActivity: isWorking ? new Date() : undefined,
    },
  });
}

/**
 * Add an agent message to the app's chat
 */
async function addAgentMessage(appId: string, content: string): Promise<void> {
  await prisma.appMessage.create({
    data: {
      appId,
      role: "AGENT",
      content,
    },
  });
}

/**
 * Add a system message to the app's chat
 */
async function addSystemMessage(appId: string, content: string): Promise<void> {
  await prisma.appMessage.create({
    data: {
      appId,
      role: "SYSTEM",
      content,
    },
  });
}

/**
 * Update app properties
 */
async function updateApp(appId: string, update: AppUpdate): Promise<void> {
  const data: Record<string, unknown> = {};

  if (update.name !== undefined) data["name"] = update.name;
  if (update.description !== undefined) data["description"] = update.description;
  if (update.codespaceId !== undefined) data["codespaceId"] = update.codespaceId;
  if (update.codespaceUrl !== undefined) data["codespaceUrl"] = update.codespaceUrl;
  if (update.isPublic !== undefined) data["isPublic"] = update.isPublic;
  if (update.isCurated !== undefined) data["isCurated"] = update.isCurated;
  if (update.slug !== undefined) data["slug"] = update.slug;

  // Handle status update separately (with history)
  if (update.status !== undefined) {
    data["status"] = update.status;
  }

  if (Object.keys(data).length > 0) {
    await prisma.app.update({
      where: { id: appId },
      data,
    });
  }
}

/**
 * Update app status with history entry
 */
async function updateAppStatus(
  appId: string,
  status: AppBuildStatus,
  message?: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.app.update({
      where: { id: appId },
      data: { status },
    }),
    prisma.appStatusHistory.create({
      data: {
        appId,
        status,
        message: message || `Status changed to ${status}`,
      },
    }),
  ]);
}

/**
 * Get the user message content by ID
 */
async function getMessageContent(messageId: string): Promise<string | null> {
  const message = await prisma.appMessage.findUnique({
    where: { id: messageId },
    select: { content: true, role: true },
  });

  return message?.content || null;
}

/**
 * Get app details for context
 */
async function getAppContext(appId: string) {
  return prisma.app.findUnique({
    where: { id: appId },
    include: {
      requirements: true,
      messages: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ============================================================
// Claude Code Spawning Functions
// ============================================================

/**
 * Get the last N messages with their attachments for context
 */
async function getChatHistory(appId: string, limit = 10): Promise<ChatMessage[]> {
  const messages = await prisma.appMessage.findMany({
    where: { appId },
    include: {
      attachments: {
        include: {
          image: {
            select: {
              id: true,
              originalUrl: true,
              aiDescription: true,
              tags: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  // Return in chronological order (oldest first)
  return messages.reverse() as unknown as ChatMessage[];
}

/**
 * Format chat history into a prompt string with image references
 */
function formatPromptWithHistory(
  messages: ChatMessage[],
  app: {
    name: string;
    description: string | null;
    codespaceId: string | null;
    codespaceUrl: string | null;
  },
): string {
  let prompt = `# App Context\n`;
  prompt += `Name: ${app.name}\n`;
  prompt += `Description: ${app.description || "No description yet"}\n`;
  prompt += `Codespace ID: ${app.codespaceId || "Not yet created - you need to create one"}\n`;
  prompt += `Codespace URL: ${
    app.codespaceUrl || "Will be available after codespace creation"
  }\n\n`;
  prompt += `# Chat History (last ${messages.length} messages)\n\n`;

  for (const msg of messages) {
    const roleLabel = msg.role === "USER" ? "User" : msg.role === "AGENT" ? "Assistant" : "System";
    const timestamp = msg.createdAt.toISOString();
    prompt += `## ${roleLabel} (${timestamp})\n\n`;
    prompt += msg.content + "\n\n";

    if (msg.attachments && msg.attachments.length > 0) {
      prompt += `### Attached Images:\n`;
      for (const att of msg.attachments) {
        prompt += `- Image URL: ${att.image.originalUrl}\n`;
        if (att.image.aiDescription) {
          prompt += `  Description: ${att.image.aiDescription}\n`;
        }
        if (att.image.tags && att.image.tags.length > 0) {
          prompt += `  Tags: ${att.image.tags.join(", ")}\n`;
        }
      }
      prompt += "\n";
    }
  }

  return prompt;
}

/**
 * Build the system prompt for the agent
 */
function buildSystemPrompt(app: {
  name: string;
  codespaceId: string | null;
  codespaceUrl: string | null;
}): string {
  return `You are an AI agent helping to build and improve a React application called "${app.name}".

Your capabilities:
1. Use the spike-land MCP tools to create and update codespaces (mcp__spike-land__codespace_update, etc.)
2. Use the MCP_DOCKER tools for browser automation and testing if needed

Current codespace: ${app.codespaceId || "None yet - you need to create one using codespace_update"}
Live URL: ${app.codespaceUrl || "Will be available after codespace creation"}

Guidelines:
- When the user requests changes, use mcp__spike-land__codespace_update to modify the React code
- If creating a new app, use a descriptive codespace_id based on the app name (lowercase, hyphens)
- After updating code, confirm the change was successful
- When the user provides images, download and analyze them to understand their requirements
- Always provide helpful feedback about what you did
- For animated apps, use CSS animations, transitions, or framer-motion`;
}

/**
 * Create temporary MCP config file
 */
async function createTempMcpConfig(): Promise<string> {
  const tmpDir = join(tmpdir(), `claude-mcp-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  const configPath = join(tmpDir, "mcp-config.json");

  const mcpDockerUrl = process.env.MCP_DOCKER_URL || "http://localhost:8808/sse";

  const config = {
    mcpServers: {
      "spike-land": {
        command: "npx",
        args: ["@spike-npm-land/mcp-server"],
        env: {
          SPIKE_LAND_API_KEY: process.env.SPIKE_LAND_API_KEY || "",
        },
      },
      "MCP_DOCKER": {
        type: "http",
        url: mcpDockerUrl,
      },
    },
  };

  await writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

/**
 * Clean up temporary MCP config directory
 */
async function cleanupMcpConfig(configPath: string): Promise<void> {
  try {
    const dir = configPath.replace(/\/[^/]+$/, "");
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Extract final response text from stream-json output
 */
function extractResponseText(output: string): string {
  const lines = output.split("\n").filter(Boolean);

  for (const line of lines) {
    try {
      const event = JSON.parse(line);

      // Check for "result" type (final output)
      if (event.type === "result" && event.result) {
        return event.result;
      }

      // Check for "assistant" type (message content)
      if (
        event.type === "assistant" &&
        event.message?.content?.[0]?.text
      ) {
        return event.message.content[0].text;
      }
    } catch {
      // Not JSON, skip
    }
  }

  // Fallback: return raw output (shouldn't happen normally)
  return output;
}

/**
 * Spawn Claude CLI and process the response
 */
async function spawnClaudeCode(
  prompt: string,
  systemPrompt: string,
  mcpConfigPath: string,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const args = [
      "--print",
      "--verbose",
      "--output-format",
      "stream-json",
      "--mcp-config",
      mcpConfigPath,
      "--system-prompt",
      systemPrompt,
      // Conditionally skip permissions for autonomous operation
      // See security warning in file header for implications
      ...(SKIP_PERMISSIONS ? ["--dangerously-skip-permissions"] : []),
      "-", // Read prompt from stdin
    ];

    console.log("  Spawning Claude CLI...");
    if (SKIP_PERMISSIONS) {
      console.log(
        "  WARNING: Running with --dangerously-skip-permissions (see file header for security implications)",
      );
    }
    console.log(`  Prompt length: ${prompt.length} chars`);
    console.log(`  System prompt: ${systemPrompt.substring(0, 100)}...`);

    const claude: ChildProcess = spawn("claude", args, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Write prompt to stdin
    claude.stdin?.write(prompt);
    claude.stdin?.end();

    let output = "";
    let errorOutput = "";
    const toolCalls: string[] = [];
    let codeUpdated = false;
    let codespaceId: string | undefined;

    claude.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;

      // Parse streaming JSON lines
      const lines = chunk.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const event: ClaudeStreamEvent = JSON.parse(line);

          // Track tool calls
          if (event.type === "tool_use" && event.name) {
            toolCalls.push(event.name);
            console.log(`    Tool call: ${event.name}`);

            // Detect codespace updates and extract codespace_id
            if (event.name.includes("codespace_update")) {
              codeUpdated = true;
              if (event.input?.codespace_id) {
                codespaceId = event.input.codespace_id;
                console.log(`    Codespace ID: ${codespaceId}`);
              }
            } else if (
              event.name.includes("codespace_run") ||
              event.name.includes("codespace_link")
            ) {
              codeUpdated = true;
            }
          }
        } catch {
          // Not JSON, might be plain text
        }
      }
    });

    claude.stderr?.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      claude.kill("SIGTERM");
      resolve({
        success: false,
        response: "Claude CLI timed out after 5 minutes",
        codeUpdated: false,
        toolCalls,
        error: "timeout",
      });
    }, CLAUDE_TIMEOUT_MS);

    claude.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        console.error(`  Claude CLI exited with code ${code}`);
        resolve({
          success: false,
          response: `Claude CLI exited with code ${code}: ${errorOutput}`,
          codeUpdated: false,
          toolCalls,
          error: errorOutput,
        });
        return;
      }

      // Extract the final response text from streaming output
      const responseText = extractResponseText(output);

      console.log(`  Claude completed. Tools called: ${toolCalls.length}`);
      if (codespaceId) {
        console.log(`  Extracted codespace ID: ${codespaceId}`);
      }

      resolve({
        success: true,
        response: responseText,
        codeUpdated,
        toolCalls,
        codespaceId,
      });
    });

    claude.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        response: `Failed to spawn Claude CLI: ${err.message}`,
        codeUpdated: false,
        toolCalls,
        error: err.message,
      });
    });
  });
}

/**
 * Post agent response via API (triggers SSE broadcast)
 */
async function postAgentResponse(
  appId: string,
  content: string,
  codeUpdated: boolean,
  processedMessageIds: string[],
): Promise<void> {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) {
    throw new Error("AGENT_API_KEY not configured");
  }

  const response = await fetch(`${AGENT_API_URL}/api/agent/apps/${appId}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      content,
      codeUpdated,
      processedMessageIds,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post agent response: ${error}`);
  }
}

/**
 * Update app's codespace info via agent API
 */
async function updateAppCodespace(appId: string, codespaceId: string): Promise<void> {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) {
    throw new Error("AGENT_API_KEY not configured");
  }

  console.log(`  Updating app codespace: ${codespaceId}`);

  const response = await fetch(`${AGENT_API_URL}/api/apps/${appId}/agent`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      codespaceId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`  Failed to update app codespace: ${error}`);
  } else {
    console.log(`  App codespace updated successfully`);
  }
}

/**
 * Process a single message - Spawns Claude Code to handle it
 */
async function processMessage(
  appId: string,
  messageId: string,
): Promise<ProcessResult> {
  const content = await getMessageContent(messageId);
  if (!content) {
    return { success: false, agentMessage: "Could not find message content" };
  }

  const app = await getAppContext(appId);
  if (!app) {
    return { success: false, agentMessage: "Could not find app" };
  }

  // Mark message as read
  await prisma.appMessage.update({
    where: { id: messageId },
    data: { isRead: true },
  });

  console.log(`  Processing message: "${content.substring(0, 50)}..."`);
  console.log(`  App: ${app.name} (${app.status})`);

  // Get chat history with images
  const chatHistory = await getChatHistory(appId, 10);
  console.log(`  Chat history: ${chatHistory.length} messages`);

  // Format the prompt with full context
  const prompt = formatPromptWithHistory(chatHistory, {
    name: app.name,
    description: app.description,
    codespaceId: app.codespaceId,
    codespaceUrl: app.codespaceUrl,
  });

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    name: app.name,
    codespaceId: app.codespaceId,
    codespaceUrl: app.codespaceUrl,
  });

  // Create temporary MCP config
  let mcpConfigPath: string | null = null;
  try {
    mcpConfigPath = await createTempMcpConfig();
    console.log(`  Created MCP config: ${mcpConfigPath}`);

    // Spawn Claude Code CLI
    const result = await spawnClaudeCode(prompt, systemPrompt, mcpConfigPath);

    if (!result.success) {
      console.error(`  Claude error: ${result.error}`);
      return {
        success: false,
        agentMessage: `Agent error: ${result.response}`,
      };
    }

    // Update app's codespace if one was created/used
    if (result.codespaceId) {
      try {
        await updateAppCodespace(appId, result.codespaceId);
      } catch (updateError) {
        console.error(`  Failed to update codespace: ${updateError}`);
      }
    }

    // Post response via API (triggers SSE broadcast including code_updated)
    try {
      await postAgentResponse(appId, result.response, result.codeUpdated, [messageId]);
      console.log(`  Posted response via API (codeUpdated: ${result.codeUpdated})`);
    } catch (apiError) {
      console.error(`  API error: ${apiError}`);
      // Fall back to direct database insert
      return {
        success: true,
        agentMessage: result.response,
        appUpdate: result.codeUpdated
          ? { status: "BUILDING" as AppBuildStatus, codespaceId: result.codespaceId }
          : undefined,
        statusMessage: result.codeUpdated ? "Code updated by agent" : undefined,
      };
    }

    // Response was posted via API, don't add another message in processApp
    return {
      success: true,
      // agentMessage is handled by API, so don't return it here
      appUpdate: result.codeUpdated
        ? { status: "BUILDING" as AppBuildStatus }
        : undefined,
      statusMessage: result.codeUpdated ? "Code updated by agent" : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`  Processing error: ${errorMsg}`);
    return {
      success: false,
      agentMessage: `Agent error: ${errorMsg}`,
    };
  } finally {
    // Clean up temp files
    if (mcpConfigPath) {
      await cleanupMcpConfig(mcpConfigPath);
    }
  }
}

/**
 * Process all pending messages for an app
 */
async function processApp(appId: string): Promise<void> {
  console.log(`\nProcessing app: ${appId}`);

  try {
    // Mark agent as working
    await setAgentWorking(appId, true);

    // Process messages one by one
    let messageId = await dequeueMessage(appId);
    let processedCount = 0;

    while (messageId) {
      console.log(`  Message: ${messageId}`);

      const result = await processMessage(appId, messageId);

      if (result.success) {
        // Add agent response
        if (result.agentMessage) {
          await addAgentMessage(appId, result.agentMessage);
        }

        // Update app properties if specified
        if (result.appUpdate) {
          if (result.appUpdate.status) {
            await updateAppStatus(
              appId,
              result.appUpdate.status,
              result.statusMessage,
            );
            // Remove status from appUpdate to avoid duplicate update
            const { status: _, ...restUpdate } = result.appUpdate;
            if (Object.keys(restUpdate).length > 0) {
              await updateApp(appId, restUpdate);
            }
          } else {
            await updateApp(appId, result.appUpdate);
          }
        }

        processedCount++;
      } else {
        console.error(`  Failed to process message: ${result.agentMessage}`);
        // Add error message to chat
        await addSystemMessage(
          appId,
          `Error processing message: ${result.agentMessage}`,
        );
      }

      // Get next message
      messageId = await dequeueMessage(appId);
    }

    console.log(`  Processed ${processedCount} messages`);
  } catch (error) {
    console.error(`  Error processing app ${appId}:`, error);
    await addSystemMessage(
      appId,
      `Agent error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    // Mark agent as done
    await setAgentWorking(appId, false);
  }
}

/**
 * Main polling loop
 */
async function poll(): Promise<number> {
  const appIds = await getAppsWithPending();

  if (appIds.length === 0) {
    return 0;
  }

  console.log(`Found ${appIds.length} apps with pending messages`);

  for (const appId of appIds) {
    await processApp(appId);
  }

  return appIds.length;
}

/**
 * Get queue statistics
 */
async function getQueueStats(): Promise<void> {
  const appIds = await getAppsWithPending();
  let totalPending = 0;

  console.log("\nQueue Statistics:");
  console.log("=================");

  for (const appId of appIds) {
    const count = await redis.llen(KEYS.APP_PENDING_MESSAGES(appId));
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { name: true, status: true },
    });
    console.log(`  ${app?.name || appId}: ${count} pending (${app?.status})`);
    totalPending += count;
  }

  console.log(`\nTotal: ${appIds.length} apps, ${totalPending} messages`);
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runOnce = args.includes("--once");
  const showStats = args.includes("--stats");
  const intervalArg = args.find((a) => a.startsWith("--interval="));
  const interval = intervalArg ? parseInt(intervalArg.split("=")[1]!, 10) : 5000;

  console.log("Agent Poll Script");
  console.log("=================");
  console.log(`Environment: ${isProd ? "PRODUCTION" : "LOCAL"}`);
  console.log(`API URL: ${AGENT_API_URL}`);
  console.log(`Redis URL: ${redisUrl?.substring(0, 30)}...`);

  if (showStats) {
    await getQueueStats();
    await prisma.$disconnect();
    return;
  }

  if (runOnce) {
    console.log("Running once...\n");
    const processed = await poll();
    console.log(`\nDone. Processed ${processed} apps.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Polling every ${interval}ms (Ctrl+C to stop)\n`);

  // Continuous polling loop
  const pollLoop = async () => {
    try {
      await poll();
    } catch (error) {
      console.error("Poll error:", error);
    }
    setTimeout(pollLoop, interval);
  };

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nShutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });

  // Start polling
  await pollLoop();
}

// Export functions for testing and external use
export {
  addAgentMessage,
  addSystemMessage,
  dequeueMessage,
  getAppsWithPending,
  getQueueStats,
  poll,
  processApp,
  processMessage,
  setAgentWorking,
  updateApp,
  updateAppStatus,
  VALID_STATUSES,
};

// Run if executed directly
main().catch(console.error);
