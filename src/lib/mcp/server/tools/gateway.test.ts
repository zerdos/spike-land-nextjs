import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ========================================
// Hoisted mocks
// ========================================
const {
  mockBridgeMindClient,
  mockGitHubProjectsClient,
  mockIsBridgeMindAvailable,
  mockIsGitHubProjectsAvailable,
  mockSyncBridgeMindToGitHub,
  mockPrisma,
} = vi.hoisted(() => ({
  mockBridgeMindClient: {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getKnowledge: vi.fn(),
    addKnowledge: vi.fn(),
    listSprints: vi.fn(),
    getCircuitBreakerState: vi.fn(),
  },
  mockGitHubProjectsClient: {
    listItems: vi.fn(),
    listAllItems: vi.fn(),
    createIssue: vi.fn(),
    updateItemField: vi.fn(),
    getPRStatus: vi.fn(),
    getRateLimitInfo: vi.fn(),
    addItemToProject: vi.fn(),
  },
  mockIsBridgeMindAvailable: vi.fn(),
  mockIsGitHubProjectsAvailable: vi.fn(),
  mockSyncBridgeMindToGitHub: vi.fn(),
  mockPrisma: {
    syncState: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sync/clients/bridgemind-client", () => ({
  getBridgeMindClient: () => mockBridgeMindClient,
  isBridgeMindAvailable: mockIsBridgeMindAvailable,
}));

vi.mock("@/lib/sync/clients/github-projects-client", () => ({
  isGitHubProjectsAvailable: mockIsGitHubProjectsAvailable,
  GitHubProjectsClient: vi.fn(() => mockGitHubProjectsClient),
}));

vi.mock("@/lib/sync/create-sync-clients", () => ({
  createBridgeMindClient: () => mockBridgeMindClient,
  createGitHubProjectsClient: () => mockGitHubProjectsClient,
}));

vi.mock("@/lib/sync/bridgemind-github-sync", () => ({
  syncBridgeMindToGitHub: mockSyncBridgeMindToGitHub,
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Must import AFTER mocks
import {
  isGatewayAvailable,
  isBoltPaused,
  registerGatewayTools,
  resetBoltState,
} from "./gateway";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolDefinition } from "../tool-registry";

// ========================================
// Test Helpers
// ========================================

/** Extract text from a CallToolResult content array */
function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

class MockToolRegistry {
  tools = new Map<string, ToolDefinition>();

  register(def: ToolDefinition): void {
    this.tools.set(def.name, def);
  }

  getHandler(name: string) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool.handler as (input: Record<string, unknown>) => Promise<CallToolResult> | CallToolResult;
  }
}

// ========================================
// Tests
// ========================================

describe("gateway tools", () => {
  let registry: MockToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new MockToolRegistry();
    resetBoltState();
  });

  afterEach(() => {
    resetBoltState();
  });

  // ---- isGatewayAvailable ----
  describe("isGatewayAvailable", () => {
    it("returns true when BridgeMind is available", () => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(false);
      expect(isGatewayAvailable()).toBe(true);
    });

    it("returns true when GitHub is available", () => {
      mockIsBridgeMindAvailable.mockReturnValue(false);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      expect(isGatewayAvailable()).toBe(true);
    });

    it("returns true when both are available", () => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      expect(isGatewayAvailable()).toBe(true);
    });

    it("returns false when neither is available", () => {
      mockIsBridgeMindAvailable.mockReturnValue(false);
      mockIsGitHubProjectsAvailable.mockReturnValue(false);
      expect(isGatewayAvailable()).toBe(false);
    });
  });

  // ---- isBoltPaused ----
  describe("isBoltPaused", () => {
    it("defaults to false", () => {
      expect(isBoltPaused()).toBe(false);
    });
  });

  // ---- Conditional registration ----
  describe("conditional registration", () => {
    it("registers all 15 tools when both services available", () => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registerGatewayTools(registry as never, "user-1");
      expect(registry.tools.size).toBe(15);
    });

    it("registers 9 tools when only BridgeMind available (6 BM + 3 bolt)", () => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(false);
      registerGatewayTools(registry as never, "user-1");
      expect(registry.tools.size).toBe(9);
      expect(registry.tools.has("bridgemind_list_tasks")).toBe(true);
      expect(registry.tools.has("github_list_issues")).toBe(false);
      expect(registry.tools.has("sync_bridgemind_to_github")).toBe(false);
      expect(registry.tools.has("bolt_status")).toBe(true);
    });

    it("registers 7 tools when only GitHub available (4 GH + 3 bolt)", () => {
      mockIsBridgeMindAvailable.mockReturnValue(false);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registerGatewayTools(registry as never, "user-1");
      expect(registry.tools.size).toBe(7);
      expect(registry.tools.has("bridgemind_list_tasks")).toBe(false);
      expect(registry.tools.has("github_list_issues")).toBe(true);
      expect(registry.tools.has("sync_bridgemind_to_github")).toBe(false);
      expect(registry.tools.has("bolt_status")).toBe(true);
    });

    it("registers only 3 bolt tools when neither service available", () => {
      mockIsBridgeMindAvailable.mockReturnValue(false);
      mockIsGitHubProjectsAvailable.mockReturnValue(false);
      registerGatewayTools(registry as never, "user-1");
      expect(registry.tools.size).toBe(3);
      expect(registry.tools.has("bolt_status")).toBe(true);
      expect(registry.tools.has("bolt_pause")).toBe(true);
      expect(registry.tools.has("bolt_resume")).toBe(true);
    });

    it("all tools have category=gateway and tier=workspace", () => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registerGatewayTools(registry as never, "user-1");
      for (const [, def] of registry.tools) {
        expect(def.category).toBe("gateway");
        expect(def.tier).toBe("workspace");
      }
    });
  });

  // ---- BridgeMind handlers ----
  describe("BridgeMind tools", () => {
    beforeEach(() => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(false);
      registerGatewayTools(registry as never, "user-1");
    });

    it("bridgemind_list_tasks — success", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: [
          {
            id: "t1",
            title: "Task One",
            status: "open",
            priority: "high",
            labels: ["bug"],
          },
        ],
        error: null,
      });

      const handler = registry.getHandler("bridgemind_list_tasks");
      const result = await handler({ limit: 50 });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Task One");
      expect(textOf(result)).toContain("bug");
    });

    it("bridgemind_list_tasks — with filters", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: [],
        error: null,
      });

      const handler = registry.getHandler("bridgemind_list_tasks");
      await handler({ status: "done", sprint_id: "s1", limit: 10 });
      expect(mockBridgeMindClient.listTasks).toHaveBeenCalledWith({
        status: "done",
        sprintId: "s1",
        limit: 10,
      });
    });

    it("bridgemind_list_tasks — error", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: null,
        error: "Connection timeout",
      });

      const handler = registry.getHandler("bridgemind_list_tasks");
      const result = await handler({});
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Connection timeout");
    });

    it("bridgemind_create_task — success", async () => {
      mockBridgeMindClient.createTask.mockResolvedValue({
        data: { id: "t2", title: "New Task", status: "open" },
        error: null,
      });

      const handler = registry.getHandler("bridgemind_create_task");
      const result = await handler({
        title: "New Task",
        description: "Do something",
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Task Created!");
      expect(textOf(result)).toContain("t2");
    });

    it("bridgemind_create_task — error", async () => {
      mockBridgeMindClient.createTask.mockResolvedValue({
        data: null,
        error: "Validation failed",
      });

      const handler = registry.getHandler("bridgemind_create_task");
      const result = await handler({
        title: "X",
        description: "Y",
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Validation failed");
    });

    it("bridgemind_update_task — success", async () => {
      mockBridgeMindClient.updateTask.mockResolvedValue({
        data: { id: "t1", status: "done" },
        error: null,
      });

      const handler = registry.getHandler("bridgemind_update_task");
      const result = await handler({
        task_id: "t1",
        status: "done",
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Task Updated!");
    });

    it("bridgemind_update_task — error", async () => {
      mockBridgeMindClient.updateTask.mockResolvedValue({
        data: null,
        error: "Not found",
      });

      const handler = registry.getHandler("bridgemind_update_task");
      const result = await handler({ task_id: "t99" });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Not found");
    });

    it("bridgemind_get_knowledge — success", async () => {
      mockBridgeMindClient.getKnowledge.mockResolvedValue({
        data: [
          {
            id: "k1",
            title: "React Tips",
            content: "Use hooks",
            tags: ["react"],
          },
        ],
        error: null,
      });

      const handler = registry.getHandler("bridgemind_get_knowledge");
      const result = await handler({ query: "react" });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("React Tips");
      expect(textOf(result)).toContain("react");
    });

    it("bridgemind_get_knowledge — error", async () => {
      mockBridgeMindClient.getKnowledge.mockResolvedValue({
        data: null,
        error: "Search failed",
      });

      const handler = registry.getHandler("bridgemind_get_knowledge");
      const result = await handler({ query: "test" });
      expect(result.isError).toBe(true);
    });

    it("bridgemind_add_knowledge — success", async () => {
      mockBridgeMindClient.addKnowledge.mockResolvedValue({
        data: { id: "k2", title: "New Entry" },
        error: null,
      });

      const handler = registry.getHandler("bridgemind_add_knowledge");
      const result = await handler({
        title: "New Entry",
        content: "Some content",
        tags: ["docs"],
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Knowledge Added!");
    });

    it("bridgemind_add_knowledge — error", async () => {
      mockBridgeMindClient.addKnowledge.mockResolvedValue({
        data: null,
        error: "Storage full",
      });

      const handler = registry.getHandler("bridgemind_add_knowledge");
      const result = await handler({
        title: "X",
        content: "Y",
      });
      expect(result.isError).toBe(true);
    });

    it("bridgemind_list_sprints — success", async () => {
      mockBridgeMindClient.listSprints.mockResolvedValue({
        data: [
          {
            id: "s1",
            name: "Sprint 1",
            status: "active",
            startDate: "2025-01-01",
            endDate: "2025-01-14",
            goals: ["Launch v1"],
          },
        ],
        error: null,
      });

      const handler = registry.getHandler("bridgemind_list_sprints");
      const result = await handler({});
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Sprint 1");
      expect(textOf(result)).toContain("Launch v1");
    });

    it("bridgemind_list_sprints — error", async () => {
      mockBridgeMindClient.listSprints.mockResolvedValue({
        data: null,
        error: "Unavailable",
      });

      const handler = registry.getHandler("bridgemind_list_sprints");
      const result = await handler({});
      expect(result.isError).toBe(true);
    });

    it("bridgemind_list_tasks — empty data returns empty list", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: null,
        error: null,
      });

      const handler = registry.getHandler("bridgemind_list_tasks");
      const result = await handler({});
      expect(textOf(result)).toContain("Tasks (0)");
    });

    it("bridgemind_list_sprints — sprint without goals", async () => {
      mockBridgeMindClient.listSprints.mockResolvedValue({
        data: [
          {
            id: "s2",
            name: "Sprint 2",
            status: "planned",
            startDate: "2025-02-01",
            endDate: "2025-02-14",
          },
        ],
        error: null,
      });

      const handler = registry.getHandler("bridgemind_list_sprints");
      const result = await handler({});
      expect(textOf(result)).toContain("Sprint 2");
      expect(textOf(result)).not.toContain("Goals:");
    });
  });

  // ---- GitHub handlers ----
  describe("GitHub tools", () => {
    beforeEach(() => {
      mockIsBridgeMindAvailable.mockReturnValue(false);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registerGatewayTools(registry as never, "user-1");
    });

    it("github_list_issues — success", async () => {
      mockGitHubProjectsClient.listItems.mockResolvedValue({
        data: {
          items: [
            {
              id: "i1",
              title: "Fix bug",
              status: "open",
              issueNumber: 42,
              labels: ["bug"],
            },
          ],
        },
        error: null,
      });

      const handler = registry.getHandler("github_list_issues");
      const result = await handler({});
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Fix bug");
      expect(textOf(result)).toContain("#42");
    });

    it("github_list_issues — error", async () => {
      mockGitHubProjectsClient.listItems.mockResolvedValue({
        data: null,
        error: "Rate limited",
      });

      const handler = registry.getHandler("github_list_issues");
      const result = await handler({});
      expect(result.isError).toBe(true);
    });

    it("github_list_issues — items without issueNumber or labels", async () => {
      mockGitHubProjectsClient.listItems.mockResolvedValue({
        data: {
          items: [
            {
              id: "i2",
              title: "Draft issue",
              status: "backlog",
              labels: [],
            },
          ],
        },
        error: null,
      });

      const handler = registry.getHandler("github_list_issues");
      const result = await handler({});
      expect(textOf(result)).toContain("Draft issue");
      expect(textOf(result)).not.toContain("#");
    });

    it("github_create_issue — success", async () => {
      mockGitHubProjectsClient.createIssue.mockResolvedValue({
        data: { number: 100, url: "https://github.com/test/100" },
        error: null,
      });

      const handler = registry.getHandler("github_create_issue");
      const result = await handler({
        title: "New Issue",
        body: "Description",
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("#100");
    });

    it("github_create_issue — error", async () => {
      mockGitHubProjectsClient.createIssue.mockResolvedValue({
        data: null,
        error: "Auth failed",
      });

      const handler = registry.getHandler("github_create_issue");
      const result = await handler({
        title: "X",
        body: "Y",
      });
      expect(result.isError).toBe(true);
    });

    it("github_update_project_item — success", async () => {
      mockGitHubProjectsClient.updateItemField.mockResolvedValue({
        data: true,
        error: null,
      });

      const handler = registry.getHandler("github_update_project_item");
      const result = await handler({
        item_id: "item1",
        field_id: "field1",
        value: "Done",
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("updated successfully");
    });

    it("github_update_project_item — error", async () => {
      mockGitHubProjectsClient.updateItemField.mockResolvedValue({
        data: false,
        error: "Not found",
      });

      const handler = registry.getHandler("github_update_project_item");
      const result = await handler({
        item_id: "x",
        field_id: "y",
        value: "z",
      });
      expect(result.isError).toBe(true);
    });

    it("github_get_pr_status — with linked PR", async () => {
      mockGitHubProjectsClient.getPRStatus.mockResolvedValue({
        data: {
          prNumber: 55,
          prState: "OPEN",
          ciStatus: "SUCCESS",
          reviewDecision: "APPROVED",
          mergedAt: null,
        },
        error: null,
      });

      const handler = registry.getHandler("github_get_pr_status");
      const result = await handler({ issue_number: 42 });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("#55");
      expect(textOf(result)).toContain("APPROVED");
    });

    it("github_get_pr_status — no linked PR", async () => {
      mockGitHubProjectsClient.getPRStatus.mockResolvedValue({
        data: { prNumber: null, prState: null },
        error: null,
      });

      const handler = registry.getHandler("github_get_pr_status");
      const result = await handler({ issue_number: 99 });
      expect(textOf(result)).toContain("No linked PR found");
    });

    it("github_get_pr_status — merged PR", async () => {
      mockGitHubProjectsClient.getPRStatus.mockResolvedValue({
        data: {
          prNumber: 60,
          prState: "MERGED",
          ciStatus: "SUCCESS",
          reviewDecision: "APPROVED",
          mergedAt: "2025-01-15T00:00:00Z",
        },
        error: null,
      });

      const handler = registry.getHandler("github_get_pr_status");
      const result = await handler({ issue_number: 50 });
      expect(textOf(result)).toContain("Merged:");
    });

    it("github_get_pr_status — error", async () => {
      mockGitHubProjectsClient.getPRStatus.mockResolvedValue({
        data: null,
        error: "API error",
      });

      const handler = registry.getHandler("github_get_pr_status");
      const result = await handler({ issue_number: 1 });
      expect(result.isError).toBe(true);
    });
  });

  // ---- Sync handlers ----
  describe("Sync tools", () => {
    beforeEach(() => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registerGatewayTools(registry as never, "user-1");
    });

    it("sync_bridgemind_to_github — dry run preview", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: [
          { id: "t1", title: "Task A", status: "open" },
          { id: "t2", title: "Task B", status: "open" },
        ],
        error: null,
      });
      mockGitHubProjectsClient.listAllItems.mockResolvedValue({
        data: [{ title: "Task A" }],
        error: null,
      });

      const handler = registry.getHandler("sync_bridgemind_to_github");
      const result = await handler({ dry_run: true });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Dry Run");
      expect(textOf(result)).toContain("New tasks to sync: 1");
      expect(textOf(result)).toContain("Task B");
    });

    it("sync_bridgemind_to_github — dry run with BridgeMind error", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: null,
        error: "BridgeMind down",
      });

      const handler = registry.getHandler("sync_bridgemind_to_github");
      const result = await handler({ dry_run: true });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("BridgeMind down");
    });

    it("sync_bridgemind_to_github — production sync calls sync engine", async () => {
      mockSyncBridgeMindToGitHub.mockResolvedValue({
        success: true,
        created: 3,
        updated: 1,
        skipped: 5,
        errors: [],
        durationMs: 1500,
      });

      const handler = registry.getHandler("sync_bridgemind_to_github");
      const result = await handler({ dry_run: false });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Created: 3");
      expect(textOf(result)).toContain("Updated: 1");
      expect(textOf(result)).toContain("Skipped: 5");
      expect(mockSyncBridgeMindToGitHub).toHaveBeenCalledOnce();
    });

    it("sync_bridgemind_to_github — production sync failure", async () => {
      mockSyncBridgeMindToGitHub.mockResolvedValue({
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: ["DB connection failed"],
        durationMs: 100,
      });

      const handler = registry.getHandler("sync_bridgemind_to_github");
      const result = await handler({});
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("DB connection failed");
    });

    it("sync_status — with DB sync state", async () => {
      mockBridgeMindClient.getCircuitBreakerState.mockReturnValue({
        status: "closed",
        failures: 0,
      });
      mockGitHubProjectsClient.getRateLimitInfo.mockReturnValue({
        remaining: 4900,
      });
      mockPrisma.syncState.findFirst.mockResolvedValue({
        lastSuccessfulSync: new Date("2025-01-15T00:00:00Z"),
        itemsSynced: 42,
        errorMessage: null,
      });

      const handler = registry.getHandler("sync_status");
      const result = await handler({});
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("healthy");
      expect(textOf(result)).toContain("4900");
      expect(textOf(result)).toContain("Items Synced:** 42");
    });

    it("sync_status — with circuit breaker failures", async () => {
      mockBridgeMindClient.getCircuitBreakerState.mockReturnValue({
        status: "open",
        failures: 3,
      });
      mockGitHubProjectsClient.getRateLimitInfo.mockReturnValue(null);
      mockPrisma.syncState.findFirst.mockResolvedValue(null);

      const handler = registry.getHandler("sync_status");
      const result = await handler({});
      expect(textOf(result)).toContain("open");
      expect(textOf(result)).toContain("3 failures");
    });

    it("sync_status — database unavailable", async () => {
      mockBridgeMindClient.getCircuitBreakerState.mockReturnValue({
        status: "closed",
        failures: 0,
      });
      mockGitHubProjectsClient.getRateLimitInfo.mockReturnValue(null);
      mockPrisma.syncState.findFirst.mockRejectedValue(
        new Error("DB down"),
      );

      const handler = registry.getHandler("sync_status");
      const result = await handler({});
      expect(textOf(result)).toContain("database unavailable");
    });

    it("sync_status — with error message from last sync", async () => {
      mockBridgeMindClient.getCircuitBreakerState.mockReturnValue({
        status: "closed",
        failures: 0,
      });
      mockGitHubProjectsClient.getRateLimitInfo.mockReturnValue(null);
      mockPrisma.syncState.findFirst.mockResolvedValue({
        lastSuccessfulSync: null,
        itemsSynced: 0,
        errorMessage: "Previous sync failed",
      });

      const handler = registry.getHandler("sync_status");
      const result = await handler({});
      expect(textOf(result)).toContain("Previous sync failed");
    });
  });

  // ---- Bolt handlers ----
  describe("Bolt tools", () => {
    beforeEach(() => {
      mockIsBridgeMindAvailable.mockReturnValue(false);
      mockIsGitHubProjectsAvailable.mockReturnValue(false);
      registerGatewayTools(registry as never, "user-1");
    });

    it("bolt_status — running with no services", async () => {
      const handler = registry.getHandler("bolt_status");
      const result = await handler({});
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("RUNNING");
      expect(textOf(result)).toContain("not configured");
    });

    it("bolt_status — paused", async () => {
      // Pause first
      const pauseHandler = registry.getHandler("bolt_pause");
      await pauseHandler({});

      const handler = registry.getHandler("bolt_status");
      const result = await handler({});
      expect(textOf(result)).toContain("PAUSED");
    });

    it("bolt_status — with BridgeMind configured", async () => {
      // Re-register with BridgeMind available
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockBridgeMindClient.getCircuitBreakerState.mockReturnValue({
        status: "closed",
      });
      registry = new MockToolRegistry();
      registerGatewayTools(registry as never, "user-1");

      const handler = registry.getHandler("bolt_status");
      const result = await handler({});
      expect(textOf(result)).toContain("BridgeMind:** closed");
    });

    it("bolt_status — with GitHub configured", async () => {
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registry = new MockToolRegistry();
      registerGatewayTools(registry as never, "user-1");

      const handler = registry.getHandler("bolt_status");
      const result = await handler({});
      expect(textOf(result)).toContain("GitHub Projects:** configured");
    });

    it("bolt_pause — sets paused state", async () => {
      const handler = registry.getHandler("bolt_pause");
      const result = await handler({});
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("paused");
      expect(isBoltPaused()).toBe(true);
    });

    it("bolt_resume — clears paused state", async () => {
      // Pause first
      const pauseHandler = registry.getHandler("bolt_pause");
      await pauseHandler({});
      expect(isBoltPaused()).toBe(true);

      const handler = registry.getHandler("bolt_resume");
      const result = await handler({});
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("resumed");
      expect(isBoltPaused()).toBe(false);
    });
  });

  // ---- Dry run edge cases ----
  describe("sync dry run edge cases", () => {
    beforeEach(() => {
      mockIsBridgeMindAvailable.mockReturnValue(true);
      mockIsGitHubProjectsAvailable.mockReturnValue(true);
      registerGatewayTools(registry as never, "user-1");
    });

    it("dry run with empty data returns zero counts", async () => {
      mockBridgeMindClient.listTasks.mockResolvedValue({
        data: null,
        error: null,
      });
      mockGitHubProjectsClient.listAllItems.mockResolvedValue({
        data: null,
        error: null,
      });

      const handler = registry.getHandler("sync_bridgemind_to_github");
      const result = await handler({ dry_run: true });
      expect(textOf(result)).toContain("BridgeMind tasks: 0");
      expect(textOf(result)).toContain("GitHub items: 0");
      expect(textOf(result)).toContain("New tasks to sync: 0");
    });
  });
});
