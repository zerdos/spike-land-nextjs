#!/usr/bin/env tsx
/**
 * Reset Ralph Local State
 * Cleans up stale state and resets all agents to idle
 *
 * Usage:
 *   yarn ralph:local:reset          # Reset state, keep completed/failed history
 *   yarn ralph:local:reset --full   # Full reset, clear everything
 */

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { OrchestratorState, RalphLocalConfig } from "./types";

const STATE_FILE = ".claude/ralph-local-state.json";
const DEFAULT_CONFIG: Partial<RalphLocalConfig> = {
  outputDir: "/tmp/ralph-output",
  pidDir: "/tmp/ralph-pids",
  worktreeBase: resolve(process.cwd(), "../ralph-worktrees"),
  poolSizes: {
    planning: 10,
    developer: 4,
    reviewer: 6,
    tester: 2,
    fixer: 1,
  },
};

function killStaleProcesses(): number {
  let killed = 0;
  const pidDir = DEFAULT_CONFIG.pidDir!;

  if (!existsSync(pidDir)) {
    return 0;
  }

  const pidFiles = readdirSync(pidDir).filter(f => f.endsWith(".pid"));

  for (const pidFile of pidFiles) {
    try {
      const pid = parseInt(readFileSync(join(pidDir, pidFile), "utf-8").trim(), 10);
      if (!isNaN(pid)) {
        try {
          process.kill(pid, 0); // Check if running
          console.log(`   Killing stale process ${pid} (${pidFile})`);
          process.kill(pid, "SIGTERM");
          killed++;
        } catch {
          // Process not running, that's fine
        }
      }
    } catch {
      // Ignore errors reading PID file
    }
  }

  // Clean up PID files
  for (const pidFile of pidFiles) {
    try {
      rmSync(join(pidDir, pidFile));
    } catch {
      // Ignore
    }
  }

  return killed;
}

function cleanOutputFiles(): void {
  const outputDir = DEFAULT_CONFIG.outputDir!;

  if (!existsSync(outputDir)) {
    return;
  }

  const files = readdirSync(outputDir);
  for (const file of files) {
    try {
      rmSync(join(outputDir, file));
    } catch {
      // Ignore
    }
  }

  console.log(`   Cleaned ${files.length} output files`);
}

function processCompletedWork(): { plans: number; code: number; } {
  let plans = 0;
  let code = 0;

  // Check agent outputs for completed markers
  const outputDir = DEFAULT_CONFIG.outputDir!;
  if (!existsSync(outputDir)) {
    return { plans, code };
  }

  const outputFiles = readdirSync(outputDir).filter(f => f.endsWith(".json"));

  for (const file of outputFiles) {
    try {
      const content = readFileSync(join(outputDir, file), "utf-8");
      if (!content.trim()) continue;

      // Parse JSON output
      const json = JSON.parse(content);
      const result = json.result || content;

      // Check for PLAN_READY
      const planMatch = result.match(/<PLAN_READY\s+ticket="([^"]+)"\s+path="([^"]+)"/);
      if (planMatch) {
        console.log(`   Found completed plan: ${planMatch[1]} at ${planMatch[2]}`);
        plans++;
      }

      // Check for CODE_READY
      const codeMatch = result.match(/<CODE_READY\s+ticket="([^"]+)"\s+branch="([^"]+)"/);
      if (codeMatch) {
        console.log(`   Found completed code: ${codeMatch[1]} on branch ${codeMatch[2]}`);
        code++;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { plans, code };
}

function createFreshState(
  fullReset: boolean,
  existingState: OrchestratorState | null,
): OrchestratorState {
  const pools = DEFAULT_CONFIG.poolSizes!;

  const createAgentPool = (role: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `${role}-${i + 1}`,
      role,
      pid: null,
      status: "idle" as const,
      ticketId: null,
      worktree: null,
      outputFile: join(DEFAULT_CONFIG.outputDir!, `${role}-${i + 1}.json`),
      pidFile: join(DEFAULT_CONFIG.pidDir!, `${role}-${i + 1}.pid`),
      startedAt: null,
      lastHeartbeat: null,
      retries: 0,
    }));

  const newState: OrchestratorState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    iteration: fullReset ? 0 : (existingState?.iteration || 0),
    pools: {
      planning: createAgentPool("planning", pools.planning),
      developer: createAgentPool("developer", pools.developer),
      reviewer: createAgentPool("reviewer", pools.reviewer),
      tester: createAgentPool("tester", pools.tester),
      fixer: createAgentPool("fixer", pools.fixer),
    },
    pendingPlans: fullReset ? [] : (existingState?.pendingPlans || []),
    pendingCode: fullReset ? [] : (existingState?.pendingCode || []),
    pendingReview: fullReset ? [] : (existingState?.pendingReview || []),
    pendingPRFixes: fullReset ? [] : (existingState?.pendingPRFixes || []),
    completedTickets: fullReset ? [] : (existingState?.completedTickets || []),
    failedTickets: fullReset ? [] : (existingState?.failedTickets || []),
    blockedTickets: [],
    mainBranchStatus: {
      status: "unknown",
      failedWorkflows: [],
      lastCheckedAt: new Date().toISOString(),
    },
  };

  return newState;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fullReset = args.includes("--full");

  console.log("\n" + "=".repeat(60));
  console.log("🔄 RALPH LOCAL STATE RESET");
  console.log("=".repeat(60));

  if (fullReset) {
    console.log("   Mode: FULL RESET (clearing all history)");
  } else {
    console.log("   Mode: SOFT RESET (keeping completed/failed history)");
  }

  // Step 1: Kill any stale processes
  console.log("\n📋 Step 1: Kill stale processes");
  const killed = killStaleProcesses();
  console.log(`   Killed ${killed} processes`);

  // Step 2: Load existing state
  console.log("\n📋 Step 2: Load existing state");
  const statePath = join(process.cwd(), STATE_FILE);
  let existingState: OrchestratorState | null = null;

  if (existsSync(statePath)) {
    try {
      existingState = JSON.parse(readFileSync(statePath, "utf-8"));
      console.log(`   Found state with iteration ${existingState?.iteration}`);
      console.log(
        `   Completed: ${existingState?.completedTickets.length}, Failed: ${existingState?.failedTickets.length}`,
      );
    } catch (_parseError) {
      console.log("   Failed to parse existing state, will create fresh");
    }
  } else {
    console.log("   No existing state found");
  }

  // Step 3: Process any completed work before resetting
  console.log("\n📋 Step 3: Check for unreported completed work");
  const completed = processCompletedWork();
  if (completed.plans > 0 || completed.code > 0) {
    console.log(`   Found ${completed.plans} plans, ${completed.code} code implementations`);
    console.log("   ⚠️  These were completed but may not be recorded in state");
  } else {
    console.log("   No unreported work found");
  }

  // Step 4: Clean output files
  console.log("\n📋 Step 4: Clean output files");
  cleanOutputFiles();

  // Step 5: Create fresh state
  console.log("\n📋 Step 5: Create fresh state");
  const newState = createFreshState(fullReset, existingState);
  writeFileSync(statePath, JSON.stringify(newState, null, 2));
  console.log("   State reset complete");

  // Step 6: Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ RESET COMPLETE");
  console.log("=".repeat(60));
  console.log(`
   All agents reset to idle
   ${fullReset ? "All queues cleared" : "Queues preserved (pending work may continue)"}
   ${
    fullReset
      ? "History cleared"
      : `History preserved (${existingState?.completedTickets.length || 0} completed, ${
        existingState?.failedTickets.length || 0
      } failed)`
  }

   To start the orchestrator with auto-restart:
     yarn ralph:local:supervised

   To check status:
     yarn ralph:local:status
`);
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
