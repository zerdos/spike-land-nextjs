import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so mocks are available in vi.mock factories
const bmMocks = vi.hoisted(() => ({
  mockListTasks: vi.fn(),
  mockCreateTask: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockGetKnowledge: vi.fn(),
  mockAddKnowledge: vi.fn(),
  mockListSprints: vi.fn(),
  mockGetCircuitBreakerState: vi.fn().mockReturnValue({ status: "closed", failures: 0 }),
}));

vi.mock("../../clients/bridgemind-client.js", () => ({
  isBridgeMindAvailable: vi.fn(),
  getBridgeMindClient: vi.fn().mockReturnValue({
    listTasks: bmMocks.mockListTasks,
    createTask: bmMocks.mockCreateTask,
    updateTask: bmMocks.mockUpdateTask,
    getKnowledge: bmMocks.mockGetKnowledge,
    addKnowledge: bmMocks.mockAddKnowledge,
    listSprints: bmMocks.mockListSprints,
    getCircuitBreakerState: bmMocks.mockGetCircuitBreakerState,
  }),
}));

const {
  mockListTasks, mockCreateTask, mockUpdateTask,
  mockGetKnowledge, mockAddKnowledge, mockListSprints,
} = bmMocks;

// Mock fetch for GitHub client (still uses raw fetch)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper to create a GraphQL success response for GitHub
function ghSuccess<T>(data: T) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "x-ratelimit-remaining": "4999",
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
    },
  });
}

import { isBridgeMindAvailable } from "../../clients/bridgemind-client.js";
import { getGatewayTools, handleGatewayToolCall, isBoltPaused, isGatewayAvailable } from "./index.js";

const mockedIsBridgeMindAvailable = vi.mocked(isBridgeMindAvailable);

describe("Gateway Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set BridgeMind as available via the mock
    mockedIsBridgeMindAvailable.mockReturnValue(true);
    // Set env vars for GitHub
    vi.stubEnv("GH_PAT_TOKEN", "ghp_test123");
    vi.stubEnv("GITHUB_PROJECT_ID", "PVT_test");
    vi.stubEnv("GITHUB_OWNER", "testowner");
    vi.stubEnv("GITHUB_REPO", "testrepo");
    // Also set BridgeMind env vars (for any direct env checks)
    vi.stubEnv("BRIDGEMIND_MCP_URL", "https://bridgemind.test/mcp");
    vi.stubEnv("BRIDGEMIND_API_KEY", "test-bm-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("isGatewayAvailable", () => {
    it("returns true when BridgeMind or GitHub is available", () => {
      expect(isGatewayAvailable()).toBe(true);
    });

    it("returns true when only BridgeMind is available", () => {
      vi.stubEnv("GH_PAT_TOKEN", "");
      vi.stubEnv("GITHUB_PROJECT_ID", "");
      expect(isGatewayAvailable()).toBe(true);
    });

    it("returns false when neither is available", () => {
      mockedIsBridgeMindAvailable.mockReturnValue(false);
      vi.stubEnv("GH_PAT_TOKEN", "");
      vi.stubEnv("GITHUB_PROJECT_ID", "");
      expect(isGatewayAvailable()).toBe(false);
    });
  });

  describe("getGatewayTools", () => {
    it("returns all tool definitions when both systems configured", () => {
      const tools = getGatewayTools();
      const names = tools.map((t) => t.name);

      // BridgeMind tools
      expect(names).toContain("bridgemind_list_tasks");
      expect(names).toContain("bridgemind_create_task");
      expect(names).toContain("bridgemind_update_task");
      expect(names).toContain("bridgemind_get_knowledge");
      expect(names).toContain("bridgemind_add_knowledge");
      expect(names).toContain("bridgemind_list_sprints");

      // GitHub tools
      expect(names).toContain("github_list_issues");
      expect(names).toContain("github_create_issue");
      expect(names).toContain("github_update_project_item");
      expect(names).toContain("github_get_pr_status");

      // Sync tools
      expect(names).toContain("sync_bridgemind_to_github");
      expect(names).toContain("sync_status");

      // Bolt tools (always present)
      expect(names).toContain("bolt_status");
      expect(names).toContain("bolt_pause");
      expect(names).toContain("bolt_resume");
    });

    it("only returns bolt tools when neither system configured", () => {
      mockedIsBridgeMindAvailable.mockReturnValue(false);
      vi.stubEnv("GH_PAT_TOKEN", "");
      vi.stubEnv("GITHUB_PROJECT_ID", "");

      const tools = getGatewayTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain("bolt_status");
      expect(names).not.toContain("bridgemind_list_tasks");
      expect(names).not.toContain("github_list_issues");
    });

    it("all tools have name, description, and inputSchema", () => {
      const tools = getGatewayTools();
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeTruthy();
        expect(tool.inputSchema.type).toBe("object");
      }
    });
  });

  describe("BridgeMind tool handlers", () => {
    it("bridgemind_list_tasks returns formatted task list", async () => {
      mockListTasks.mockResolvedValueOnce({
        data: [
          { id: "1", title: "Task 1", status: "ready", priority: "high", labels: ["bug"] },
          { id: "2", title: "Task 2", status: "done", priority: "low", labels: [] },
        ],
        error: null,
      });

      const result = await handleGatewayToolCall("bridgemind_list_tasks", { limit: 10 });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Task 1");
      expect(result.content[0].text).toContain("Task 2");
    });

    it("bridgemind_list_tasks handles errors", async () => {
      mockListTasks.mockResolvedValueOnce({
        data: null,
        error: "Connection refused",
      });

      const result = await handleGatewayToolCall("bridgemind_list_tasks", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error");
    });

    it("bridgemind_create_task creates and returns task", async () => {
      mockCreateTask.mockResolvedValueOnce({
        data: { id: "new-1", title: "New Task", status: "backlog" },
        error: null,
      });

      const result = await handleGatewayToolCall("bridgemind_create_task", {
        title: "New Task",
        description: "Details",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Task Created");
    });

    it("bridgemind_update_task updates a task", async () => {
      mockUpdateTask.mockResolvedValueOnce({
        data: { id: "1", status: "done" },
        error: null,
      });

      const result = await handleGatewayToolCall("bridgemind_update_task", {
        task_id: "1",
        status: "done",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Task Updated");
    });

    it("bridgemind_get_knowledge returns results", async () => {
      mockGetKnowledge.mockResolvedValueOnce({
        data: [{ id: "k1", title: "Arch", content: "Details", tags: ["arch"] }],
        error: null,
      });

      const result = await handleGatewayToolCall("bridgemind_get_knowledge", { query: "arch" });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Arch");
    });

    it("bridgemind_add_knowledge adds entry", async () => {
      mockAddKnowledge.mockResolvedValueOnce({
        data: { id: "k2", title: "Patterns" },
        error: null,
      });

      const result = await handleGatewayToolCall("bridgemind_add_knowledge", {
        title: "Patterns",
        content: "Design patterns",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Knowledge Added");
    });

    it("bridgemind_list_sprints returns sprints", async () => {
      mockListSprints.mockResolvedValueOnce({
        data: [{ id: "s1", name: "Sprint 1", status: "active", startDate: "2024-01-01", endDate: "2024-01-14", goals: ["Ship v2"] }],
        error: null,
      });

      const result = await handleGatewayToolCall("bridgemind_list_sprints", {});
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Sprint 1");
    });

    it("returns error when BridgeMind not configured", async () => {
      mockedIsBridgeMindAvailable.mockReturnValue(false);

      const result = await handleGatewayToolCall("bridgemind_list_tasks", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not configured");
    });
  });

  describe("GitHub tool handlers", () => {
    it("github_list_issues returns project items", async () => {
      mockFetch.mockResolvedValueOnce(
        ghSuccess({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: "i1",
                  createdAt: "2024-01-01",
                  updatedAt: "2024-01-01",
                  content: { title: "Issue 1", body: "", number: 42, url: "https://github.com/test/42", labels: { nodes: [{ name: "bug" }] } },
                  fieldValues: { nodes: [{ name: "Ready", field: { name: "Status" } }] },
                },
              ],
            },
          },
        }),
      );

      const result = await handleGatewayToolCall("github_list_issues", {});
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Issue 1");
      expect(result.content[0].text).toContain("#42");
    });

    it("github_create_issue creates an issue", async () => {
      // getRepositoryId
      mockFetch.mockResolvedValueOnce(ghSuccess({ repository: { id: "repo-1" } }));
      // createIssue
      mockFetch.mockResolvedValueOnce(
        ghSuccess({
          createIssue: { issue: { number: 100, id: "issue-100", url: "https://github.com/test/100" } },
        }),
      );

      const result = await handleGatewayToolCall("github_create_issue", {
        title: "Test",
        body: "Body",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("#100");
    });

    it("github_update_project_item updates a field", async () => {
      mockFetch.mockResolvedValueOnce(
        ghSuccess({
          updateProjectV2ItemFieldValue: { projectV2Item: { id: "item-1" } },
        }),
      );

      const result = await handleGatewayToolCall("github_update_project_item", {
        item_id: "item-1",
        field_id: "field-1",
        value: "Done",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("updated successfully");
    });

    it("github_get_pr_status returns PR info", async () => {
      mockFetch.mockResolvedValueOnce(
        ghSuccess({
          repository: {
            issue: {
              timelineItems: {
                nodes: [{
                  subject: {
                    number: 50,
                    state: "OPEN",
                    mergedAt: null,
                    reviewDecision: "APPROVED",
                    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
                  },
                }],
              },
            },
          },
        }),
      );

      const result = await handleGatewayToolCall("github_get_pr_status", { issue_number: 42 });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("#50");
      expect(result.content[0].text).toContain("SUCCESS");
    });

    it("github_get_pr_status handles no linked PR", async () => {
      mockFetch.mockResolvedValueOnce(
        ghSuccess({
          repository: { issue: { timelineItems: { nodes: [] } } },
        }),
      );

      const result = await handleGatewayToolCall("github_get_pr_status", { issue_number: 99 });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("No linked PR found");
    });

    it("returns error when GitHub not configured", async () => {
      vi.stubEnv("GH_PAT_TOKEN", "");
      vi.stubEnv("GITHUB_PROJECT_ID", "");

      const result = await handleGatewayToolCall("github_list_issues", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not configured");
    });
  });

  describe("Sync tool handlers", () => {
    it("sync_bridgemind_to_github dry run shows preview", async () => {
      // BridgeMind listTasks via mocked client
      mockListTasks.mockResolvedValueOnce({
        data: [{ id: "1", title: "BM Task 1", status: "ready", description: "Desc", labels: [] }],
        error: null,
      });
      // GitHub listAllItems (paginated - first page)
      mockFetch.mockResolvedValueOnce(
        ghSuccess({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
          },
        }),
      );

      const result = await handleGatewayToolCall("sync_bridgemind_to_github", { dry_run: true });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Dry Run");
      expect(result.content[0].text).toContain("New tasks to sync: 1");
    });

    it("sync_status returns connection health", async () => {
      const result = await handleGatewayToolCall("sync_status", {});
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("BridgeMind");
      expect(result.content[0].text).toContain("GitHub");
    });

    it("sync returns error when systems not configured", async () => {
      mockedIsBridgeMindAvailable.mockReturnValue(false);

      const result = await handleGatewayToolCall("sync_bridgemind_to_github", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("must be configured");
    });
  });

  describe("Bolt management tools", () => {
    it("bolt_status shows orchestrator status", async () => {
      const result = await handleGatewayToolCall("bolt_status", {});
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Bolt Status");
    });

    it("bolt_pause and bolt_resume toggle state", async () => {
      await handleGatewayToolCall("bolt_pause", {});
      expect(isBoltPaused()).toBe(true);

      const statusWhilePaused = await handleGatewayToolCall("bolt_status", {});
      expect(statusWhilePaused.content[0].text).toContain("PAUSED");

      await handleGatewayToolCall("bolt_resume", {});
      expect(isBoltPaused()).toBe(false);

      const statusAfterResume = await handleGatewayToolCall("bolt_status", {});
      expect(statusAfterResume.content[0].text).toContain("RUNNING");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown tool", async () => {
      const result = await handleGatewayToolCall("unknown_tool", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown gateway tool");
    });

    it("handles Zod validation errors gracefully", async () => {
      const result = await handleGatewayToolCall("bridgemind_create_task", {
        // Missing required fields
      });
      expect(result.isError).toBe(true);
    });

    it("returns error for unknown bridgemind tool", async () => {
      const result = await handleGatewayToolCall("bridgemind_unknown", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown BridgeMind tool");
    });

    it("returns error for unknown github tool", async () => {
      const result = await handleGatewayToolCall("github_unknown", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown GitHub tool");
    });

    it("returns error for unknown sync tool", async () => {
      const result = await handleGatewayToolCall("sync_unknown", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown sync tool");
    });

    it("returns error for unknown bolt tool", async () => {
      const result = await handleGatewayToolCall("bolt_unknown", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown bolt tool");
    });
  });
});
