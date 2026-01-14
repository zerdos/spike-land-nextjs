/**
 * Tests for Ralph Registry Parser
 */

import { existsSync, rmSync, writeFileSync } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { countActiveSlots, countBacklog, sortTasksByAge } from "../registry";
import type { TaskEntry } from "../types";

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

describe("countActiveSlots", () => {
  it("counts PLANNING status as active", () => {
    const tasks = [createMockTask({ status: "PLANNING" })];
    expect(countActiveSlots(tasks)).toBe(1);
  });

  it("counts AWAITING_PLAN_APPROVAL status as active", () => {
    const tasks = [createMockTask({ status: "AWAITING_PLAN_APPROVAL" })];
    expect(countActiveSlots(tasks)).toBe(1);
  });

  it("counts IN_PROGRESS status as active", () => {
    const tasks = [createMockTask({ status: "IN_PROGRESS" })];
    expect(countActiveSlots(tasks)).toBe(1);
  });

  it("does not count COMPLETED→AWAIT_PR as active", () => {
    const tasks = [createMockTask({ status: "COMPLETED→AWAIT_PR" })];
    expect(countActiveSlots(tasks)).toBe(0);
  });

  it("does not count PR states as active", () => {
    const tasks = [
      createMockTask({ status: "PR_CREATED" }),
      createMockTask({ status: "PR_CI_FAILING" }),
      createMockTask({ status: "REVIEW_REQUESTED" }),
    ];
    expect(countActiveSlots(tasks)).toBe(0);
  });

  it("counts multiple active tasks correctly", () => {
    const tasks = [
      createMockTask({ status: "PLANNING" }),
      createMockTask({ status: "IN_PROGRESS" }),
      createMockTask({ status: "AWAITING_PLAN_APPROVAL" }),
      createMockTask({ status: "COMPLETED→AWAIT_PR" }), // Not active
      createMockTask({ status: "PR_CREATED" }), // Not active
    ];
    expect(countActiveSlots(tasks)).toBe(3);
  });

  it("returns 0 for empty array", () => {
    expect(countActiveSlots([])).toBe(0);
  });
});

describe("countBacklog", () => {
  it("counts tasks in COMPLETED→AWAIT_PR status", () => {
    const tasks = [
      createMockTask({ status: "COMPLETED→AWAIT_PR" }),
      createMockTask({ status: "COMPLETED→AWAIT_PR" }),
    ];
    expect(countBacklog(tasks)).toBe(2);
  });

  it("does not count other statuses", () => {
    const tasks = [
      createMockTask({ status: "PLANNING" }),
      createMockTask({ status: "IN_PROGRESS" }),
      createMockTask({ status: "PR_CREATED" }),
    ];
    expect(countBacklog(tasks)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(countBacklog([])).toBe(0);
  });
});

describe("sortTasksByAge", () => {
  it("sorts tasks by lastUpdated, oldest first", () => {
    const old = new Date("2024-01-01T00:00:00Z").toISOString();
    const medium = new Date("2024-06-01T00:00:00Z").toISOString();
    const recent = new Date("2024-12-01T00:00:00Z").toISOString();

    const tasks = [
      createMockTask({ issue: "#3", lastUpdated: recent }),
      createMockTask({ issue: "#1", lastUpdated: old }),
      createMockTask({ issue: "#2", lastUpdated: medium }),
    ];

    const sorted = sortTasksByAge(tasks);

    expect(sorted[0]?.issue).toBe("#1"); // oldest
    expect(sorted[1]?.issue).toBe("#2"); // medium
    expect(sorted[2]?.issue).toBe("#3"); // recent
  });

  it("does not mutate original array", () => {
    const old = new Date("2024-01-01T00:00:00Z").toISOString();
    const recent = new Date("2024-12-01T00:00:00Z").toISOString();

    const tasks = [
      createMockTask({ issue: "#2", lastUpdated: recent }),
      createMockTask({ issue: "#1", lastUpdated: old }),
    ];

    const sorted = sortTasksByAge(tasks);

    expect(tasks[0]?.issue).toBe("#2"); // Original unchanged
    expect(sorted[0]?.issue).toBe("#1"); // Sorted result
  });

  it("handles empty array", () => {
    const sorted = sortTasksByAge([]);
    expect(sorted).toHaveLength(0);
  });

  it("handles single element array", () => {
    const tasks = [createMockTask()];
    const sorted = sortTasksByAge(tasks);
    expect(sorted).toHaveLength(1);
  });
});

// Integration tests that require file system
describe("parseRegistry", () => {
  const TEST_REGISTRY_PATH = "/tmp/ralph-test-registry.md";

  beforeEach(() => {
    // Clean up before each test
    if (existsSync(TEST_REGISTRY_PATH)) {
      rmSync(TEST_REGISTRY_PATH);
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(TEST_REGISTRY_PATH)) {
      rmSync(TEST_REGISTRY_PATH);
    }
  });

  it("parses YAML frontmatter correctly", async () => {
    const registryContent = `---
active: true
iteration: 42
max_iterations: 2000
daily_sessions_used: 5
daily_session_limit: 100
---

# Test Registry
`;

    writeFileSync(TEST_REGISTRY_PATH, registryContent);

    // Import parseRegistry dynamically to avoid module-level file access
    const { parseRegistry } = await import("../registry");
    const registry = await parseRegistry(TEST_REGISTRY_PATH);

    expect(registry.active).toBe(true);
    expect(registry.iteration).toBe(42);
    expect(registry.daily_sessions_used).toBe(5);
    expect(registry.daily_session_limit).toBe(100);
  });

  it("parses WIP_LIMIT from config table", async () => {
    const registryContent = `---
active: true
iteration: 1
---

## Config

| Setting      | Value                    |
| ------------ | ------------------------ |
| WIP_LIMIT    | **20**                   |
`;

    writeFileSync(TEST_REGISTRY_PATH, registryContent);

    const { parseRegistry } = await import("../registry");
    const registry = await parseRegistry(TEST_REGISTRY_PATH);

    expect(registry.config.wip_limit).toBe(20);
  });

  it("uses default values for missing frontmatter", async () => {
    const registryContent = `# No frontmatter
Just content
`;

    writeFileSync(TEST_REGISTRY_PATH, registryContent);

    const { parseRegistry } = await import("../registry");
    const registry = await parseRegistry(TEST_REGISTRY_PATH);

    // Should use defaults
    expect(registry.active).toBe(true);
    expect(registry.iteration).toBe(0);
  });
});
