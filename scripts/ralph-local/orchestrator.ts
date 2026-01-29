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
  spawnMainBuildFixerAgent,
  stopAgent,
} from "./agent-spawner";
import { removeIssueFile, syncIssuesToRepo } from "./issue-sync";
import {
  checkMainBranchCI,
  getCIFailureDetails,
  getPRBranch,
  getPRComments,
  getPRStatus,
  hasApprovalSignal,
  listRalphPRs,
  mergePR,
} from "./pr-manager";
import {
  addBlockedTicket,
  getIdleAgents,
  isMainBranchFailing,
  loadState,
  markTicketCompleted,
  markTicketFailed,
  removePendingPRFix,
  saveState,
  updateAgent,
  updateMainBranchStatus,
} from "./state-manager";
import {
  completePRFix,
  completeReviewAndEnqueueCode,
  enqueuePlan,
  enqueuePRFix,
  enqueueReview,
  getQueueStats,
  requeueReviewWithFeedback,
  routeCodeToReviewers,
  routeCodeToTesters,
  routeIssuesToPlanners,
  routePlansToDevelopers,
  routePRsToFixers,
} from "./ticket-router";
import type { LocalIterationResult, OrchestratorState, RalphLocalConfig } from "./types";
import {
  cleanupStaleWorktrees,
  cleanupWorktree,
  getWorktreePath,
  syncWorktreeWithMain,
} from "./worktree-manager";

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
const DEFAULT_APPROVAL_KEYWORDS = [
  "lgtm",
  "LGTM",
  "looks good",
  "Looks good",
  "ship it",
  "Ship it",
  "approved",
  "Approved",
  "ready to merge",
  "Ready to merge",
];

const DEFAULT_CONFIG: RalphLocalConfig = {
  active: true,
  poolSizes: {
    planning: 8,
    developer: 4,
    reviewer: 2,
    tester: 4,
    fixer: 1,
  },
  syncIntervalMs: 2 * 60 * 1000, // 2 minutes
  staleThresholdMs: 30 * 60 * 1000, // 30 minutes
  maxRetries: 2,
  maxReviewIterations: 3,
  autoMerge: true,
  mainBranchPriority: true,
  issueSyncEnabled: true,
  commitPlans: true,
  approvalKeywords: DEFAULT_APPROVAL_KEYWORDS,
  repo: "zerdos/spike-land-nextjs",
  workDir: process.cwd(),
  outputDir: "/tmp/ralph-output",
  pidDir: "/tmp/ralph-pids",
  planDir: join(process.cwd(), "docs/plans"),
  issuesDir: join(process.cwd(), ".github/issues"),
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
        reviewer: data.pool_reviewer ?? DEFAULT_CONFIG.poolSizes.reviewer,
        tester: data.pool_tester ?? DEFAULT_CONFIG.poolSizes.tester,
        fixer: data.pool_fixer ?? DEFAULT_CONFIG.poolSizes.fixer,
      },
      syncIntervalMs: (data.sync_interval_min ?? 2) * 60 * 1000,
      staleThresholdMs: (data.stale_threshold_min ?? 30) * 60 * 1000,
      maxRetries: data.max_retries ?? DEFAULT_CONFIG.maxRetries,
      maxReviewIterations: data.max_review_iterations ?? DEFAULT_CONFIG.maxReviewIterations,
      autoMerge: data.auto_merge ?? DEFAULT_CONFIG.autoMerge,
      mainBranchPriority: data.main_branch_priority ?? DEFAULT_CONFIG.mainBranchPriority,
      issueSyncEnabled: data.issue_sync_enabled ?? DEFAULT_CONFIG.issueSyncEnabled,
      commitPlans: data.commit_plans ?? DEFAULT_CONFIG.commitPlans,
      approvalKeywords: data.approval_keywords ?? DEFAULT_CONFIG.approvalKeywords,
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
    `   Pools: ${config.poolSizes.planning}P / ${config.poolSizes.developer}D / ${config.poolSizes.reviewer}R / ${config.poolSizes.tester}T / ${config.poolSizes.fixer}F`,
  );

  if (dryRun) {
    console.log("   🔒 DRY RUN MODE - no changes will be made");
  }

  // Step -1: Sync GitHub issues to local files
  console.log("\n📋 STEP -1: Sync GitHub issues");
  if (!dryRun && config.issueSyncEnabled) {
    const syncResult = syncIssuesToRepo(config);
    if (syncResult.synced > 0 || syncResult.removed > 0) {
      console.log(`   Synced ${syncResult.synced} issues, removed ${syncResult.removed}`);
    } else {
      console.log("   No changes to issues");
    }
  } else if (!config.issueSyncEnabled) {
    console.log("   Issue sync disabled");
  }

  // Step 0: Clean up stale agents
  console.log("\n📋 STEP 0: Clean up stale agents");
  result.staleAgentsCleaned = await step0_cleanupStaleAgents(state, config, dryRun);

  // Step 0.5: Check main branch CI (PRIORITY)
  console.log("\n📋 STEP 0.5: Check main branch CI");
  const mainBranchFixerSpawned = await step0_5_checkMainBranchCI(state, config, dryRun);
  if (mainBranchFixerSpawned) {
    result.agentsSpawned += 1;
  }

  // Step 0.75: Detect PRs needing fixes
  console.log("\n📋 STEP 0.75: Detect PRs needing fixes");
  await step0_75_detectPRsNeedingFixes(state, config);

  // Step 1: Check PR status (with approval signal detection)
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

  // Step 3.5: Route PR fixes to fixer agents
  console.log("\n📋 STEP 3.5: Route PR fixes to fixers");
  if (!dryRun) {
    result.agentsSpawned += routePRsToFixers(state, config);
  }

  // Step 3.75: Route completed code to reviewers (local review)
  console.log("\n📋 STEP 3.75: Route code to reviewers");
  if (!dryRun) {
    result.agentsSpawned += routeCodeToReviewers(state, config);
  }

  // Step 3.8: Process review results
  console.log("\n📋 STEP 3.8: Process review results");
  await step3_8_processReviewResults(state, config);

  // Step 4: Route reviewed code to testers
  console.log("\n📋 STEP 4: Route reviewed code to testers");
  if (!dryRun) {
    result.agentsSpawned += routeCodeToTesters(state, config);
  }

  // Step 5: Fill planning pool with new issues
  console.log("\n📋 STEP 5: Fill planning pool");
  if (!dryRun) {
    // If main branch is failing and mainBranchPriority is enabled, don't spawn new work
    if (config.mainBranchPriority && isMainBranchFailing(state)) {
      console.log("   ⚠️ Main branch CI failing - pausing new work");
    } else {
      result.agentsSpawned += routeIssuesToPlanners(state, config);
    }
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
  const allPools = [
    state.pools.planning,
    state.pools.developer,
    state.pools.tester,
    state.pools.fixer,
  ];
  for (const pool of allPools) {
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

  // Reset any "stale" agents back to "idle" so they can be reused
  for (const pool of allPools) {
    for (const agent of pool) {
      if (agent.status === "stale" && !dryRun) {
        console.log(`   🔄 Resetting stale agent ${agent.id} to idle`);
        updateAgent(state, agent.id, {
          status: "idle",
          ticketId: null,
          worktree: null,
          pid: null,
          startedAt: null,
          lastHeartbeat: null,
        });
        cleanedCount++;
      }
    }
  }

  if (cleanedCount === 0) {
    console.log("   No stale agents found");
  }

  return cleanedCount;
}

/**
 * Step 0.5: Check main branch CI status
 * If main branch is failing, spawn a fixer agent immediately (highest priority)
 */
async function step0_5_checkMainBranchCI(
  state: OrchestratorState,
  config: RalphLocalConfig,
  dryRun: boolean,
): Promise<boolean> {
  // Check main branch CI status
  const mainStatus = checkMainBranchCI(config);
  updateMainBranchStatus(state, mainStatus);

  if (mainStatus.status !== "failing") {
    console.log(`   Main branch CI: ${mainStatus.status}`);
    return false;
  }

  console.log(
    `   🚨 MAIN BRANCH CI FAILING - ${mainStatus.failedWorkflows.length} failed workflows`,
  );
  for (const workflow of mainStatus.failedWorkflows) {
    console.log(`      - ${workflow.name} (Run #${workflow.id})`);
  }

  // If mainBranchPriority is enabled, spawn a fixer agent immediately
  if (!config.mainBranchPriority) {
    console.log("   ⚠️ Main branch priority disabled, skipping auto-fix");
    return false;
  }

  // Check if we have an idle fixer agent
  const idleFixers = getIdleAgents(state, "fixer");
  if (idleFixers.length === 0) {
    console.log("   ⚠️ No idle fixer agents available for main branch fix");
    return false;
  }

  if (dryRun) {
    console.log("   [DRY RUN] Would spawn main branch fixer agent");
    return false;
  }

  // Spawn a fixer agent for the main branch
  const fixerAgent = idleFixers[0];
  console.log(`   🔧 Spawning main branch fixer: ${fixerAgent.id}`);

  const process = spawnMainBuildFixerAgent(fixerAgent, mainStatus, config);

  if (process) {
    updateAgent(state, fixerAgent.id, {
      status: "running",
      ticketId: `#main-${mainStatus.failedWorkflows[0]?.id || "unknown"}`,
      worktree: config.workDir,
      pid: process.pid ?? null,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    });

    return true;
  }

  return false;
}

/**
 * Step 0.75: Detect PRs that need fixes (CI failing or changes requested)
 * Queue them for fixer agents
 */
async function step0_75_detectPRsNeedingFixes(
  state: OrchestratorState,
  config: RalphLocalConfig,
): Promise<void> {
  const ralphPRs = listRalphPRs(config);
  if (ralphPRs.length === 0) {
    console.log("   No open Ralph PRs to check");
    return;
  }

  let queuedCount = 0;

  for (const prNumber of ralphPRs) {
    const status = getPRStatus(prNumber, config);
    if (!status) continue;

    // Check if PR needs fixes
    if (status.status === "CI_FAILING" || status.status === "CHANGES_REQUESTED") {
      // Find the corresponding code work to get ticket info
      const codeWork = state.pendingCode.find((c) => c.prNumber === prNumber);

      // We can only queue fixes for PRs we have proper tracking for
      // Skip unknown PRs - they may be from a previous run or manual creation
      if (!codeWork) {
        console.log(`   ⚠️ PR #${prNumber} needs fixes but has no tracking info, skipping`);
        continue;
      }

      const ticketId = codeWork.ticketId;
      const branch = getPRBranch(prNumber, config) || codeWork.branch;
      const worktreePath = codeWork.worktree || getWorktreePath(ticketId, config);

      // Get failure details or review comments
      const failureDetails = status.status === "CI_FAILING"
        ? getCIFailureDetails(prNumber, config)
        : null;
      const reviewComments = status.status === "CHANGES_REQUESTED"
        ? [...status.reviewComments, ...getPRComments(prNumber, config)]
        : [];

      // Queue for fixing
      enqueuePRFix(
        state,
        prNumber,
        ticketId,
        branch,
        worktreePath,
        status.status === "CI_FAILING" ? "CI_FAILING" : "CHANGES_REQUESTED",
        reviewComments,
        failureDetails,
      );

      queuedCount++;
    }
  }

  if (queuedCount === 0) {
    console.log("   No PRs need fixes");
  } else {
    console.log(`   Queued ${queuedCount} PRs for fixes`);
  }
}

/**
 * Step 1: Check PR status and merge/fix as needed
 * Enhanced with approval signal detection
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

    // Check for approval signals in comments (e.g., "LGTM", "ship it")
    const approvalCheck = hasApprovalSignal(prNumber, config);
    if (approvalCheck.hasSignal) {
      console.log(`   ✨ Approval signal detected: "${approvalCheck.signalFound}"`);
    }

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

                // Remove issue file after merge (cleanup)
                if (config.issueSyncEnabled) {
                  removeIssueFile(codeWork.issueNumber, config);
                }
              }

              // Also clean up any pending PR fix for this PR
              removePendingPRFix(state, prNumber);
            }
          }
        }
        break;

      case "PENDING":
        // Check if there's an approval signal - treat as approved if CI passes
        if (approvalCheck.hasSignal && config.autoMerge && status.ciStatus === "passing") {
          console.log(`   🔀 Merging PR #${prNumber} (approval signal detected)...`);
          if (!dryRun) {
            if (mergePR(prNumber, config)) {
              mergedCount++;

              // Find and complete the ticket
              const codeWork = state.pendingCode.find((c) => c.prNumber === prNumber);
              if (codeWork) {
                markTicketCompleted(state, codeWork.ticketId);
                cleanupWorktree(codeWork.ticketId, config);

                // Remove issue file after merge (cleanup)
                if (config.issueSyncEnabled) {
                  removeIssueFile(codeWork.issueNumber, config);
                }
              }

              // Also clean up any pending PR fix
              removePendingPRFix(state, prNumber);
            }
          }
        } else {
          console.log(`   ⏳ PR #${prNumber} awaiting review`);
        }
        break;

      case "CHANGES_REQUESTED":
        console.log(`   📝 PR #${prNumber} needs fixes (${status.reviewComments.length} comments)`);
        // Fixer agents will pick this up (queued in step 0.75)
        break;

      case "CI_FAILING":
        console.log(`   ❌ PR #${prNumber} has failing CI`);
        // Fixer agents will pick this up (queued in step 0.75)
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
  config: RalphLocalConfig,
): Promise<{ plans: number; code: number; prs: number; }> {
  let plans = 0;
  let code = 0;
  let prs = 0;

  const allPools = [
    state.pools.planning,
    state.pools.developer,
    state.pools.reviewer,
    state.pools.tester,
    state.pools.fixer,
  ];
  for (const pool of allPools) {
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
            console.log(`   💻 Code ready: ${normalizedCodeTicketId} -> queuing for review`);
            const codeIssueNum = parseInt(normalizedCodeTicketId.replace("#", ""), 10);
            if (agent.worktree) {
              // Route to review queue instead of directly to code queue
              enqueueReview(
                state,
                normalizedCodeTicketId,
                codeIssueNum,
                marker.branch,
                agent.worktree,
                join(config.planDir, `${codeIssueNum}.md`),
                agent.id,
                config,
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

          case "PR_FIXED":
            console.log(`   ✅ PR #${marker.prNumber} fixed (${marker.ticketId})`);
            completePRFix(state, marker.prNumber);
            break;

          case "MAIN_BUILD_FIX":
            if (marker.fixed) {
              console.log(`   ✅ Main build fix attempted for run #${marker.runId}`);
            } else {
              console.log(`   ⚠️ Main build fix failed for run #${marker.runId}`);
            }
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

  // Check for dead agents (process not running but still marked as running)
  for (const pool of allPools) {
    for (const agent of pool) {
      if (agent.status !== "running") continue;

      const stillRunning = isAgentRunning(agent);
      if (!stillRunning) {
        console.log(`   💀 Dead agent detected: ${agent.id} (ticket: ${agent.ticketId})`);
        // Mark as idle so it can pick up new work
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
 * Step 3.8: Process review results from reviewer agents
 */
async function step3_8_processReviewResults(
  state: OrchestratorState,
  _config: RalphLocalConfig,
): Promise<void> {
  // Check reviewer agent outputs for markers
  for (const agent of state.pools.reviewer || []) {
    if (agent.status !== "running") continue;

    const output = getAgentOutput(agent);
    if (!output) continue;

    const markers = parseAgentMarkers(output);
    for (const marker of markers) {
      if (marker.type === "REVIEW_PASSED") {
        const normalizedTicketId = normalizeTicketId(marker.ticketId);
        console.log(
          `   ✅ Review passed: ${normalizedTicketId} (${marker.iterations} iterations, force=${marker.force})`,
        );
        // Move from pendingReview to pendingCode (for tester)
        completeReviewAndEnqueueCode(state, normalizedTicketId, agent.id);
      }

      if (marker.type === "REVIEW_CHANGES_REQUESTED") {
        const normalizedTicketId = normalizeTicketId(marker.ticketId);
        console.log(
          `   🔄 Changes requested: ${normalizedTicketId} (iteration ${marker.iteration})`,
        );
        // Loop back - update review with feedback for developer to fix
        requeueReviewWithFeedback(state, normalizedTicketId, marker.feedback, agent.id);
      }
    }
  }
}

/**
 * Step 7: Sync active branches with main (enhanced to include all worktrees)
 */
async function step7_syncBranches(
  state: OrchestratorState,
  _config: RalphLocalConfig,
): Promise<void> {
  // Collect ALL worktrees (not just from running agents)
  const allWorktrees = new Set<string>();

  // From pending review
  for (const review of state.pendingReview || []) {
    if (review.worktree) allWorktrees.add(review.worktree);
  }

  // From pending code
  for (const code of state.pendingCode) {
    if (code.worktree) allWorktrees.add(code.worktree);
  }

  // From pending PR fixes
  for (const fix of state.pendingPRFixes || []) {
    if (fix.worktree) allWorktrees.add(fix.worktree);
  }

  // From running agents
  const poolsWithWorktrees = [
    state.pools.developer,
    state.pools.reviewer,
    state.pools.tester,
    state.pools.fixer,
  ];
  for (const pool of poolsWithWorktrees) {
    for (const agent of pool || []) {
      if (agent.worktree) allWorktrees.add(agent.worktree);
    }
  }

  if (allWorktrees.size === 0) {
    console.log("   No worktrees to sync");
    return;
  }

  console.log(`   Syncing ${allWorktrees.size} worktrees with main`);

  for (const worktree of Array.from(allWorktrees)) {
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

  // Main branch status indicator
  const mainStatus = state.mainBranchStatus?.status || "unknown";
  const mainStatusIcon = mainStatus === "failing" ? "🚨" : mainStatus === "passing" ? "✅" : "⏳";

  return `
📊 Iteration ${result.iteration} Summary (${duration.toFixed(1)}s)
   ${summary}

   Main Branch CI: ${mainStatusIcon} ${mainStatus}
   Queues: ${stats.pendingPlans} plans | ${stats.pendingReview} reviews | ${stats.pendingCode} code | ${stats.pendingPRFixes} PR fixes
   Agents: ${stats.runningPlanners}/${
    stats.idlePlanners + stats.runningPlanners
  }P | ${stats.runningDevelopers}/${
    stats.idleDevelopers + stats.runningDevelopers
  }D | ${stats.runningReviewers}/${
    stats.idleReviewers + stats.runningReviewers
  }R | ${stats.runningTesters}/${
    stats.idleTesters + stats.runningTesters
  }T | ${stats.runningFixers}/${stats.idleFixers + stats.runningFixers}F
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

  // Main branch CI status
  const mainStatus = state.mainBranchStatus;
  if (mainStatus) {
    const statusIcon = mainStatus.status === "failing"
      ? "🚨"
      : mainStatus.status === "passing"
      ? "✅"
      : "⏳";
    console.log(`\n🔧 Main Branch CI: ${statusIcon} ${mainStatus.status}`);
    if (mainStatus.status === "failing" && mainStatus.failedWorkflows.length > 0) {
      for (const workflow of mainStatus.failedWorkflows) {
        console.log(`   - ${workflow.name} (Run #${workflow.id})`);
      }
    }
  }

  console.log("\n📋 Agent Pools:");
  console.log(
    `   Planning:  ${stats.runningPlanners} running / ${stats.idlePlanners} idle (${config.poolSizes.planning} total)`,
  );
  console.log(
    `   Developer: ${stats.runningDevelopers} running / ${stats.idleDevelopers} idle (${config.poolSizes.developer} total)`,
  );
  console.log(
    `   Reviewer:  ${stats.runningReviewers} running / ${stats.idleReviewers} idle (${config.poolSizes.reviewer} total)`,
  );
  console.log(
    `   Tester:    ${stats.runningTesters} running / ${stats.idleTesters} idle (${config.poolSizes.tester} total)`,
  );
  console.log(
    `   Fixer:     ${stats.runningFixers} running / ${stats.idleFixers} idle (${config.poolSizes.fixer} total)`,
  );

  console.log("\n📬 Queues:");
  console.log(`   Pending Plans:    ${stats.pendingPlans}`);
  console.log(`   Pending Reviews:  ${stats.pendingReview}`);
  console.log(`   Pending Code:     ${stats.pendingCode}`);
  console.log(`   Pending PR Fixes: ${stats.pendingPRFixes}`);

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
