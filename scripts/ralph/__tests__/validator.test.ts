/**
 * Tests for Ralph Validator
 */

import { describe, expect, it } from "vitest";
import type { IterationResult, TaskEntry } from "../types";
import { findRecurringErrors, findStuckSessions, validateIteration } from "../validator";

// Helper to create a mock iteration result
function createMockResult(overrides: Partial<IterationResult> = {}): IterationResult {
  return {
    sessionsCreated: 0,
    plansApproved: [],
    prsCreated: [],
    prsMerged: [],
    messagesSent: [],
    errors: [],
    updatedTasks: [],
    meaningfulWork: false,
    summary: "",
    startTime: new Date(),
    endTime: new Date(),
    ...overrides,
  };
}

// Helper to create a mock task entry
function createMockTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    issue: "#123",
    sessionId: "123456789012345",
    status: "PLANNING",
    prNumber: null,
    retries: 0,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe("validateIteration", () => {
  it("returns success when no issues", async () => {
    // Create enough active tasks to satisfy 60% pipeline utilization
    // With wipLimit=10, we need at least 6 active tasks
    // Avoid AWAITING_PLAN_APPROVAL unless we also add approved plans (triggers approval rate check)
    const result = createMockResult({
      updatedTasks: [
        createMockTask({ status: "IN_PROGRESS" }),
        createMockTask({ status: "PLANNING" }),
        createMockTask({ status: "IN_PROGRESS" }),
        createMockTask({ status: "PLANNING" }),
        createMockTask({ status: "IN_PROGRESS" }),
        createMockTask({ status: "PLANNING" }),
      ],
    });

    const validation = await validateIteration(result, 10);

    expect(validation.success).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it("flags errors when they occur", async () => {
    const result = createMockResult({
      errors: ["Error 1", "Error 2"],
    });

    const validation = await validateIteration(result, 15);

    expect(validation.success).toBe(false);
    expect(validation.issues).toContain("2 errors occurred");
  });

  it("flags backlog growth when > 10 tasks await PR", async () => {
    const backlogTasks = Array.from({ length: 11 }, (_, i) =>
      createMockTask({
        issue: `#${i}`,
        status: "COMPLETED→AWAIT_PR",
      }));

    const result = createMockResult({
      updatedTasks: backlogTasks,
    });

    const validation = await validateIteration(result, 15);

    expect(validation.success).toBe(false);
    expect(validation.issues.some((i) => i.includes("Backlog growing"))).toBe(true);
  });

  it("flags pipeline underutilization when < 60%", async () => {
    // With wipLimit=15, we need at least 9 active tasks for 60%
    // Let's have only 3 active (20%)
    const result = createMockResult({
      updatedTasks: [
        createMockTask({ status: "PLANNING" }),
        createMockTask({ status: "IN_PROGRESS" }),
        createMockTask({ status: "AWAITING_PLAN_APPROVAL" }),
      ],
    });

    const validation = await validateIteration(result, 15);

    expect(validation.success).toBe(false);
    expect(validation.issues.some((i) => i.includes("underutilized"))).toBe(true);
  });

  it("flags low CI pass rate when < 70%", async () => {
    const result = createMockResult({
      updatedTasks: [
        createMockTask({ status: "PR_CREATED" }), // CI passing
        createMockTask({ status: "PR_CI_FAILING" }), // CI failing
        createMockTask({ status: "PR_CI_FAILING" }), // CI failing
        // Active tasks to avoid underutilization flag
        ...Array.from({ length: 10 }, () => createMockTask({ status: "IN_PROGRESS" })),
      ],
    });

    const validation = await validateIteration(result, 15);

    expect(validation.issues.some((i) => i.includes("CI pass rate"))).toBe(true);
  });

  it("calculates metrics correctly", async () => {
    const result = createMockResult({
      plansApproved: ["session1", "session2"],
      prsMerged: ["pr1"],
      updatedTasks: [
        createMockTask({ status: "PLANNING" }),
        createMockTask({ status: "IN_PROGRESS" }),
        createMockTask({ status: "COMPLETED→AWAIT_PR" }),
        createMockTask({ status: "PR_CREATED" }),
        createMockTask({ status: "REVIEW_APPROVED" }),
      ],
    });

    const validation = await validateIteration(result, 10);

    expect(validation.metrics.backlogSize).toBe(1);
    expect(validation.metrics.pipelineUtilization).toBe(0.2); // 2 active / 10 wipLimit
  });

  it("uses provided wipLimit for calculations", async () => {
    const result = createMockResult({
      updatedTasks: [
        createMockTask({ status: "PLANNING" }),
        createMockTask({ status: "IN_PROGRESS" }),
        createMockTask({ status: "AWAITING_PLAN_APPROVAL" }),
      ],
    });

    // With wipLimit=5, 3/5 = 60% utilization (not underutilized)
    const validation5 = await validateIteration(result, 5);
    expect(validation5.metrics.pipelineUtilization).toBe(0.6);

    // With wipLimit=15, 3/15 = 20% utilization (underutilized)
    const validation15 = await validateIteration(result, 15);
    expect(validation15.metrics.pipelineUtilization).toBe(0.2);
  });
});

describe("findStuckSessions", () => {
  it("identifies sessions stuck for > 2 hours", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const tasks = [
      createMockTask({ status: "PLANNING", lastUpdated: threeHoursAgo }),
    ];

    const stuck = findStuckSessions(tasks);

    expect(stuck).toHaveLength(1);
    expect(stuck[0]?.lastStatus).toBe("PLANNING");
  });

  it("does not flag recently updated sessions", () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const tasks = [
      createMockTask({ status: "PLANNING", lastUpdated: oneHourAgo }),
    ];

    const stuck = findStuckSessions(tasks);

    expect(stuck).toHaveLength(0);
  });

  it("skips terminal states (COMPLETED, FAILED, DEAD)", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const tasks = [
      createMockTask({ status: "COMPLETED", lastUpdated: threeHoursAgo }),
      createMockTask({ status: "FAILED", lastUpdated: threeHoursAgo }),
      createMockTask({ status: "DEAD", lastUpdated: threeHoursAgo }),
    ];

    const stuck = findStuckSessions(tasks);

    expect(stuck).toHaveLength(0);
  });
});

describe("findRecurringErrors", () => {
  it("identifies patterns with 3+ occurrences", () => {
    const errors = [
      "TypeScript error in file.ts",
      "TypeScript compilation error",
      "TSC error: type mismatch",
    ];

    const patterns = findRecurringErrors(errors, []);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.pattern).toBe("TypeScript compilation error");
    expect(patterns[0]?.occurrences).toBe(3);
  });

  it("categorizes different error types", () => {
    const errors = [
      "Network timeout",
      "Timeout exceeded",
      "Request timeout",
      "Permission denied",
      "Access denied",
      "No permission",
    ];

    const patterns = findRecurringErrors(errors, []);

    expect(patterns).toHaveLength(2);
    expect(patterns.map((p) => p.pattern)).toContain("Timeout error");
    expect(patterns.map((p) => p.pattern)).toContain("Permission error");
  });

  it("accumulates with previous patterns", () => {
    const previousPatterns = [
      {
        pattern: "TypeScript compilation error",
        occurrences: 2,
        firstSeen: "2024-01-01T00:00:00Z",
        lastSeen: "2024-01-01T01:00:00Z",
      },
    ];

    const errors = ["TSC error: type mismatch"];

    const patterns = findRecurringErrors(errors, previousPatterns);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.occurrences).toBe(3); // 2 + 1
  });

  it("returns empty array when no patterns reach threshold", () => {
    const errors = ["Random error 1", "Different error 2"];

    const patterns = findRecurringErrors(errors, []);

    expect(patterns).toHaveLength(0);
  });
});
