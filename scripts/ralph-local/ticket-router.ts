/**
 * Ralph Local Ticket Router
 * Routes work between agent pools: issues → planning, plans → dev, code → test
 *
 * Security Note: Uses gh CLI for GitHub operations with config.repo (validated).
 * This is an internal orchestration tool.
 */

import { execSync } from "child_process";
import {
  spawnDeveloperAgent,
  spawnFixerAgent,
  spawnPlanningAgent,
  spawnReviewerAgent,
  spawnTesterAgent,
} from "./agent-spawner";
import {
  addPendingCode,
  addPendingPlan,
  addPendingPRFix,
  addPendingReview,
  getIdleAgents,
  getPendingReview,
  isPRFixInProgress,
  isReviewInProgress,
  isTicketDone,
  isTicketInProgress,
  removePendingPRFix,
  removePendingReview,
  updateAgent,
} from "./state-manager";
import type {
  CodeWork,
  GitHubIssue,
  OrchestratorState,
  Plan,
  PRFixReason,
  PRFixWork,
  RalphLocalConfig,
  ReviewWork,
} from "./types";
import { createWorktree, getWorktreePath } from "./worktree-manager";

/**
 * Get available GitHub issues for processing
 */
export function getAvailableIssues(
  state: OrchestratorState,
  config: RalphLocalConfig,
  limit: number,
): GitHubIssue[] {
  try {
    // gh CLI with validated repo name from config
    const output = execSync(
      `gh issue list --state open --json number,title,body,labels,createdAt --limit 50 --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
      },
    );

    const allIssues: GitHubIssue[] = JSON.parse(output);

    // Filter out issues already in progress or completed
    const availableIssues = allIssues.filter((issue) => {
      const ticketId = `#${issue.number}`;

      // Skip if already done
      if (isTicketDone(state, ticketId)) {
        return false;
      }

      // Skip if already in progress
      if (isTicketInProgress(state, ticketId)) {
        return false;
      }

      // Skip bot-created issues or PRs
      if (
        issue.title.includes("[bot]") ||
        issue.labels.some((l: string | { name?: string; }) =>
          (typeof l === "string" ? l : l.name)?.includes("bot")
        )
      ) {
        return false;
      }

      return true;
    });

    // Prioritize issues
    const prioritized = prioritizeIssues(availableIssues);

    return prioritized.slice(0, limit);
  } catch (error) {
    console.error("Failed to get available issues:", error);
    return [];
  }
}

/**
 * Prioritize issues based on labels and age
 */
function prioritizeIssues(issues: GitHubIssue[]): GitHubIssue[] {
  return issues
    .map((issue) => {
      // Assign priority based on labels
      const labelNames = issue.labels.map((l: string | { name?: string; }) =>
        typeof l === "string" ? l : l.name || ""
      );

      let priority: GitHubIssue["priority"] = "NORMAL";

      if (labelNames.includes("p0") || labelNames.includes("critical")) {
        priority = "CRITICAL";
      } else if (labelNames.includes("bug") || labelNames.includes("p1")) {
        priority = "BUG";
      } else if (
        labelNames.includes("good-first-issue") ||
        labelNames.includes("quick-win") ||
        labelNames.includes("p2")
      ) {
        priority = "QUICK_WIN";
      }

      return { ...issue, priority };
    })
    .sort((a, b) => {
      // Sort by priority
      const priorityOrder = { CRITICAL: 0, BUG: 1, QUICK_WIN: 2, NORMAL: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by age (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Route new issues to idle planning agents
 */
export function routeIssuesToPlanners(
  state: OrchestratorState,
  config: RalphLocalConfig,
): number {
  const idlePlanners = getIdleAgents(state, "planning");
  if (idlePlanners.length === 0) {
    console.log("   No idle planning agents");
    return 0;
  }

  const availableIssues = getAvailableIssues(state, config, idlePlanners.length);
  if (availableIssues.length === 0) {
    console.log("   No available issues to process");
    return 0;
  }

  console.log(
    `   Routing ${Math.min(availableIssues.length, idlePlanners.length)} issues to planners`,
  );

  let routedCount = 0;

  for (let i = 0; i < Math.min(availableIssues.length, idlePlanners.length); i++) {
    const issue = availableIssues[i];
    const agent = idlePlanners[i];

    if (!issue || !agent) continue;

    const ticketId = `#${issue.number}`;
    console.log(`   📋 Assigning ${ticketId} to ${agent.id}`);

    // Spawn the planning agent
    const process = spawnPlanningAgent(
      agent,
      issue.number,
      issue.title,
      issue.body,
      config,
    );

    if (process) {
      // Update agent state
      updateAgent(state, agent.id, {
        status: "running",
        ticketId,
        pid: process.pid ?? null,
        startedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });
      routedCount++;
    }
  }

  return routedCount;
}

/**
 * Route completed plans to idle developer agents
 */
export function routePlansToDevelopers(
  state: OrchestratorState,
  config: RalphLocalConfig,
): number {
  const idleDevelopers = getIdleAgents(state, "developer");
  if (idleDevelopers.length === 0) {
    console.log("   No idle developer agents");
    return 0;
  }

  // Get pending plans sorted by creation time (oldest first)
  const pendingPlans = state.pendingPlans
    .filter((p) => p.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (pendingPlans.length === 0) {
    console.log("   No pending plans to implement");
    return 0;
  }

  console.log(
    `   Routing ${Math.min(pendingPlans.length, idleDevelopers.length)} plans to developers`,
  );

  let routedCount = 0;

  for (let i = 0; i < Math.min(pendingPlans.length, idleDevelopers.length); i++) {
    const plan = pendingPlans[i];
    const agent = idleDevelopers[i];

    if (!plan || !agent) continue;

    console.log(`   💻 Assigning ${plan.ticketId} to ${agent.id}`);

    try {
      // Create worktree for the ticket
      const worktreePath = createWorktree(plan.ticketId, config);

      // Spawn the developer agent
      const process = spawnDeveloperAgent(agent, plan, worktreePath, config);

      if (process) {
        // Update plan status
        plan.status = "assigned";
        plan.assignedTo = agent.id;

        // Update agent state
        updateAgent(state, agent.id, {
          status: "running",
          ticketId: plan.ticketId,
          worktree: worktreePath,
          pid: process.pid ?? null,
          startedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        });

        routedCount++;
      }
    } catch (error) {
      console.error(`   Failed to route plan ${plan.ticketId}:`, error);
    }
  }

  return routedCount;
}

/**
 * Route completed code to idle tester agents
 */
export function routeCodeToTesters(
  state: OrchestratorState,
  config: RalphLocalConfig,
): number {
  const idleTesters = getIdleAgents(state, "tester");
  if (idleTesters.length === 0) {
    console.log("   No idle tester agents");
    return 0;
  }

  // Get pending code sorted by creation time (oldest first)
  const pendingCode = state.pendingCode
    .filter((c) => c.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (pendingCode.length === 0) {
    console.log("   No pending code to review");
    return 0;
  }

  console.log(`   Routing ${Math.min(pendingCode.length, idleTesters.length)} code to testers`);

  let routedCount = 0;

  for (let i = 0; i < Math.min(pendingCode.length, idleTesters.length); i++) {
    const code = pendingCode[i];
    const agent = idleTesters[i];

    if (!code || !agent) continue;

    console.log(`   🧪 Assigning ${code.ticketId} to ${agent.id}`);

    // Spawn the tester agent
    const process = spawnTesterAgent(agent, code, config);

    if (process) {
      // Update code status
      code.status = "assigned";
      code.assignedTo = agent.id;

      // Update agent state
      updateAgent(state, agent.id, {
        status: "running",
        ticketId: code.ticketId,
        worktree: code.worktree,
        pid: process.pid ?? null,
        startedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });

      routedCount++;
    }
  }

  return routedCount;
}

// ============================================================================
// Review Routing (Local review step)
// ============================================================================

/**
 * Route completed code to idle reviewer agents (instead of directly to testers)
 */
export function routeCodeToReviewers(
  state: OrchestratorState,
  config: RalphLocalConfig,
): number {
  const idleReviewers = getIdleAgents(state, "reviewer");
  if (idleReviewers.length === 0) {
    console.log("   No idle reviewer agents");
    return 0;
  }

  // Ensure pendingReview exists
  if (!state.pendingReview) {
    state.pendingReview = [];
  }

  // Get pending reviews sorted by creation time (oldest first)
  const pendingReviews = state.pendingReview
    .filter((r) => r.status === "pending" || r.status === "changes_requested")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (pendingReviews.length === 0) {
    console.log("   No pending reviews");
    return 0;
  }

  console.log(
    `   Routing ${Math.min(pendingReviews.length, idleReviewers.length)} reviews to reviewers`,
  );

  let routedCount = 0;

  for (let i = 0; i < Math.min(pendingReviews.length, idleReviewers.length); i++) {
    const review = pendingReviews[i];
    const agent = idleReviewers[i];

    if (!review || !agent) continue;

    console.log(
      `   🔍 Assigning ${review.ticketId} to ${agent.id} (iteration ${review.iterations})`,
    );

    // Spawn the reviewer agent
    const process = spawnReviewerAgent(agent, review, config);

    if (process) {
      // Update review status
      review.status = "in_review";
      review.assignedTo = agent.id;

      // Update agent state
      updateAgent(state, agent.id, {
        status: "running",
        ticketId: review.ticketId,
        worktree: review.worktree,
        pid: process.pid ?? null,
        startedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });

      routedCount++;
    }
  }

  return routedCount;
}

/**
 * Add code to review queue (called when CODE_READY marker is detected)
 */
export function enqueueReview(
  state: OrchestratorState,
  ticketId: string,
  issueNumber: number,
  branch: string,
  worktree: string,
  planPath: string,
  codeCreatedBy: string,
  config: RalphLocalConfig,
): void {
  // Check if already in review
  if (isReviewInProgress(state, ticketId)) {
    console.log(`   📝 ${ticketId} already in review queue`);
    return;
  }

  const review: ReviewWork = {
    ticketId,
    issueNumber,
    branch,
    worktree,
    planPath,
    codeCreatedBy,
    status: "pending",
    assignedTo: null,
    iterations: 1,
    maxIterations: config.maxReviewIterations,
    lastReviewBy: null,
    feedback: null,
    createdAt: new Date().toISOString(),
  };

  addPendingReview(state, review);
  console.log(`   🔍 Review queued for ${ticketId}`);
}

/**
 * Move review back to pending with feedback (for changes requested)
 */
export function requeueReviewWithFeedback(
  state: OrchestratorState,
  ticketId: string,
  feedback: string,
  reviewedBy: string,
): void {
  const review = getPendingReview(state, ticketId);
  if (!review) {
    console.error(`   ❌ Review not found for ${ticketId}`);
    return;
  }

  review.status = "changes_requested";
  review.feedback = feedback;
  review.lastReviewBy = reviewedBy;
  review.assignedTo = null;
  review.iterations++;

  console.log(`   🔄 Review requeued for ${ticketId} (iteration ${review.iterations})`);
}

/**
 * Complete a review and move to code queue (for tester)
 */
export function completeReviewAndEnqueueCode(
  state: OrchestratorState,
  ticketId: string,
  reviewedBy: string,
): void {
  const review = removePendingReview(state, ticketId);
  if (!review) {
    console.error(`   ❌ Review not found for ${ticketId}`);
    return;
  }

  // Now enqueue for tester (the actual code queue)
  const code: CodeWork = {
    ticketId: review.ticketId,
    issueNumber: review.issueNumber,
    branch: review.branch,
    worktree: review.worktree,
    planPath: review.planPath,
    createdAt: new Date().toISOString(),
    createdBy: reviewedBy,
    status: "pending",
    assignedTo: null,
    prUrl: null,
    prNumber: null,
  };

  addPendingCode(state, code);
  console.log(`   ✅ Review passed for ${ticketId}, queued for tester`);
}

/**
 * Add a completed plan to the pending queue
 */
export function enqueuePlan(
  state: OrchestratorState,
  ticketId: string,
  issueNumber: number,
  title: string,
  planPath: string,
  createdBy: string,
): void {
  const plan: Plan = {
    ticketId,
    issueNumber,
    title,
    planPath,
    createdAt: new Date().toISOString(),
    createdBy,
    status: "pending",
    assignedTo: null,
  };

  addPendingPlan(state, plan);
  console.log(`   📄 Plan queued for ${ticketId}`);
}

/**
 * Get statistics about the routing queues
 */
export function getQueueStats(state: OrchestratorState): {
  pendingPlans: number;
  pendingReview: number;
  pendingCode: number;
  pendingPRFixes: number;
  idlePlanners: number;
  idleDevelopers: number;
  idleReviewers: number;
  idleTesters: number;
  idleFixers: number;
  runningPlanners: number;
  runningDevelopers: number;
  runningReviewers: number;
  runningTesters: number;
  runningFixers: number;
} {
  return {
    pendingPlans: state.pendingPlans.filter((p) => p.status === "pending").length,
    pendingReview:
      state.pendingReview?.filter((r) => r.status === "pending" || r.status === "changes_requested")
        .length || 0,
    pendingCode: state.pendingCode.filter((c) => c.status === "pending").length,
    pendingPRFixes: state.pendingPRFixes?.filter((f) => f.status === "pending").length || 0,
    idlePlanners: getIdleAgents(state, "planning").length,
    idleDevelopers: getIdleAgents(state, "developer").length,
    idleReviewers: getIdleAgents(state, "reviewer").length,
    idleTesters: getIdleAgents(state, "tester").length,
    idleFixers: getIdleAgents(state, "fixer").length,
    runningPlanners: state.pools.planning.filter((a) => a.status === "running").length,
    runningDevelopers: state.pools.developer.filter((a) => a.status === "running").length,
    runningReviewers: state.pools.reviewer?.filter((a) => a.status === "running").length || 0,
    runningTesters: state.pools.tester.filter((a) => a.status === "running").length,
    runningFixers: state.pools.fixer?.filter((a) => a.status === "running").length || 0,
  };
}

// ============================================================================
// PR Fix Routing
// ============================================================================

/**
 * Queue a PR for fixing
 */
export function enqueuePRFix(
  state: OrchestratorState,
  prNumber: number,
  ticketId: string,
  branch: string,
  worktree: string,
  reason: PRFixReason,
  reviewComments: string[],
  failureDetails: string | null,
): void {
  // Check if already in queue
  if (isPRFixInProgress(state, prNumber)) {
    console.log(`   📝 PR #${prNumber} already queued for fixes`);
    return;
  }

  const prFix: PRFixWork = {
    prNumber,
    ticketId,
    branch,
    worktree,
    status: "pending",
    assignedTo: null,
    reason,
    reviewComments,
    failureDetails,
    createdAt: new Date().toISOString(),
  };

  addPendingPRFix(state, prFix);
  console.log(`   📝 PR #${prNumber} queued for fixes (${reason})`);
}

/**
 * Route pending PR fixes to idle fixer agents
 */
export function routePRsToFixers(
  state: OrchestratorState,
  config: RalphLocalConfig,
): number {
  const idleFixers = getIdleAgents(state, "fixer");
  if (idleFixers.length === 0) {
    console.log("   No idle fixer agents");
    return 0;
  }

  // Ensure pendingPRFixes exists
  if (!state.pendingPRFixes) {
    state.pendingPRFixes = [];
    return 0;
  }

  // Get pending PR fixes sorted by creation time (oldest first)
  const pendingFixes = state.pendingPRFixes
    .filter((f) => f.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (pendingFixes.length === 0) {
    console.log("   No pending PR fixes");
    return 0;
  }

  console.log(
    `   Routing ${Math.min(pendingFixes.length, idleFixers.length)} PR fixes to fixers`,
  );

  let routedCount = 0;

  for (let i = 0; i < Math.min(pendingFixes.length, idleFixers.length); i++) {
    const prFix = pendingFixes[i];
    const agent = idleFixers[i];

    if (!prFix || !agent) continue;

    console.log(`   🔧 Assigning PR #${prFix.prNumber} fix to ${agent.id}`);

    try {
      // Get or create worktree for the ticket
      let worktreePath = prFix.worktree;
      if (!worktreePath) {
        worktreePath = getWorktreePath(prFix.ticketId, config);
        prFix.worktree = worktreePath;
      }

      // Spawn the fixer agent
      const process = spawnFixerAgent(agent, prFix, config);

      if (process) {
        // Update fix status
        prFix.status = "assigned";
        prFix.assignedTo = agent.id;

        // Update agent state
        updateAgent(state, agent.id, {
          status: "running",
          ticketId: `PR#${prFix.prNumber}:${prFix.ticketId}`,
          worktree: worktreePath,
          pid: process.pid ?? null,
          startedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
        });

        routedCount++;
      }
    } catch (error) {
      console.error(`   Failed to route PR fix #${prFix.prNumber}:`, error);
    }
  }

  return routedCount;
}

/**
 * Mark a PR fix as completed
 */
export function completePRFix(
  state: OrchestratorState,
  prNumber: number,
): void {
  const fix = removePendingPRFix(state, prNumber);
  if (fix) {
    console.log(`   ✅ PR #${prNumber} fix completed`);
  }
}
