#!/usr/bin/env tsx
/**
 * Ralph Local Orchestrator
 * Main loop coordinating 16 local Claude Code agents
 *
 * Usage:
 *   yarn ralph:local           # Single iteration
 *   yarn ralph:local:watch     # Continuous mode (every 2 minutes)
 *   yarn ralph:local:dry-run   # Test without making changes
 *   yarn ralph:local:status    # Show current status
 */

import { existsSync, readFileSync } from "fs";
import matter from "gray-matter";
import { join, resolve } from "path";
import {
  getAgentOutput,
  isAgentCompleted,
  isAgentRunning,
  isAgentStale,
  parseAgentMarkers,
  stopAgent,
} from "./agent-spawner";
import { getPRStatus, listRalphPRs, mergePR } from "./pr-manager";
import {
  addBlockedTicket,
  loadState,
  markTicketCompleted,
  markTicketFailed,
  saveState,
  updateAgent,
} from "./state-manager";
import {
  enqueueCode,
  enqueuePlan,
  getQueueStats,
  routeCodeToTesters,
  routeIssuesToPlanners,
  routePlansToDevelopers,
} from "./ticket-router";
import type { LocalIterationResult, OrchestratorState, RalphLocalConfig } from "./types";
import { cleanupStaleWorktrees, cleanupWorktree, syncWorktreeWithMain } from "./worktree-manager";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize a ticket ID to always have the # prefix
 */
function normalizeTicketId(ticketId: string): string {
  return ticketId.startsWith("#") ? ticketId : `#${ticketId}`;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG_FILE = "content/ralph-local.config.md";
const DEFAULT_CONFIG: RalphLocalConfig = {
  active: true,
  poolSizes: {
    planning: 8,
    developer: 4,
    tester: 4,
  },
  syncIntervalMs: 2 * 60 * 1000, // 2 minutes
  staleThresholdMs: 30 * 60 * 1000, // 30 minutes
  maxRetries: 2,
  autoMerge: true,
  repo: "zerdos/spike-land-nextjs",
  workDir: process.cwd(),
  outputDir: "/tmp/ralph-output",
  pidDir: "/tmp/ralph-pids",
  planDir: "/tmp/ralph-plans",
  worktreeBase: resolve(process.cwd(), "../ralph-worktrees"),
};

/**
 * Load configuration from markdown file or use defaults
 */
function loadConfig(): RalphLocalConfig {
  const configPath = join(process.cwd(), CONFIG_FILE);

  if (!existsSync(configPath)) {
    console.log("⚠️ Config file not found, using defaults");
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const { data } = matter(content);

    return {
      ...DEFAULT_CONFIG,
      active: data.active ?? DEFAULT_CONFIG.active,
      poolSizes: {
        planning: data.pool_planning ?? DEFAULT_CONFIG.poolSizes.planning,
        developer: data.pool_developer ?? DEFAULT_CONFIG.poolSizes.developer,
        tester: data.pool_tester ?? DEFAULT_CONFIG.poolSizes.tester,
      },
      syncIntervalMs: (data.sync_interval_min ?? 2) * 60 * 1000,
      staleThresholdMs: (data.stale_threshold_min ?? 30) * 60 * 1000,
      maxRetries: data.max_retries ?? DEFAULT_CONFIG.maxRetries,
      autoMerge: data.auto_merge ?? DEFAULT_CONFIG.autoMerge,
      repo: data.repo ?? DEFAULT_CONFIG.repo,
    };
  } catch (error) {
    console.error("Failed to load config:", error);
    return DEFAULT_CONFIG;
  }
}

// ============================================================================
// Main Orchestration Loop
// ============================================================================

async function runOrchestrationLoop(
  config: RalphLocalConfig,
  dryRun: boolean = false,
): Promise<LocalIterationResult> {
  const startTime = new Date();
  const result: LocalIterationResult = {
    iteration: 0,
    startTime,
    endTime: startTime,
    agentsSpawned: 0,
    plansCreated: 0,
    codeImplemented: 0,
    prsCreated: 0,
    prsMerged: 0,
    staleAgentsCleaned: 0,
    errors: [],
    summary: "",
  };

  console.log("\n" + "=".repeat(60));
  console.log("📊 RALPH LOCAL ORCHESTRATOR");
  console.log("=".repeat(60));

  // Load state
  const state = loadState(config);
  state.iteration++;
  result.iteration = state.iteration;

  console.log(`\n🔄 Iteration ${state.iteration}`);
  console.log(
    `   Pools: ${config.poolSizes.planning}P / ${config.poolSizes.developer}D / ${config.poolSizes.tester}T`,
  );

  if (dryRun) {
    console.log("   🔒 DRY RUN MODE - no changes will be made");
  }

  // Step 0: Clean up stale agents
  console.log("\n📋 STEP 0: Clean up stale agents");
  result.staleAgentsCleaned = await step0_cleanupStaleAgents(state, config, dryRun);

  // Step 1: Check PR status
  console.log("\n📋 STEP 1: Check PR status");
  result.prsMerged = await step1_checkPRStatus(state, config, dryRun);

  // Step 2: Collect agent outputs
  console.log("\n📋 STEP 2: Collect agent outputs");
  const collected = await step2_collectAgentOutputs(state, config);
  result.plansCreated = collected.plans;
  result.codeImplemented = collected.code;
  result.prsCreated = collected.prs;

  // Step 3: Route completed plans to developers
  console.log("\n📋 STEP 3: Route plans to developers");
  if (!dryRun) {
    result.agentsSpawned += routePlansToDevelopers(state, config);
  }

  // Step 4: Route completed code to testers
  console.log("\n📋 STEP 4: Route code to testers");
  if (!dryRun) {
    result.agentsSpawned += routeCodeToTesters(state, config);
  }

  // Step 5: Fill planning pool with new issues
  console.log("\n📋 STEP 5: Fill planning pool");
  if (!dryRun) {
    result.agentsSpawned += routeIssuesToPlanners(state, config);
  }

  // Step 6: Handle blocked agents
  console.log("\n📋 STEP 6: Handle blocked agents");
  await step6_handleBlockedAgents(state, config, dryRun);

  // Step 7: Sync active branches with main
  console.log("\n📋 STEP 7: Sync branches with main");
  if (!dryRun) {
    await step7_syncBranches(state, config);
  }

  // Save state
  if (!dryRun) {
    saveState(state, config);
  }

  // Generate summary
  result.endTime = new Date();
  result.summary = generateSummary(result, state);

  console.log("\n" + "=".repeat(60));
  console.log(result.summary);
  console.log("=".repeat(60) + "\n");

  return result;
}

// ============================================================================
// Step Implementations
// ============================================================================

/**
 * Step 0: Clean up stale agents
 */
async function step0_cleanupStaleAgents(
  state: OrchestratorState,
  config: RalphLocalConfig,
  dryRun: boolean,
): Promise<number> {
  let cleanedCount = 0;

  // Check all running agents for staleness
  for (const pool of [state.pools.planning, state.pools.developer, state.pools.tester]) {
    for (const agent of pool) {
      if (agent.status !== "running") continue;

      if (isAgentStale(agent, config.staleThresholdMs)) {
        console.log(`   🗑️ Stale agent: ${agent.id} (ticket: ${agent.ticketId})`);

        if (!dryRun) {
          // Stop the agent process
          if (agent.pid) {
            stopAgent(agent);
          }

          // Mark as stale
          updateAgent(state, agent.id, {
            status: "stale",
            pid: null,
          });

          // If it had a ticket, mark as blocked
          if (agent.ticketId) {
            addBlockedTicket(state, {
              ticketId: agent.ticketId,
              reason: "Agent became stale",
              blockedAt: new Date().toISOString(),
              retries: 0,
              lastAttemptBy: agent.id,
            });
          }

          cleanedCount++;
        }
      }
    }
  }

  // Also clean up stale worktrees
  if (!dryRun) {
    const worktreesCleaned = cleanupStaleWorktrees(config, config.staleThresholdMs * 2);
    if (worktreesCleaned > 0) {
      console.log(`   Cleaned ${worktreesCleaned} stale worktrees`);
    }
  }

  if (cleanedCount === 0) {
    console.log("   No stale agents found");
  }

  return cleanedCount;
}

/**
 * Step 1: Check PR status and merge/fix as needed
 */
async function step1_checkPRStatus(
  state: OrchestratorState,
  config: RalphLocalConfig,
  dryRun: boolean,
): Promise<number> {
  let mergedCount = 0;

  const ralphPRs = listRalphPRs(config);
  if (ralphPRs.length === 0) {
    console.log("   No open Ralph PRs");
    return 0;
  }

  console.log(`   Found ${ralphPRs.length} open Ralph PRs`);

  for (const prNumber of ralphPRs) {
    const status = getPRStatus(prNumber, config);
    if (!status) continue;

    console.log(`   PR #${prNumber}: ${status.status} (CI: ${status.ciStatus})`);

    switch (status.status) {
      case "APPROVED":
        if (config.autoMerge && status.ciStatus === "passing") {
          console.log(`   🔀 Merging PR #${prNumber}...`);
          if (!dryRun) {
            if (mergePR(prNumber, config)) {
              mergedCount++;

              // Find and complete the ticket
              const codeWork = state.pendingCode.find((c) => c.prNumber === prNumber);
              if (codeWork) {
                markTicketCompleted(state, codeWork.ticketId);
                cleanupWorktree(codeWork.ticketId, config);
              }
            }
          }
        }
        break;

      case "CHANGES_REQUESTED":
        console.log(`   📝 PR #${prNumber} needs fixes (${status.reviewComments.length} comments)`);
        // Developer agents will pick this up
        break;

      case "CI_FAILING":
        console.log(`   ❌ PR #${prNumber} has failing CI`);
        // Developer agents will pick this up
        break;

      case "PENDING":
        console.log(`   ⏳ PR #${prNumber} awaiting review`);
        break;
    }
  }

  return mergedCount;
}

/**
 * Step 2: Collect agent outputs and process markers
 */
async function step2_collectAgentOutputs(
  state: OrchestratorState,
  _config: RalphLocalConfig,
): Promise<{ plans: number; code: number; prs: number; }> {
  let plans = 0;
  let code = 0;
  let prs = 0;

  for (const pool of [state.pools.planning, state.pools.developer, state.pools.tester]) {
    for (const agent of pool) {
      if (agent.status !== "running") continue;

      // Get agent output
      const output = getAgentOutput(agent);
      if (!output) continue;

      // Check if agent has completed
      const completed = isAgentCompleted(output);
      const stillRunning = isAgentRunning(agent);

      // Parse markers from output
      const markers = parseAgentMarkers(output);

      for (const marker of markers) {
        switch (marker.type) {
          case "PLAN_READY":
            const normalizedPlanTicketId = normalizeTicketId(marker.ticketId);
            console.log(`   📄 Plan ready: ${normalizedPlanTicketId}`);
            const issueNum = parseInt(normalizedPlanTicketId.replace("#", ""), 10);
            enqueuePlan(state, normalizedPlanTicketId, issueNum, "", marker.path, agent.id);
            plans++;
            break;

          case "CODE_READY":
            const normalizedCodeTicketId = normalizeTicketId(marker.ticketId);
            console.log(`   💻 Code ready: ${normalizedCodeTicketId}`);
            const codeIssueNum = parseInt(normalizedCodeTicketId.replace("#", ""), 10);
            if (agent.worktree) {
              enqueueCode(
                state,
                normalizedCodeTicketId,
                codeIssueNum,
                agent.worktree,
                "",
                agent.id,
              );
              code++;
            }
            break;

          case "PR_CREATED":
            const normalizedPrTicketId = normalizeTicketId(marker.ticketId);
            console.log(`   🔗 PR created: ${normalizedPrTicketId} -> ${marker.prUrl}`);
            // Update pending code with PR info
            const codeWork = state.pendingCode.find((c) => c.ticketId === normalizedPrTicketId);
            if (codeWork) {
              codeWork.prUrl = marker.prUrl;
              codeWork.prNumber = marker.prNumber;
              codeWork.status = "pr_created";
            }
            prs++;
            break;

          case "BLOCKED":
            const normalizedBlockedTicketId = normalizeTicketId(marker.ticketId);
            console.log(`   🚫 Blocked: ${normalizedBlockedTicketId} - ${marker.reason}`);
            addBlockedTicket(state, {
              ticketId: normalizedBlockedTicketId,
              reason: marker.reason,
              blockedAt: new Date().toISOString(),
              retries: 0,
              lastAttemptBy: agent.id,
            });
            break;

          case "ERROR":
            const normalizedErrorTicketId = normalizeTicketId(marker.ticketId);
            console.log(`   ❌ Error: ${normalizedErrorTicketId} - ${marker.error}`);
            markTicketFailed(state, normalizedErrorTicketId);
            break;
        }
      }

      // If agent completed, mark as idle
      if (completed && !stillRunning) {
        console.log(`   ✅ Agent ${agent.id} completed`);
        updateAgent(state, agent.id, {
          status: "idle",
          ticketId: null,
          pid: null,
          worktree: null,
        });
      }
    }
  }

  return { plans, code, prs };
}

/**
 * Step 6: Handle blocked agents (retry or escalate)
 */
async function step6_handleBlockedAgents(
  state: OrchestratorState,
  config: RalphLocalConfig,
  dryRun: boolean,
): Promise<void> {
  const blockedTickets = state.blockedTickets.filter((b) => b.retries < config.maxRetries);

  if (blockedTickets.length === 0) {
    console.log("   No blocked tickets to retry");
    return;
  }

  console.log(`   ${blockedTickets.length} blocked tickets`);

  for (const blocked of blockedTickets) {
    console.log(
      `   🔄 ${blocked.ticketId}: ${blocked.reason} (retry ${
        blocked.retries + 1
      }/${config.maxRetries})`,
    );

    if (!dryRun) {
      blocked.retries++;

      // If max retries exceeded, mark as failed
      if (blocked.retries >= config.maxRetries) {
        console.log(`   ❌ ${blocked.ticketId} exceeded max retries, marking as failed`);
        markTicketFailed(state, blocked.ticketId);
        state.blockedTickets = state.blockedTickets.filter((b) => b.ticketId !== blocked.ticketId);
      }
    }
  }
}

/**
 * Step 7: Sync active branches with main
 */
async function step7_syncBranches(
  state: OrchestratorState,
  _config: RalphLocalConfig,
): Promise<void> {
  // Find all active worktrees
  const activeWorktrees = new Set<string>();

  for (const pool of [state.pools.developer, state.pools.tester]) {
    for (const agent of pool) {
      if (agent.worktree && agent.status === "running") {
        activeWorktrees.add(agent.worktree);
      }
    }
  }

  if (activeWorktrees.size === 0) {
    console.log("   No active worktrees to sync");
    return;
  }

  console.log(`   Syncing ${activeWorktrees.size} active worktrees`);

  for (const worktree of Array.from(activeWorktrees)) {
    const result = syncWorktreeWithMain(worktree);
    if (!result.success) {
      console.log(`   ⚠️ Sync failed for ${worktree}: ${result.message}`);
    }
  }
}

/**
 * Generate iteration summary
 */
function generateSummary(result: LocalIterationResult, state: OrchestratorState): string {
  const stats = getQueueStats(state);
  const duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;

  const parts: string[] = [];

  if (result.agentsSpawned > 0) parts.push(`spawned ${result.agentsSpawned} agents`);
  if (result.plansCreated > 0) parts.push(`${result.plansCreated} plans created`);
  if (result.codeImplemented > 0) parts.push(`${result.codeImplemented} code implemented`);
  if (result.prsCreated > 0) parts.push(`${result.prsCreated} PRs created`);
  if (result.prsMerged > 0) parts.push(`${result.prsMerged} PRs merged`);
  if (result.staleAgentsCleaned > 0) parts.push(`${result.staleAgentsCleaned} stale cleaned`);
  if (result.errors.length > 0) parts.push(`${result.errors.length} errors`);

  const summary = parts.length > 0 ? parts.join(", ") : "no significant actions";

  return `
📊 Iteration ${result.iteration} Summary (${duration.toFixed(1)}s)
   ${summary}

   Queues: ${stats.pendingPlans} plans | ${stats.pendingCode} code
   Agents: ${stats.runningPlanners}/${
    stats.idlePlanners + stats.runningPlanners
  }P | ${stats.runningDevelopers}/${
    stats.idleDevelopers + stats.runningDevelopers
  }D | ${stats.runningTesters}/${stats.idleTesters + stats.runningTesters}T
   Completed: ${state.completedTickets.length} | Failed: ${state.failedTickets.length} | Blocked: ${state.blockedTickets.length}
`;
}

/**
 * Show current status
 */
function showStatus(config: RalphLocalConfig): void {
  const state = loadState(config);
  const stats = getQueueStats(state);

  console.log("\n" + "=".repeat(60));
  console.log("📊 RALPH LOCAL STATUS");
  console.log("=".repeat(60));

  console.log(`\nIteration: ${state.iteration}`);
  console.log(`Last Updated: ${state.lastUpdated}`);

  console.log("\n📋 Agent Pools:");
  console.log(
    `   Planning:  ${stats.runningPlanners} running / ${stats.idlePlanners} idle (${config.poolSizes.planning} total)`,
  );
  console.log(
    `   Developer: ${stats.runningDevelopers} running / ${stats.idleDevelopers} idle (${config.poolSizes.developer} total)`,
  );
  console.log(
    `   Tester:    ${stats.runningTesters} running / ${stats.idleTesters} idle (${config.poolSizes.tester} total)`,
  );

  console.log("\n📬 Queues:");
  console.log(`   Pending Plans: ${stats.pendingPlans}`);
  console.log(`   Pending Code:  ${stats.pendingCode}`);

  console.log("\n📈 Tickets:");
  console.log(`   Completed: ${state.completedTickets.length}`);
  console.log(`   Failed:    ${state.failedTickets.length}`);
  console.log(`   Blocked:   ${state.blockedTickets.length}`);

  if (state.blockedTickets.length > 0) {
    console.log("\n🚫 Blocked Tickets:");
    for (const blocked of state.blockedTickets) {
      console.log(`   ${blocked.ticketId}: ${blocked.reason} (retries: ${blocked.retries})`);
    }
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch");
  const dryRun = args.includes("--dry-run");
  const statusOnly = args.includes("--status");

  const config = loadConfig();

  if (!config.active) {
    console.log("❌ Ralph Local is not active (check config)");
    process.exit(0);
  }

  if (statusOnly) {
    showStatus(config);
    process.exit(0);
  }

  if (watchMode) {
    console.log("🔄 Starting Ralph Local in watch mode...");
    console.log(`   Sync interval: ${config.syncIntervalMs / 1000 / 60} minutes`);

    while (true) {
      try {
        await runOrchestrationLoop(config, dryRun);
      } catch (error) {
        console.error("Orchestration loop error:", error);
      }

      console.log(`\n⏳ Sleeping for ${config.syncIntervalMs / 1000 / 60} minutes...`);
      await sleep(config.syncIntervalMs);
    }
  } else {
    // Single iteration
    await runOrchestrationLoop(config, dryRun);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
