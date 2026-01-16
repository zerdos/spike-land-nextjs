/**
 * Ralph Validator
 * Validate iteration results and calculate metrics
 */

import type { IterationResult, TaskEntry, ValidationMetrics, ValidationResult } from "./types";

// Default fallback value (used only if wipLimit not provided)
const DEFAULT_WIP_LIMIT = 15;

// ============================================================================
// Main Validation
// ============================================================================

export async function validateIteration(
  result: IterationResult,
  wipLimit: number = DEFAULT_WIP_LIMIT,
): Promise<ValidationResult> {
  const issues: string[] = [];
  const metrics = calculateMetrics(result, wipLimit);

  // Check for errors
  if (result.errors.length > 0) {
    issues.push(`${result.errors.length} errors occurred`);
  }

  // Check if backlog is growing
  if (metrics.backlogSize > 10) {
    issues.push(`Backlog growing: ${metrics.backlogSize} sessions awaiting PR`);
  }

  // Check pipeline utilization
  if (metrics.pipelineUtilization < 0.6) {
    issues.push(
      `Pipeline underutilized: ${Math.round(metrics.pipelineUtilization * 100)}% of slots used`,
    );
  }

  // Check for stuck sessions
  const stuckSessions = findStuckSessions(result.updatedTasks);
  if (stuckSessions.length > 0) {
    issues.push(`${stuckSessions.length} sessions stuck for 3+ iterations`);
  }

  // Check approval rate
  if (metrics.approvalRate < 0.8 && result.plansApproved.length === 0) {
    // Only flag if there were plans to approve
    const pendingApproval = result.updatedTasks.filter(
      (t) => t.status === "AWAITING_PLAN_APPROVAL",
    ).length;
    if (pendingApproval > 0) {
      issues.push(
        `Low approval rate: ${pendingApproval} plans still awaiting approval`,
      );
    }
  }

  // Check CI pass rate
  if (metrics.ciPassRate < 0.7) {
    issues.push(
      `Low CI pass rate: ${Math.round(metrics.ciPassRate * 100)}% of PRs passing CI`,
    );
  }

  return {
    success: issues.length === 0,
    issues,
    metrics,
  };
}

// ============================================================================
// Metrics Calculation
// ============================================================================

function calculateMetrics(
  result: IterationResult,
  wipLimit: number = DEFAULT_WIP_LIMIT,
): ValidationMetrics {
  const tasks = result.updatedTasks;

  // Approval rate
  const pendingApprovalBefore = tasks.filter(
    (t) => t.status === "AWAITING_PLAN_APPROVAL",
  ).length;
  const approvalRate = pendingApprovalBefore > 0
    ? result.plansApproved.length / (pendingApprovalBefore + result.plansApproved.length)
    : 1.0;

  // PR creation rate
  const completedAwaitPr = tasks.filter(
    (t) => t.status === "COMPLETED→AWAIT_PR",
  ).length;
  const prCreated = tasks.filter((t) => t.status === "PR_CREATED").length;
  const prCreationRate = completedAwaitPr + prCreated > 0
    ? prCreated / (completedAwaitPr + prCreated)
    : 1.0;

  // CI pass rate (from PR lifecycle data)
  const prsWithCi = tasks.filter((t) =>
    ["PR_CREATED", "PR_CI_FAILING", "REVIEW_REQUESTED"].includes(t.status)
  );
  const prsPassingCi = prsWithCi.filter(
    (t) => t.status !== "PR_CI_FAILING",
  ).length;
  const ciPassRate = prsWithCi.length > 0 ? prsPassingCi / prsWithCi.length : 1.0;

  // Merge rate
  const approvedPrs = tasks.filter(
    (t) => t.status === "REVIEW_APPROVED",
  ).length;
  const mergedPrs = result.prsMerged.length;
  const mergeRate = approvedPrs + mergedPrs > 0 ? mergedPrs / (approvedPrs + mergedPrs) : 1.0;

  // Pipeline utilization
  const activeSlots =
    tasks.filter((t) => ["PLANNING", "AWAITING_PLAN_APPROVAL", "IN_PROGRESS"].includes(t.status))
      .length;
  const pipelineUtilization = activeSlots / wipLimit;

  // Backlog size
  const backlogSize = tasks.filter(
    (t) => t.status === "COMPLETED→AWAIT_PR",
  ).length;

  return {
    approvalRate,
    prCreationRate,
    ciPassRate,
    mergeRate,
    pipelineUtilization,
    backlogSize,
  };
}

// ============================================================================
// Stuck Session Detection
// ============================================================================

interface StuckSessionInfo {
  task: TaskEntry;
  iterationsStuck: number;
  lastStatus: string;
}

/**
 * Find sessions that have been in the same status for too long
 * This is a heuristic based on timestamp comparison
 */
export function findStuckSessions(tasks: TaskEntry[]): StuckSessionInfo[] {
  const stuck: StuckSessionInfo[] = [];
  const now = new Date();
  const stuckThresholdHours = 2; // 2 hours = roughly 10 iterations

  for (const task of tasks) {
    // Skip terminal states
    if (["COMPLETED", "FAILED", "DEAD"].includes(task.status)) {
      continue;
    }

    const lastUpdated = new Date(task.lastUpdated);
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate > stuckThresholdHours) {
      stuck.push({
        task,
        iterationsStuck: Math.floor(hoursSinceUpdate / 0.2), // ~12 min per iteration
        lastStatus: task.status,
      });
    }
  }

  return stuck;
}

// ============================================================================
// Error Pattern Detection
// ============================================================================

export interface ErrorPattern {
  pattern: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Find recurring error patterns in the iteration result
 */
export function findRecurringErrors(
  errors: string[],
  previousPatterns: ErrorPattern[] = [],
): ErrorPattern[] {
  const patterns = new Map<string, ErrorPattern>();

  // Load previous patterns
  for (const p of previousPatterns) {
    patterns.set(p.pattern, p);
  }

  // Categorize new errors
  for (const error of errors) {
    const pattern = categorizeError(error);

    if (patterns.has(pattern)) {
      const existing = patterns.get(pattern);
      if (existing) {
        existing.occurrences++;
        existing.lastSeen = new Date().toISOString();
      }
    } else {
      patterns.set(pattern, {
        pattern,
        occurrences: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }
  }

  // Return patterns with 3+ occurrences
  return Array.from(patterns.values()).filter((p) => p.occurrences >= 3);
}

function categorizeError(error: string): string {
  // Normalize error messages to find patterns
  const lowercaseError = error.toLowerCase();

  if (lowercaseError.includes("typescript") || lowercaseError.includes("tsc")) {
    return "TypeScript compilation error";
  }

  if (lowercaseError.includes("timeout")) {
    return "Timeout error";
  }

  if (lowercaseError.includes("network") || lowercaseError.includes("fetch")) {
    return "Network error";
  }

  if (lowercaseError.includes("permission") || lowercaseError.includes("access")) {
    return "Permission error";
  }

  if (lowercaseError.includes("approve") || lowercaseError.includes("approval")) {
    return "Plan approval error";
  }

  if (lowercaseError.includes("pr") || lowercaseError.includes("pull request")) {
    return "PR creation error";
  }

  if (lowercaseError.includes("ci") || lowercaseError.includes("build")) {
    return "CI/Build error";
  }

  if (lowercaseError.includes("jules") || lowercaseError.includes("session")) {
    return "Jules session error";
  }

  // Generic pattern - first 50 chars
  return error.slice(0, 50) + "...";
}

// ============================================================================
// Throughput Analysis
// ============================================================================

export interface ThroughputAnalysis {
  sessionsPerHour: number;
  prsPerHour: number;
  mergesPerHour: number;
  estimatedDailyThroughput: number;
  bottleneck: string;
}

export function analyzeThroughput(
  result: IterationResult,
  _previousResults: IterationResult[] = [],
): ThroughputAnalysis {
  // Calculate time for this iteration
  const iterationMinutes = (result.endTime.getTime() - result.startTime.getTime()) / (1000 * 60);
  const iterationsPerHour = 60 / iterationMinutes;

  // Calculate throughput
  const sessionsPerHour = result.sessionsCreated * iterationsPerHour;
  const prsPerHour = result.prsCreated.length * iterationsPerHour;
  const mergesPerHour = result.prsMerged.length * iterationsPerHour;

  // Estimate daily throughput (8 working hours)
  const estimatedDailyThroughput = sessionsPerHour * 8;

  // Identify bottleneck
  let bottleneck = "none";
  const metrics = calculateMetrics(result);

  if (metrics.backlogSize > 5) {
    bottleneck = "PR creation backlog";
  } else if (metrics.pipelineUtilization < 0.5) {
    bottleneck = "Queue not being filled";
  } else if (metrics.ciPassRate < 0.7) {
    bottleneck = "CI failures";
  } else if (metrics.approvalRate < 0.8) {
    bottleneck = "Plan approval";
  }

  return {
    sessionsPerHour,
    prsPerHour,
    mergesPerHour,
    estimatedDailyThroughput,
    bottleneck,
  };
}
