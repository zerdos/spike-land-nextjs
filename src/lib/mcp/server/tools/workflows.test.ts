import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workflow: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  workflowVersion: { create: vi.fn() },
  workflowStep: { createMany: vi.fn() },
  workflowRun: { create: vi.fn(), findFirst: vi.fn() },
  workspace: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerWorkflowsTools } from "./workflows";

const WORKSPACE = { id: "ws-1", slug: "my-ws", name: "My Workspace" };

describe("workflows tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerWorkflowsTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 5 workflow tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("workflow_create")).toBe(true);
    expect(registry.handlers.has("workflow_run")).toBe(true);
    expect(registry.handlers.has("workflow_get_status")).toBe(true);
    expect(registry.handlers.has("workflow_list")).toBe(true);
    expect(registry.handlers.has("workflow_get_logs")).toBe(true);
  });

  describe("workflow_create", () => {
    it("should create a workflow with steps", async () => {
      mockPrisma.workflow.create.mockResolvedValue({ id: "wf-1", name: "Email Campaign" });
      mockPrisma.workflowVersion.create.mockResolvedValue({ id: "ver-1", version: 1 });
      mockPrisma.workflowStep.createMany.mockResolvedValue({ count: 2 });

      const steps = JSON.stringify([
        { name: "Send Email", type: "ACTION" },
        { name: "Wait 1 day", type: "ACTION", config: { days: 1 } },
      ]);

      const handler = registry.handlers.get("workflow_create")!;
      const result = await handler({
        workspace_slug: "my-ws",
        name: "Email Campaign",
        trigger_type: "manual",
        steps,
      });
      const text = getText(result);
      expect(text).toContain("Workflow Created");
      expect(text).toContain("Email Campaign");
      expect(text).toContain("Version:** 1");
      expect(text).toContain("Steps:** 2");
      expect(text).toContain("manual");
      expect(mockPrisma.workflowStep.createMany).toHaveBeenCalled();
    });

    it("should handle invalid JSON in steps", async () => {
      const handler = registry.handlers.get("workflow_create")!;
      const result = await handler({
        workspace_slug: "my-ws",
        name: "Bad Workflow",
        trigger_type: "manual",
        steps: "not-json",
      });
      const text = getText(result);
      expect(text).toContain("VALIDATION_ERROR");
      expect(text).toContain("Invalid JSON");
    });

    it("should create workflow with empty steps array", async () => {
      mockPrisma.workflow.create.mockResolvedValue({ id: "wf-2", name: "Empty" });
      mockPrisma.workflowVersion.create.mockResolvedValue({ id: "ver-2", version: 1 });

      const handler = registry.handlers.get("workflow_create")!;
      const result = await handler({
        workspace_slug: "my-ws",
        name: "Empty",
        trigger_type: "schedule",
        steps: "[]",
      });
      const text = getText(result);
      expect(text).toContain("Workflow Created");
      expect(text).toContain("Steps:** 0");
      expect(mockPrisma.workflowStep.createMany).not.toHaveBeenCalled();
    });
  });

  describe("workflow_run", () => {
    it("should start a workflow run", async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: "wf-1", name: "Email Campaign" });
      mockPrisma.workflowRun.create.mockResolvedValue({ id: "run-1", status: "RUNNING" });

      const handler = registry.handlers.get("workflow_run")!;
      const result = await handler({
        workspace_slug: "my-ws",
        workflow_id: "wf-1",
        input: JSON.stringify({ recipient: "alice@test.com" }),
      });
      const text = getText(result);
      expect(text).toContain("Workflow Run Started");
      expect(text).toContain("run-1");
      expect(text).toContain("Email Campaign");
      expect(text).toContain("RUNNING");
    });

    it("should return error for missing workflow", async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("workflow_run")!;
      const result = await handler({ workspace_slug: "my-ws", workflow_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
      expect(text).toContain("Workflow not found");
    });

    it("should handle invalid JSON in input", async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: "wf-1", name: "Test" });

      const handler = registry.handlers.get("workflow_run")!;
      const result = await handler({
        workspace_slug: "my-ws",
        workflow_id: "wf-1",
        input: "not-json",
      });
      const text = getText(result);
      expect(text).toContain("VALIDATION_ERROR");
      expect(text).toContain("Invalid JSON");
    });

    it("should run without input", async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: "wf-1", name: "No Input" });
      mockPrisma.workflowRun.create.mockResolvedValue({ id: "run-2", status: "RUNNING" });

      const handler = registry.handlers.get("workflow_run")!;
      const result = await handler({ workspace_slug: "my-ws", workflow_id: "wf-1" });
      const text = getText(result);
      expect(text).toContain("Workflow Run Started");
    });
  });

  describe("workflow_get_status", () => {
    it("should return run status with step progress", async () => {
      mockPrisma.workflowRun.findFirst.mockResolvedValue({
        id: "run-1",
        status: "RUNNING",
        workflow: { name: "Email Campaign" },
        logs: [
          { stepId: "s-1", stepStatus: "COMPLETED", message: "Step 1 done", timestamp: new Date("2025-06-01T10:00:00Z") },
          { stepId: "s-2", stepStatus: "RUNNING", message: "Step 2 in progress", timestamp: new Date("2025-06-01T10:01:00Z") },
        ],
        startedAt: new Date("2025-06-01T10:00:00Z"),
        endedAt: null,
      });

      const handler = registry.handlers.get("workflow_get_status")!;
      const result = await handler({ workspace_slug: "my-ws", run_id: "run-1" });
      const text = getText(result);
      expect(text).toContain("Workflow Run Status");
      expect(text).toContain("RUNNING");
      expect(text).toContain("Email Campaign");
      expect(text).toContain("Log entries:** 2");
    });

    it("should return error for missing run", async () => {
      mockPrisma.workflowRun.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("workflow_get_status")!;
      const result = await handler({ workspace_slug: "my-ws", run_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
    });
  });

  describe("workflow_list", () => {
    it("should list workflows with versions and run counts", async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([
        {
          id: "wf-1",
          name: "Email Campaign",
          status: "DRAFT",
          _count: { runs: 10 },
          versions: [{ version: 3 }],
          updatedAt: new Date("2025-06-01"),
        },
        {
          id: "wf-2",
          name: "Weekly Report",
          status: "ACTIVE",
          _count: { runs: 52 },
          versions: [{ version: 1 }],
          updatedAt: new Date("2025-05-15"),
        },
      ]);

      const handler = registry.handlers.get("workflow_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Workflows (2)");
      expect(text).toContain("Email Campaign");
      expect(text).toContain("v3");
      expect(text).toContain("Runs: 10");
      expect(text).toContain("Weekly Report");
      expect(text).toContain("Runs: 52");
    });

    it("should handle no workflows", async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("workflow_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No workflows found");
    });
  });

  describe("workflow_get_logs", () => {
    it("should return step execution logs", async () => {
      mockPrisma.workflowRun.findFirst.mockResolvedValue({
        id: "run-1",
        status: "COMPLETED",
        workflow: { name: "Email Campaign" },
        logs: [
          {
            stepId: "s-1",
            stepStatus: "COMPLETED",
            message: "Sent to 100 recipients",
            metadata: null,
            timestamp: new Date("2025-06-01T10:00:05Z"),
          },
          {
            stepId: "s-2",
            stepStatus: "COMPLETED",
            message: "Result logged",
            metadata: null,
            timestamp: new Date("2025-06-01T10:00:06Z"),
          },
        ],
      });

      const handler = registry.handlers.get("workflow_get_logs")!;
      const result = await handler({ workspace_slug: "my-ws", run_id: "run-1" });
      const text = getText(result);
      expect(text).toContain("Execution Logs: Email Campaign");
      expect(text).toContain("COMPLETED");
      expect(text).toContain("Sent to 100 recipients");
      expect(text).toContain("Result logged");
    });

    it("should show error details for failed steps", async () => {
      mockPrisma.workflowRun.findFirst.mockResolvedValue({
        id: "run-2",
        status: "FAILED",
        workflow: { name: "Broken Flow" },
        logs: [
          {
            stepId: "s-1",
            stepStatus: "FAILED",
            message: "Connection timeout",
            metadata: null,
            timestamp: new Date("2025-06-01T10:00:03Z"),
          },
        ],
      });

      const handler = registry.handlers.get("workflow_get_logs")!;
      const result = await handler({ workspace_slug: "my-ws", run_id: "run-2" });
      const text = getText(result);
      expect(text).toContain("FAILED");
      expect(text).toContain("Connection timeout");
    });

    it("should return error for missing run", async () => {
      mockPrisma.workflowRun.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("workflow_get_logs")!;
      const result = await handler({ workspace_slug: "my-ws", run_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("NOT_FOUND");
    });

    it("should handle run with no log entries", async () => {
      mockPrisma.workflowRun.findFirst.mockResolvedValue({
        id: "run-3",
        status: "RUNNING",
        workflow: { name: "New Flow" },
        logs: [],
      });

      const handler = registry.handlers.get("workflow_get_logs")!;
      const result = await handler({ workspace_slug: "my-ws", run_id: "run-3" });
      const text = getText(result);
      expect(text).toContain("No log entries recorded");
    });
  });
});
