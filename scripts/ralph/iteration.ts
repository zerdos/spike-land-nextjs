/**
 * Ralph Iteration Runner
 * Executes the 8-step iteration workflow
 */

import { execSync } from "child_process";
import { getRuntimeConfig } from "./improver";
import {
  approvePlan,
  createJulesSession,
  createPR,
  getAvailableIssues,
  getBatchPRStatus,
  getCIStatus,
  getSessionDetails,
  listSessions,
  mergePR,
  publishPR,
  sendMessage,
  teleportAndMerge,
  teleportSession,
} from "./mcp-client";
import { countActiveSlots, sortTasksByAge } from "./registry";
import type {
  CIStatus,
  GitHubIssue,
  IterationResult,
  JulesSession,
  PRBatchStatus,
  RalphRegistry,
  TaskStatus,
} from "./types";

// Thresholds for stuck session detection
const STUCK_WARNING_HOURS = 1; // Exclude from capacity after 1 hour
const STUCK_DEAD_HOURS = 2; // Mark as DEAD after 2 hours

// Default fallback values (used only if config is missing)
const DEFAULT_WIP_LIMIT = 15;
const DEFAULT_BACKLOG_CLEAR_RATE = 5;

// ============================================================================
// Main Iteration Runner
// ============================================================================

export async function runIteration(
  registry: RalphRegistry,
): Promise<IterationResult> {
  const startTime = new Date();
  const result: IterationResult = {
    sessionsCreated: 0,
    plansApproved: [],
    prsCreated: [],
    prsMerged: [],
    messagesSent: [],
    errors: [],
    updatedTasks: [...registry.activeTasks],
    meaningfulWork: false,
    summary: "",
    startTime,
    endTime: startTime,
  };

  console.log("\n📊 STEP 0: Build Priority Check");
  await step0_buildCheck(result);

  console.log("\n🧹 STEP 0.5: Dead Session Cleanup");
  await step05_deadSessionCleanup(result, registry);

  console.log("\n📋 STEP 1: Batch Status Check");
  const sessions = await step1_statusCheck(result);

  console.log("\n⏱️ STEP 1.5: Handle Stuck Sessions");
  const deadSessionIds = await step15_handleStuckSessions(result, sessions);

  console.log("\n✅ STEP 2: Auto-Approve Pending Plans");
  await step2_autoApprove(result, sessions);

  console.log("\n🔄 STEP 3: Handle PR Lifecycle");
  await step3_prLifecycle(result);

  console.log("\n📦 STEP 3.0a: Clear AWAIT_PR Backlog");
  await step3a_clearBacklog(result, registry);

  console.log("\n🚀 STEP 4: Fill Pipeline Queue");
  await step4_fillQueue(result, registry, sessions, deadSessionIds);

  console.log("\n🔧 STEP 5: Handle Build Failures");
  await step5_buildFailures(result);

  console.log("\n💬 STEP 6: Respond to Feedback Requests");
  await step6_respondFeedback(result, sessions);

  console.log("\n❌ STEP 7: Handle Failed Sessions");
  await step7_failedSessions(result, registry);

  // Determine if meaningful work was done
  result.meaningfulWork = result.plansApproved.length > 0 ||
    result.prsCreated.length > 0 ||
    result.prsMerged.length > 0 ||
    result.sessionsCreated > 0 ||
    result.messagesSent.length > 0;

  result.summary = generateSummary(result);
  result.endTime = new Date();

  return result;
}

// ============================================================================
// Step 0: Build Priority Check
// ============================================================================

async function step0_buildCheck(result: IterationResult): Promise<void> {
  try {
    const ciStatusJson = getCIStatus();
    const ciStatus: CIStatus = JSON.parse(ciStatusJson);

    if (ciStatus.status === "passing") {
      console.log("   ✅ CI passing on main branch");
    } else if (ciStatus.status === "failing") {
      console.log(`   ❌ CI FAILING: ${ciStatus.error_excerpt?.slice(0, 100)}...`);
      // CI failures are handled in Step 5
    } else {
      console.log("   🔄 CI in progress...");
    }
  } catch (error) {
    result.errors.push(`Build check failed: ${error}`);
    console.log("   ⚠️ Could not check CI status");
  }
}

// ============================================================================
// Step 0.5: Dead Session Cleanup
// ============================================================================

async function step05_deadSessionCleanup(
  result: IterationResult,
  _registry: RalphRegistry,
): Promise<void> {
  const activeSessions = await listSessions();
  const activeSessionIds = new Set(activeSessions.map((s) => s.id));

  let removedCount = 0;
  result.updatedTasks = result.updatedTasks.filter((task) => {
    // If session is in registry but not in Jules, check if we should keep it
    if (task.sessionId && !activeSessionIds.has(task.sessionId)) {
      // PRESERVE sessions that still need PR creation or are awaiting PR merge
      // These might be gone from Jules but we still need to process them
      if (task.status === "COMPLETED→AWAIT_PR" || task.status === "PR_CREATED") {
        console.log(`   ⏳ Preserving ${task.sessionId} (${task.issue}) - status: ${task.status}`);
        return true; // Keep it
      }

      // Only remove if it's in a terminal state or truly dead
      if (!["FAILED", "DEAD"].includes(task.status)) {
        console.log(`   🗑️ Removing dead session: ${task.sessionId} (${task.issue})`);
        removedCount++;
        return false;
      }
    }
    return true;
  });

  if (removedCount > 0) {
    console.log(`   Removed ${removedCount} dead sessions`);
  } else {
    console.log("   No dead sessions found");
  }
}

// ============================================================================
// Step 1: Batch Status Check
// ============================================================================

async function step1_statusCheck(
  result: IterationResult,
): Promise<JulesSession[]> {
  try {
    const sessions = await listSessions();
    console.log(`   Found ${sessions.length} active Jules sessions`);

    // Categorize sessions
    const categories = {
      awaitingApproval: sessions.filter(
        (s) => s.status === "AWAITING_PLAN_APPROVAL",
      ).length,
      awaitingFeedback: sessions.filter(
        (s) => s.status === "AWAITING_USER_FEEDBACK",
      ).length,
      inProgress: sessions.filter((s) => s.status === "IN_PROGRESS").length,
      planning: sessions.filter((s) => s.status === "PLANNING").length,
      completed: sessions.filter((s) => s.status === "COMPLETED").length,
      failed: sessions.filter((s) => s.status === "FAILED").length,
    };

    console.log(`   ├─ AWAITING_PLAN_APPROVAL: ${categories.awaitingApproval}`);
    console.log(`   ├─ AWAITING_USER_FEEDBACK: ${categories.awaitingFeedback}`);
    console.log(`   ├─ IN_PROGRESS: ${categories.inProgress}`);
    console.log(`   ├─ PLANNING: ${categories.planning}`);
    console.log(`   ├─ COMPLETED: ${categories.completed}`);
    console.log(`   └─ FAILED: ${categories.failed}`);

    // Build task entries from ALL sessions (not just update existing)
    // This ensures COMPLETED sessions are tracked for PR creation
    let newTasksCreated = 0;
    for (const session of sessions) {
      const existingTaskIndex = result.updatedTasks.findIndex(
        (t) => t.sessionId === session.id,
      );

      if (existingTaskIndex !== -1) {
        // Update existing task
        const task = result.updatedTasks[existingTaskIndex];
        if (task) {
          task.status = mapJulesStatusToTaskStatus(session.status);
          task.lastUpdated = new Date().toISOString();
        }
      } else {
        // CREATE NEW task entry for sessions not in registry
        const issue = extractIssueFromTitle(session.title);
        result.updatedTasks.push({
          issue: issue || `session:${session.id.slice(-8)}`,
          sessionId: session.id,
          status: mapJulesStatusToTaskStatus(session.status),
          prNumber: session.prUrl ? extractPRNumber(session.prUrl) : null,
          retries: 0,
          lastUpdated: session.createdAt || new Date().toISOString(),
        });
        newTasksCreated++;
      }
    }

    if (newTasksCreated > 0) {
      console.log(`   📝 Created ${newTasksCreated} task entries from existing sessions`);
    }

    return sessions;
  } catch (error) {
    result.errors.push(`Status check failed: ${error}`);
    console.log("   ⚠️ Status check failed");
    return [];
  }
}

function mapJulesStatusToTaskStatus(status: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    QUEUED: "QUEUED",
    PLANNING: "PLANNING",
    AWAITING_PLAN_APPROVAL: "AWAITING_PLAN_APPROVAL",
    AWAITING_USER_FEEDBACK: "AWAITING_USER_FEEDBACK",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED→AWAIT_PR",
    FAILED: "FAILED",
  };
  return map[status] || "PLANNING";
}

/**
 * Extract issue number from session title (e.g., "#701" from "Fix bug #701")
 */
function extractIssueFromTitle(title: string): string | null {
  const match = title.match(/#(\d+)/);
  return match?.[1] ? `#${match[1]}` : null;
}

/**
 * Extract PR number from PR URL
 */
function extractPRNumber(prUrl: string): string | null {
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match?.[1] ?? null;
}

// ============================================================================
// Step 1.5: Handle Stuck Sessions
// ============================================================================

async function step15_handleStuckSessions(
  result: IterationResult,
  sessions: JulesSession[],
): Promise<Set<string>> {
  const JULES_SESSION_LIMIT = 15;
  const now = Date.now();
  const warningThresholdMs = STUCK_WARNING_HOURS * 60 * 60 * 1000;
  const deadThresholdMs = STUCK_DEAD_HOURS * 60 * 60 * 1000;

  // Track dead session IDs to exclude from capacity calculation
  const deadSessionIds = new Set<string>();

  // Find sessions by status
  const planningSessions = sessions.filter((s) => s.status === "PLANNING");
  const inProgressSessions = sessions.filter((s) => s.status === "IN_PROGRESS");
  const awaitingApprovalSessions = sessions.filter((s) => s.status === "AWAITING_PLAN_APPROVAL");

  let stuckCount = 0;
  let markedDeadCount = 0;

  // Heuristic 1: Check for stuck state pattern
  // If we have many PLANNING sessions but nothing is progressing, something is stuck
  const activeProgressingSessions = inProgressSessions.length + awaitingApprovalSessions.length;

  if (
    planningSessions.length >= JULES_SESSION_LIMIT &&
    activeProgressingSessions === 0
  ) {
    console.log(
      `   🚨 Stuck state detected: ${planningSessions.length} PLANNING, 0 progressing`,
    );

    // Mark excess PLANNING sessions as DEAD to unblock the pipeline
    // Keep up to (JULES_SESSION_LIMIT - 1) sessions as a buffer
    const excessCount = planningSessions.length - (JULES_SESSION_LIMIT - 1);

    if (excessCount > 0) {
      console.log(`   📌 Marking ${excessCount} excess sessions as DEAD to unblock`);

      // Mark the sessions without a task entry as DEAD first (orphaned sessions)
      // Then mark oldest by session ID (higher IDs are newer)
      const sortedByIdDesc = [...planningSessions].sort((a, b) => b.id.localeCompare(a.id));
      const toMarkDead = sortedByIdDesc.slice(-excessCount);

      for (const session of toMarkDead) {
        // Add to dead session IDs for capacity exclusion
        deadSessionIds.add(session.id);

        // Try to find and update task entry (if exists)
        const taskIndex = result.updatedTasks.findIndex(
          (t) => t.sessionId === session.id,
        );
        if (taskIndex !== -1 && result.updatedTasks[taskIndex]) {
          result.updatedTasks[taskIndex].status = "DEAD";
          result.updatedTasks[taskIndex].lastUpdated = new Date().toISOString();
        }
        markedDeadCount++;
        console.log(`   💀 Marked DEAD: ${session.id} (stuck in PLANNING, no progress)`);
      }
    }
  }

  // Heuristic 2: Check individual session timestamps (if available from MCP)
  for (const session of planningSessions) {
    const createdAt = new Date(session.createdAt).getTime();
    const ageMs = now - createdAt;

    // Skip if createdAt is recent (likely from CLI fallback which sets it to "now")
    if (ageMs < warningThresholdMs) {
      continue;
    }

    const ageHours = ageMs / (60 * 60 * 1000);

    if (ageMs > deadThresholdMs) {
      // Skip if already marked dead
      if (deadSessionIds.has(session.id)) {
        continue;
      }

      // Add to dead session IDs for capacity exclusion
      deadSessionIds.add(session.id);

      // Try to find and update task entry (if exists)
      const taskIndex = result.updatedTasks.findIndex(
        (t) => t.sessionId === session.id,
      );
      if (taskIndex !== -1 && result.updatedTasks[taskIndex]) {
        result.updatedTasks[taskIndex].status = "DEAD";
        result.updatedTasks[taskIndex].lastUpdated = new Date().toISOString();
      }
      markedDeadCount++;
      console.log(
        `   💀 Marked DEAD: ${session.id} (stuck ${ageHours.toFixed(1)}h in PLANNING)`,
      );
    } else if (ageMs > warningThresholdMs) {
      stuckCount++;
      console.log(
        `   ⚠️ Stuck: ${session.id} (${ageHours.toFixed(1)}h in PLANNING)`,
      );
    }
  }

  if (markedDeadCount > 0) {
    console.log(`   Marked ${markedDeadCount} sessions as DEAD`);
    result.meaningfulWork = true;
  }

  if (stuckCount > 0) {
    console.log(
      `   ${stuckCount} sessions stuck but not yet DEAD (warning threshold: ${STUCK_WARNING_HOURS}h)`,
    );
  }

  if (stuckCount === 0 && markedDeadCount === 0 && planningSessions.length < JULES_SESSION_LIMIT) {
    console.log("   No stuck sessions found");
  }

  return deadSessionIds;
}

// ============================================================================
// Step 2: Auto-Approve Pending Plans
// ============================================================================

async function step2_autoApprove(
  result: IterationResult,
  sessions: JulesSession[],
): Promise<void> {
  const pendingApproval = sessions.filter(
    (s) => s.status === "AWAITING_PLAN_APPROVAL",
  );

  if (pendingApproval.length === 0) {
    console.log("   No plans awaiting approval");
    return;
  }

  console.log(`   Found ${pendingApproval.length} plans to approve`);

  for (const session of pendingApproval) {
    const success = await approvePlan(session.id);
    if (success) {
      result.plansApproved.push(session.id);
      console.log(`   ✅ Approved: ${session.id} (${session.title})`);

      // Update task status
      const taskIndex = result.updatedTasks.findIndex(
        (t) => t.sessionId === session.id,
      );
      const task = result.updatedTasks[taskIndex];
      if (taskIndex !== -1 && task) {
        task.status = "IN_PROGRESS";
        task.lastUpdated = new Date().toISOString();
      }
    } else {
      result.errors.push(`Failed to approve: ${session.id}`);
      console.log(`   ❌ Failed to approve: ${session.id}`);
    }
  }
}

// ============================================================================
// Step 3: Handle PR Lifecycle
// ============================================================================

async function step3_prLifecycle(result: IterationResult): Promise<void> {
  try {
    const prStatusJson = getBatchPRStatus();
    const prStatuses: PRBatchStatus[] = JSON.parse(prStatusJson);

    if (prStatuses.length === 0) {
      console.log("   No open PRs to manage");
      return;
    }

    console.log(`   Managing ${prStatuses.length} open PRs`);

    for (const pr of prStatuses) {
      switch (pr.action) {
        case "READY_TO_MERGE":
          console.log(`   🔀 Merging PR #${pr.pr}...`);
          if (mergePR(pr.pr)) {
            result.prsMerged.push(pr.pr.toString());
            console.log(`   ✅ Merged PR #${pr.pr}`);
          }
          break;

        case "READY_TO_PUBLISH":
          console.log(`   📢 Publishing PR #${pr.pr}...`);
          if (publishPR(pr.pr)) {
            console.log(`   ✅ Published PR #${pr.pr}`);
          }
          break;

        case "CI_FAILING":
          console.log(`   ❌ PR #${pr.pr} has failing CI`);
          // Will be handled by notifying Jules
          break;

        case "NEEDS_REBASE":
          console.log(`   🔄 PR #${pr.pr} needs rebase`);
          break;

        case "AWAITING_REVIEW":
          console.log(`   👀 PR #${pr.pr} awaiting review`);
          break;

        default:
          console.log(`   ℹ️ PR #${pr.pr}: ${pr.action}`);
      }
    }
  } catch (error) {
    result.errors.push(`PR lifecycle check failed: ${error}`);
    console.log("   ⚠️ PR lifecycle check failed");
  }
}

// ============================================================================
// Step 3.0a: Clear AWAIT_PR Backlog
// ============================================================================

async function step3a_clearBacklog(
  result: IterationResult,
  _registry: RalphRegistry,
): Promise<void> {
  // Find tasks in COMPLETED→AWAIT_PR status
  const backlogTasks = result.updatedTasks.filter(
    (t) => t.status === "COMPLETED→AWAIT_PR",
  );

  if (backlogTasks.length === 0) {
    console.log("   No backlog to clear");
    return;
  }

  // Get backlog clear rate from runtime config, with fallback to default
  const runtimeConfig = getRuntimeConfig();
  const backlogClearRate = runtimeConfig.backlog_clear_rate ?? DEFAULT_BACKLOG_CLEAR_RATE;

  // Sort by age (oldest first)
  const sortedBacklog = sortTasksByAge(backlogTasks);
  const toProcess = sortedBacklog.slice(0, backlogClearRate);

  console.log(
    `   Processing ${toProcess.length}/${backlogTasks.length} backlog items`,
  );

  for (const task of toProcess) {
    console.log(`   📦 Processing ${task.issue} (${task.sessionId})...`);

    try {
      // Step 1: Teleport the session
      const teleported = await teleportSession(task.sessionId);
      if (!teleported) {
        console.log(`   ⚠️ Teleport failed for ${task.sessionId}`);
        continue;
      }

      // Step 2: Merge main branch to ensure we're up to date
      console.log(`   🔀 Merging main branch...`);
      try {
        execSync("git fetch origin main && git merge origin/main --no-edit", {
          encoding: "utf-8",
          timeout: 60000,
        });
        console.log(`   ✅ Merged main successfully`);
      } catch (mergeError: unknown) {
        // Check if it's a conflict
        const errorMsg = mergeError instanceof Error ? mergeError.message : String(mergeError);
        if (errorMsg.includes("CONFLICT") || errorMsg.includes("Automatic merge failed")) {
          console.log(`   ⚠️ Merge conflict detected, notifying agent...`);
          await sendMessage(
            task.sessionId,
            "Merge conflict with main branch. Please resolve conflicts in the codebase and ensure code builds.",
          );
          result.messagesSent.push(task.sessionId);
          // Abort the merge to leave clean state
          try {
            execSync("git merge --abort", { encoding: "utf-8", timeout: 10000 });
          } catch {
            // Ignore abort errors
          }
        } else {
          console.log(`   ⚠️ Merge failed: ${errorMsg}`);
          result.errors.push(`Merge failed for ${task.issue}: ${errorMsg}`);
        }
        continue;
      }

      // Step 3: Verify TypeScript
      console.log(`   🔍 Running typecheck...`);
      try {
        execSync("yarn typecheck", { encoding: "utf-8", timeout: 180000 });
        console.log(`   ✅ Typecheck passed`);
      } catch (tsError: unknown) {
        // Extract error message for the agent
        const errorOutput = tsError instanceof Error
          ? (tsError as any).stdout || (tsError as any).stderr || tsError.message
          : String(tsError);
        const truncatedError = errorOutput.slice(0, 1500);

        console.log(`   ⚠️ TypeScript errors found, notifying agent...`);
        await sendMessage(
          task.sessionId,
          `TypeScript errors after merging main branch. Please fix these errors:\n\n\`\`\`\n${truncatedError}\n...\n\`\`\``,
        );
        result.messagesSent.push(task.sessionId);
        result.errors.push(`TypeScript errors in ${task.issue}`);
        continue;
      }

      // Step 4: Create PR
      const prTitle = `feat: ${task.issue}`;
      const prBody = `Resolves ${task.issue}\n\nAutomated by Ralph`;
      const prUrl = createPR(prTitle, prBody);

      if (prUrl) {
        result.prsCreated.push(prUrl);
        console.log(`   ✅ Created PR: ${prUrl}`);

        // Update task status
        const taskIndex = result.updatedTasks.findIndex(
          (t) => t.sessionId === task.sessionId,
        );
        const updatedTask = result.updatedTasks[taskIndex];
        if (taskIndex !== -1 && updatedTask) {
          updatedTask.status = "PR_CREATED";
          const prNumber = prUrl.match(/\/pull\/(\d+)/)?.[1];
          if (prNumber) {
            updatedTask.prNumber = prNumber;
          }
        }
      } else {
        console.log(`   ⚠️ PR creation failed`);
        result.errors.push(`PR creation failed for ${task.issue}`);
      }
    } catch (error) {
      result.errors.push(`Backlog clear failed for ${task.issue}: ${error}`);
      console.log(`   ❌ Failed to process ${task.issue}`);
    }
  }
}

// ============================================================================
// Step 4: Fill Pipeline Queue
// ============================================================================

async function step4_fillQueue(
  result: IterationResult,
  registry: RalphRegistry,
  sessions: JulesSession[],
  deadSessionIds: Set<string>,
): Promise<void> {
  // Jules has a hard limit of 15 concurrent sessions
  // Only non-terminal sessions (not COMPLETED/FAILED) count against this limit
  const JULES_SESSION_LIMIT = 15;
  const terminalStatuses = ["COMPLETED", "FAILED"];
  const nonTerminalSessions = sessions.filter(
    (s) => !terminalStatuses.includes(s.status),
  );
  const julesActiveCount = nonTerminalSessions.length;

  // Calculate "effective" active count by excluding sessions marked as DEAD in step 1.5
  // Also exclude stuck PLANNING sessions (> 1 hour in PLANNING) if timestamps are reliable
  const now = Date.now();
  const stuckThresholdMs = STUCK_WARNING_HOURS * 60 * 60 * 1000;

  // Filter out DEAD sessions from non-terminal count (deadSessionIds passed from step 1.5)
  const nonTerminalNonDeadSessions = nonTerminalSessions.filter(
    (s) => !deadSessionIds.has(s.id),
  );

  // Also check for stuck PLANNING sessions by timestamp (if available from MCP)
  const stuckPlanningSessions = nonTerminalNonDeadSessions.filter((s) => {
    if (s.status !== "PLANNING") return false;
    const createdAt = new Date(s.createdAt).getTime();
    return (now - createdAt) > stuckThresholdMs;
  });

  const effectiveActiveCount = nonTerminalNonDeadSessions.length - stuckPlanningSessions.length;

  console.log(
    `   Jules sessions: ${julesActiveCount} active, ${
      sessions.length - julesActiveCount
    } terminal (${sessions.length} total)`,
  );

  // Log excluded sessions
  const totalExcluded = deadSessionIds.size + stuckPlanningSessions.length;
  if (totalExcluded > 0) {
    if (deadSessionIds.size > 0) {
      console.log(`   🗑️ ${deadSessionIds.size} sessions marked DEAD excluded from capacity`);
    }
    if (stuckPlanningSessions.length > 0) {
      console.log(
        `   ⚠️ ${stuckPlanningSessions.length} stuck PLANNING sessions excluded from capacity`,
      );
    }
    console.log(`   Effective active: ${effectiveActiveCount}/${JULES_SESSION_LIMIT}`);
  }

  // Check Jules' hard limit using effective count (excludes stuck sessions)
  if (effectiveActiveCount >= JULES_SESSION_LIMIT) {
    console.log(
      `   ⚠️ Jules at capacity: ${effectiveActiveCount}/${JULES_SESSION_LIMIT} active sessions`,
    );

    // Diagnostic logging - show what's consuming capacity
    const statusCounts = new Map<string, number>();
    for (const s of nonTerminalSessions) {
      if (!stuckPlanningSessions.includes(s)) {
        statusCounts.set(s.status, (statusCounts.get(s.status) || 0) + 1);
      }
    }
    console.log("   Capacity breakdown:");
    for (const [status, count] of statusCounts) {
      console.log(`      - ${status}: ${count}`);
    }

    console.log("   Skipping queue fill - wait for sessions to complete");
    return;
  }

  // Get WIP limit from registry config, with fallback to default
  const wipLimit = registry.config.wip_limit || DEFAULT_WIP_LIMIT;
  const activeSlots = countActiveSlots(result.updatedTasks);

  // Use the smaller of: WIP limit remaining OR Jules capacity remaining
  // Use effectiveActiveCount (excludes stuck sessions) for Jules capacity
  const wipAvailable = wipLimit - activeSlots;
  const julesAvailable = JULES_SESSION_LIMIT - effectiveActiveCount;
  const availableSlots = Math.min(wipAvailable, julesAvailable);

  console.log(`   Ralph: ${activeSlots}/${wipLimit} WIP slots, ${availableSlots} can be filled`);

  if (availableSlots <= 0) {
    console.log("   📊 Queue full, no slots available");
    return;
  }

  console.log(`   🚀 ${availableSlots} slots available, filling queue...`);

  try {
    // Get existing issue numbers to exclude
    const existingIssues = result.updatedTasks
      .map((t) => t.issue)
      .filter(Boolean)
      .map((i) => i.replace("#", ""));

    const availableIssuesJson = getAvailableIssues(existingIssues);
    const availableIssues: GitHubIssue[] = JSON.parse(availableIssuesJson);

    if (availableIssues.length === 0) {
      console.log("   ℹ️ No available issues to process");
      return;
    }

    // Create sessions for top N issues
    const issuesToProcess = availableIssues.slice(0, availableSlots);
    console.log(`   Creating ${issuesToProcess.length} new sessions...`);

    for (const issue of issuesToProcess) {
      const sessionId = await createJulesSession(issue.number);

      if (sessionId) {
        result.sessionsCreated++;
        console.log(`   ✅ Created session ${sessionId} for #${issue.number}`);

        // Add to tasks
        result.updatedTasks.push({
          issue: `#${issue.number}`,
          sessionId,
          status: "PLANNING",
          prNumber: null,
          retries: 0,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        result.errors.push(`Failed to create session for #${issue.number}`);
        console.log(`   ❌ Failed to create session for #${issue.number}`);
      }
    }
  } catch (error) {
    result.errors.push(`Queue fill failed: ${error}`);
    console.log("   ⚠️ Queue fill failed");
  }
}

// ============================================================================
// Step 5: Handle Build Failures
// ============================================================================

async function step5_buildFailures(result: IterationResult): Promise<void> {
  try {
    const ciStatusJson = getCIStatus();
    const ciStatus: CIStatus = JSON.parse(ciStatusJson);

    if (ciStatus.status !== "failing") {
      console.log("   ✅ No build failures to handle");
      return;
    }

    console.log("   ❌ CI is failing on main branch");

    // Check if there's already a CI fix task
    const existingCiFix = result.updatedTasks.find(
      (t) => t.issue.includes("CI") || t.issue.includes("build"),
    );

    if (existingCiFix) {
      console.log(`   ℹ️ CI fix task already exists: ${existingCiFix.issue}`);
      return;
    }

    // Create priority CI fix task (exceeds WIP_LIMIT)
    console.log("   🚨 Creating priority CI fix task...");
    console.log(
      `   Issue: CI is failing on main branch - Error: ${
        ciStatus.error_excerpt || "Unknown error"
      }`,
    );

    // For now, log the issue - actual issue creation would need gh CLI
    console.log("   TODO: Create CI fix issue and Jules session");
    result.errors.push("CI failing - manual intervention needed");
  } catch (error) {
    result.errors.push(`Build failure check failed: ${error}`);
  }
}

// ============================================================================
// Step 6: Respond to Feedback Requests
// ============================================================================

async function step6_respondFeedback(
  result: IterationResult,
  sessions: JulesSession[],
): Promise<void> {
  const awaitingFeedback = sessions.filter(
    (s) => s.status === "AWAITING_USER_FEEDBACK",
  );

  if (awaitingFeedback.length === 0) {
    console.log("   No feedback requests pending");
    return;
  }

  console.log(`   ${awaitingFeedback.length} sessions awaiting feedback`);

  for (const session of awaitingFeedback) {
    try {
      // Get session details to understand what Jules is asking
      const details = await getSessionDetails(session.id);

      if (!details) {
        console.log(`   ⚠️ Could not get details for ${session.id}`);
        continue;
      }

      // Process feedback: Teleport -> Merge Main -> TS Check -> PR
      await handleFeedbackSession(session, details, result);
    } catch (error) {
      result.errors.push(`Feedback response failed for ${session.id}: ${error}`);
    }
  }
}

async function handleFeedbackSession(
  session: JulesSession,
  _details: any,
  result: IterationResult,
): Promise<void> {
  // Check if we should teleport and merge main (standard feedback loop)
  // Logic: Teleport -> Merge Main -> Check Typescript -> Create PR or Report Errors
  console.log(`   🔄 Processing feedback loop for ${session.id}...`);

  const mergeResult = teleportAndMerge(session.id);

  if (mergeResult.conflict) {
    // Conflict detected: Push with conflict markers and tell Jules
    console.log(`   ⚠️ Conflict detected, notifying session ${session.id}`);
    const msg =
      "There was a merge conflict when merging main. I have pushed the changes with conflict markers. Please resolve the conflicts and ensure the code builds.";
    await sendMessage(session.id, msg);
    result.messagesSent.push(session.id);
    return;
  }

  if (!mergeResult.success) {
    // Other merge failure
    console.log(`   ❌ Merge failed: ${mergeResult.message}`);
    result.errors.push(`Merge failed for ${session.id}`);
    return;
  }

  // Merge successful, run typescript check
  console.log("   🔍 Running TypeScript check...");
  try {
    execSync("yarn typescript", { encoding: "utf-8", timeout: 120000 });
    console.log("   ✅ TypeScript passed");

    // Create PR
    const prTitle = `feat: ${session.title || session.id}`;
    // Extract issue number if possible
    const issueMatch = (session.title || "").match(/#(\d+)/);
    const issueNum = issueMatch ? issueMatch[1] : "";
    const prBody = issueNum
      ? `Resolves #${issueNum}\n\nAutomated by Jules`
      : "Automated by Jules";

    const prUrl = createPR(prTitle, prBody);

    if (prUrl) {
      console.log(`   ✅ PR Created: ${prUrl}`);
      // Notify Jules
      await sendMessage(session.id, `I have created a PR: ${prUrl}`);
      result.prsCreated.push(prUrl);
      result.messagesSent.push(session.id);

      // Update task status
      const taskIndex = result.updatedTasks.findIndex(
        (t) => t.sessionId === session.id,
      );
      if (taskIndex !== -1 && result.updatedTasks[taskIndex]) {
        result.updatedTasks[taskIndex].status = "PR_CREATED";
        const prNum = prUrl.match(/\/pull\/(\d+)/)?.[1];
        if (prNum) {
          result.updatedTasks[taskIndex].prNumber = prNum;
        }
      }
    } else {
      result.errors.push("Failed to create PR after TS pass");
    }
  } catch (tsError: any) {
    // TypeScript failed
    console.log("   ❌ TypeScript check failed");
    // Extract error message (truncated)
    const errorMsg = tsError.stdout || tsError.message || "Unknown error";
    const truncatedError = errorMsg.slice(0, 500);

    const msg =
      `I merged the latest main, but TypeScript check failed. Please fix the following errors:\n\n\`\`\`\n${truncatedError}\n...\n\`\`\``;
    await sendMessage(session.id, msg);
    result.messagesSent.push(session.id);
  }
}

// ============================================================================
// Step 7: Handle Failed Sessions
// ============================================================================

async function step7_failedSessions(
  result: IterationResult,
  registry: RalphRegistry,
): Promise<void> {
  const failedTasks = result.updatedTasks.filter((t) => t.status === "FAILED");

  if (failedTasks.length === 0) {
    console.log("   No failed sessions");
    return;
  }

  console.log(`   ${failedTasks.length} failed sessions to handle`);

  for (const task of failedTasks) {
    if (task.retries < registry.config.max_retries) {
      console.log(
        `   🔄 Retrying ${task.issue} (attempt ${task.retries + 1})`,
      );

      // Create retry task with context
      const newSessionId = await createJulesSession(
        parseInt(task.issue.replace("#", "")),
      );

      if (newSessionId) {
        // Update task with new session
        const taskIndex = result.updatedTasks.findIndex(
          (t) => t.sessionId === task.sessionId,
        );
        const updatedTask = result.updatedTasks[taskIndex];
        if (taskIndex !== -1 && updatedTask) {
          updatedTask.sessionId = newSessionId;
          updatedTask.status = "PLANNING";
          updatedTask.retries++;
          updatedTask.lastUpdated = new Date().toISOString();
        }
        console.log(`   ✅ Created retry session ${newSessionId}`);
      }
    } else {
      console.log(
        `   ⚠️ ${task.issue} exceeded max retries, escalating to human review`,
      );
      // Mark as dead - needs manual intervention
      const taskIndex = result.updatedTasks.findIndex(
        (t) => t.sessionId === task.sessionId,
      );
      const deadTask = result.updatedTasks[taskIndex];
      if (taskIndex !== -1 && deadTask) {
        deadTask.status = "DEAD";
      }
    }
  }
}

// ============================================================================
// Summary Generation
// ============================================================================

function generateSummary(result: IterationResult): string {
  const parts: string[] = [];

  if (result.plansApproved.length > 0) {
    parts.push(`approved ${result.plansApproved.length} plans`);
  }

  if (result.sessionsCreated > 0) {
    parts.push(`created ${result.sessionsCreated} sessions`);
  }

  if (result.prsCreated.length > 0) {
    parts.push(`created ${result.prsCreated.length} PRs`);
  }

  if (result.prsMerged.length > 0) {
    parts.push(`merged ${result.prsMerged.length} PRs`);
  }

  if (result.messagesSent.length > 0) {
    parts.push(`responded to ${result.messagesSent.length} feedback requests`);
  }

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} errors`);
  }

  if (parts.length === 0) {
    return "no significant actions taken";
  }

  return parts.join(", ");
}
