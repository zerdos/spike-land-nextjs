#!/usr/bin/env node
/**
 * vibe-dev CLI - Lightweight development workflow for vibe-coded apps
 *
 * Usage:
 *   vibe-dev dev --codespace my-app    # Start dev mode with file watching
 *   vibe-dev pull --codespace my-app   # Download code to local
 *   vibe-dev push --codespace my-app   # Push local code to server
 *   vibe-dev claude [args]             # Run Claude Code with MCP configured
 */

import { spawn } from "child_process";
import { program } from "commander";
import { readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pullCode, pushCode } from "./sync.js";
import { downloadToLocal, getLocalPath, startDevMode } from "./watcher.js";

const VERSION = "0.1.0";

program
  .name("vibe-dev")
  .description("Lightweight development workflow for vibe-coded apps")
  .version(VERSION);

// ============================================================
// dev command - Start development mode with file watching
// ============================================================
program
  .command("dev")
  .description("Start development mode with auto-sync")
  .option("-c, --codespace <id>", "Codespace ID(s) to watch", collect, [])
  .option("--debounce <ms>", "Debounce delay in milliseconds", "100")
  .action(async (options) => {
    const codespaces = options.codespace as string[];

    if (codespaces.length === 0) {
      console.error("Error: At least one --codespace is required");
      process.exit(1);
    }

    try {
      const { stop } = await startDevMode(codespaces, {
        debounceMs: parseInt(options.debounce, 10),
        onSync: (id) => {
          console.log(`🔄 ${id} synced - iframe should reload`);
        },
      });

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        console.log("\n\nShutting down...");
        await stop();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await stop();
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {});
    } catch (error) {
      console.error("Failed to start dev mode:", error);
      process.exit(1);
    }
  });

// ============================================================
// pull command - Download code from server to local
// ============================================================
program
  .command("pull")
  .description("Download code from testing.spike.land to local file")
  .requiredOption("-c, --codespace <id>", "Codespace ID")
  .action(async (options) => {
    try {
      const localPath = await downloadToLocal(options.codespace);
      console.log(`\nCode saved to: ${localPath}`);
    } catch (error) {
      console.error("Pull failed:", error);
      process.exit(1);
    }
  });

// ============================================================
// push command - Push local code to server
// ============================================================
program
  .command("push")
  .description("Push local code to testing.spike.land")
  .requiredOption("-c, --codespace <id>", "Codespace ID")
  .option("--no-run", "Don't transpile (skip run step)")
  .action(async (options) => {
    try {
      const localPath = getLocalPath(options.codespace);
      const code = await readFile(localPath, "utf-8");

      console.log(`📤 Pushing ${options.codespace} (${code.length} bytes)...`);
      const result = await pushCode(options.codespace, code, options.run !== false);

      console.log(`✅ Pushed successfully`);
      console.log(`   Hash: ${result.hash}`);
      console.log(`   Updated: ${result.updated.join(", ")}`);
    } catch (error) {
      console.error("Push failed:", error);
      process.exit(1);
    }
  });

// ============================================================
// code command - Get/set code directly (no local file)
// ============================================================
program
  .command("code")
  .description("Get or set code directly")
  .requiredOption("-c, --codespace <id>", "Codespace ID")
  .option("--get", "Get code from server")
  .option("--set <code>", "Set code on server")
  .action(async (options) => {
    try {
      if (options.get) {
        const code = await pullCode(options.codespace);
        console.log(code);
      } else if (options.set) {
        const result = await pushCode(options.codespace, options.set);
        console.log("Updated:", result.updated.join(", "));
      } else {
        console.error("Specify --get or --set");
        process.exit(1);
      }
    } catch (error) {
      console.error("Operation failed:", error);
      process.exit(1);
    }
  });

// ============================================================
// claude command - Run Claude Code with MCP tools configured
// ============================================================
program
  .command("claude")
  .description("Run Claude Code with spike-land MCP tools")
  .option("-c, --codespace <id>", "Codespace ID for context")
  .option("-p, --prompt <text>", "One-shot prompt (non-interactive)")
  .allowUnknownOption(true)
  .action(async (options, command) => {
    try {
      // Create temporary MCP config
      const mcpConfigPath = await createMcpConfig();

      const args = ["--mcp-config", mcpConfigPath];

      // Add codespace context to system prompt
      if (options.codespace) {
        const systemPrompt = buildSystemPrompt(options.codespace);
        args.push("--system-prompt", systemPrompt);
      }

      // Pass through any additional arguments
      const extraArgs = command.args || [];
      args.push(...extraArgs);

      // Add prompt if provided
      if (options.prompt) {
        args.push("-p", options.prompt);
      }

      console.log(`🤖 Starting Claude Code...`);
      if (options.codespace) {
        console.log(`   Codespace: ${options.codespace}`);
      }

      // Spawn Claude interactively
      const claude = spawn("claude", args, {
        stdio: "inherit",
        env: process.env,
      });

      claude.on("close", (code) => {
        process.exit(code || 0);
      });

      claude.on("error", (err) => {
        console.error("Failed to spawn Claude:", err);
        process.exit(1);
      });
    } catch (error) {
      console.error("Failed to run Claude:", error);
      process.exit(1);
    }
  });

// ============================================================
// Helper functions
// ============================================================

/**
 * Collect multiple values for an option
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Create temporary MCP configuration file
 * Includes spike-land MCP (codespace tools) and Playwright MCP (browser automation)
 */
async function createMcpConfig(): Promise<string> {
  const configDir = join(tmpdir(), `vibe-dev-mcp-${Date.now()}`);
  const { mkdir } = await import("fs/promises");
  await mkdir(configDir, { recursive: true });
  const configPath = join(configDir, "mcp-config.json");

  const config = {
    mcpServers: {
      "spike-land": {
        type: "stdio",
        command: "npx",
        args: ["-y", "@spike-npm-land/mcp-server"],
        env: {
          SPIKE_LAND_API_KEY: process.env["SPIKE_LAND_API_KEY"] || "",
        },
      },
      "playwright": {
        type: "stdio",
        command: "npx",
        args: ["-y", "@anthropic/mcp-server-playwright"],
        env: {},
      },
    },
  };

  await writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

/**
 * Build system prompt for Claude with codespace context
 */
function buildSystemPrompt(codespaceId: string): string {
  const localPath = getLocalPath(codespaceId);

  return `You are developing a React application in codespace "${codespaceId}".

## Local Development Mode

The code is synced to a local file:
- **File path**: ${localPath}
- **Auto-sync**: Changes automatically sync to testing.spike.land
- **Live preview**: https://testing.spike.land/live/${codespaceId}

## Workflow

1. Read the file to see current code
2. Edit the file with your changes
3. Changes auto-sync and preview reloads

## MCP Tools (Alternative)

If local file editing isn't working, use MCP tools:
- mcp__spike-land__codespace_update: Create/update code
- mcp__spike-land__codespace_run: Transpile code
- mcp__spike-land__codespace_screenshot: Get screenshot
- mcp__spike-land__codespace_link: Get shareable link

## Guidelines

- Write complete, working React/TypeScript with Tailwind CSS
- ACTUALLY make the changes - don't just describe them
- Test by checking the live preview`;
}

// ============================================================
// Main
// ============================================================

program.parse();
