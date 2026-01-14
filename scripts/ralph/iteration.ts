/**
 * Ralph Iteration Runner
 * Executes the 8-step iteration workflow
 */

import { execSync } from "child_process";
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

const WIP_LIMIT = 15;
const BACKLOG_CLEAR_RATE = 5;

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

  console.log("\n✅ STEP 2: Auto-Approve Pending Plans");
  await step2_autoApprove(result, sessions);

  console.log("\n🔄 STEP 3: Handle PR Lifecycle");
  await step3_prLifecycle(result);

  console.log("\n📦 STEP 3.0a: Clear AWAIT_PR Backlog");
  await step3a_clearBacklog(result, registry);

  console.log("\n🚀 STEP 4: Fill Pipeline Queue");
  await step4_fillQueue(result, registry);

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
    // If session is in registry but not in Jules, it's dead
    if (task.sessionId && !activeSessionIds.has(task.sessionId)) {
      // Only remove if it's not in a terminal state
      if (!["COMPLETED", "FAILED", "DEAD"].includes(task.status)) {
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

    // Update task statuses from Jules
    for (const session of sessions) {
      const taskIndex = result.updatedTasks.findIndex(
        (t) => t.sessionId === session.id,
      );
      const task = result.updatedTasks[taskIndex];
      if (taskIndex !== -1 && task) {
        task.status = mapJulesStatusToTaskStatus(session.status);
        task.lastUpdated = new Date().toISOString();
      }
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

  // Sort by age (oldest first)
  const sortedBacklog = sortTasksByAge(backlogTasks);
  const toProcess = sortedBacklog.slice(0, BACKLOG_CLEAR_RATE);

  console.log(
    `   Processing ${toProcess.length}/${backlogTasks.length} backlog items`,
  );

  for (const task of toProcess) {
    console.log(`   📦 Processing ${task.issue} (${task.sessionId})...`);

    try {
      // Teleport the session
      const teleported = await teleportSession(task.sessionId);
      if (!teleported) {
        console.log(`   ⚠️ Teleport failed for ${task.sessionId}`);
        continue;
      }

      // Verify TypeScript
      console.log(`   🔍 Verifying TypeScript...`);
      try {
        execSync("yarn tsc --noEmit", { encoding: "utf-8", timeout: 120000 });
      } catch (tsError) {
        console.log(`   ⚠️ TypeScript errors found, needs manual fix`);
        result.errors.push(`TypeScript errors in ${task.issue}`);
        continue;
      }

      // Create PR
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
  _registry: RalphRegistry,
): Promise<void> {
  const activeSlots = countActiveSlots(result.updatedTasks);
  const availableSlots = WIP_LIMIT - activeSlots;

  console.log(`   Current: ${activeSlots}/${WIP_LIMIT} slots used`);

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

      // Determine appropriate response based on activities
      const lastActivity = details.activities[details.activities.length - 1];
      const response = generateFeedbackResponse(lastActivity?.message || "");

      if (response) {
        const success = await sendMessage(session.id, response);
        if (success) {
          result.messagesSent.push(session.id);
          console.log(`   💬 Responded to ${session.id}`);
        }
      }
    } catch (error) {
      result.errors.push(`Feedback response failed for ${session.id}: ${error}`);
    }
  }
}

function generateFeedbackResponse(question: string): string | null {
  const lowercaseQ = question.toLowerCase();

  // Common questions and responses
  if (lowercaseQ.includes("which approach")) {
    return "Use the simpler approach. Prioritize maintainability and readability.";
  }

  if (lowercaseQ.includes("skip") && lowercaseQ.includes("test")) {
    return "No, do not skip tests. Fix the failing tests.";
  }

  if (lowercaseQ.includes("access") || lowercaseQ.includes("permission")) {
    return "You should have access via the standard methods. Check the documentation or existing patterns in the codebase.";
  }

  if (lowercaseQ.includes("clarify") || lowercaseQ.includes("requirement")) {
    return "Please proceed with your best interpretation of the requirements. Focus on the acceptance criteria in the issue.";
  }

  // Generic response for unknown questions
  return "Please proceed with your best judgment. Focus on simplicity and following existing patterns in the codebase.";
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
