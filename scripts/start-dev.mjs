#!/usr/bin/env node

/**
 * Dev workflow orchestrator: starts Next.js dev server,
 * waits for it to be ready, then launches Claude Code with MCP tools.
 */

import { spawn } from "node:child_process";

const DEV_URL = "http://localhost:3000";
const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 60_000;

/** Poll URL until it responds with 2xx or 3xx */
async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || (res.status >= 300 && res.status < 400)) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

// Start Next.js dev server
const devServer = spawn("yarn", ["dev"], {
  stdio: ["ignore", "pipe", "pipe"],
  cwd: process.cwd(),
});

devServer.stdout.pipe(process.stdout);
devServer.stderr.pipe(process.stderr);

devServer.on("error", (err) => {
  console.error("Failed to start dev server:", err.message);
  process.exit(1);
});

console.log("Starting Next.js dev server...");

try {
  await waitForServer(DEV_URL, TIMEOUT_MS);
  console.log(`Dev server ready at ${DEV_URL}`);
} catch (err) {
  console.error(err.message);
  devServer.kill();
  process.exit(1);
}

// Launch Claude Code
const claude = spawn(
  "claude",
  ["--dangerously-skip-permissions", "--model", "opus"],
  {
    stdio: "inherit",
    cwd: process.cwd(),
  },
);

claude.on("error", (err) => {
  console.error("Failed to start Claude:", err.message);
  devServer.kill();
  process.exit(1);
});

claude.on("exit", (code) => {
  devServer.kill();
  process.exit(code ?? 0);
});

// Handle cleanup
function cleanup() {
  devServer.kill();
  claude.kill();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
