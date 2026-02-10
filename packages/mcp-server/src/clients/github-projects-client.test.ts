import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubProjectsClient, isGitHubProjectsAvailable } from "./github-projects-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function graphqlSuccess<T>(data: T) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "x-ratelimit-remaining": "4999",
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
    },
  });
}

function graphqlError(message: string) {
  return new Response(JSON.stringify({ errors: [{ message }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GitHubProjectsClient", () => {
  let client: GitHubProjectsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubProjectsClient({
      token: "ghp_test123",
      owner: "testowner",
      repo: "testrepo",
      projectId: "PVT_test123",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isAvailable", () => {
    it("returns true when token and projectId are set", () => {
      expect(client.isAvailable()).toBe(true);
    });

    it("returns false when token is missing", () => {
      const noToken = new GitHubProjectsClient({ token: "", projectId: "x" });
      expect(noToken.isAvailable()).toBe(false);
    });

    it("returns false when projectId is missing", () => {
      const noProject = new GitHubProjectsClient({ token: "x", projectId: "" });
      expect(noProject.isAvailable()).toBe(false);
    });
  });

  describe("listItems", () => {
    it("returns project items with field values", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: "item-1",
                  createdAt: "2024-01-01",
                  updatedAt: "2024-01-02",
                  content: {
                    title: "Test Issue",
                    body: "Description",
                    number: 42,
                    url: "https://github.com/test/42",
                    labels: { nodes: [{ name: "bug" }] },
                  },
                  fieldValues: {
                    nodes: [
                      { name: "Ready", field: { name: "Status" } },
                      { text: "High", field: { name: "Priority" } },
                    ],
                  },
                },
              ],
            },
          },
        }),
      );

      const result = await client.listItems({ first: 10 });
      expect(result.error).toBeNull();
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].title).toBe("Test Issue");
      expect(result.data?.items[0].issueNumber).toBe(42);
      expect(result.data?.items[0].status).toBe("Ready");
      expect(result.data?.items[0].fieldValues.Priority).toBe("High");
      expect(result.data?.items[0].labels).toEqual(["bug"]);
      expect(result.data?.hasNextPage).toBe(false);
    });

    it("handles pagination with cursor", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          node: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: "cursor123" },
              nodes: [],
            },
          },
        }),
      );

      const result = await client.listItems({ first: 10, after: "prev-cursor" });
      expect(result.data?.hasNextPage).toBe(true);
      expect(result.data?.endCursor).toBe("cursor123");

      // Verify cursor was included in query
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toContain("prev-cursor");
    });

    it("returns error on GraphQL error", async () => {
      mockFetch.mockResolvedValueOnce(graphqlError("Not authorized"));

      const result = await client.listItems();
      expect(result.error).toContain("Not authorized");
      expect(result.data).toBeNull();
    });
  });

  describe("listAllItems", () => {
    it("auto-paginates through all pages", async () => {
      mockFetch
        .mockResolvedValueOnce(
          graphqlSuccess({
            node: {
              items: {
                pageInfo: { hasNextPage: true, endCursor: "cursor1" },
                nodes: [
                  {
                    id: "item-1",
                    createdAt: "2024-01-01",
                    updatedAt: "2024-01-01",
                    content: { title: "Item 1", body: "" },
                    fieldValues: { nodes: [] },
                  },
                ],
              },
            },
          }),
        )
        .mockResolvedValueOnce(
          graphqlSuccess({
            node: {
              items: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    id: "item-2",
                    createdAt: "2024-01-01",
                    updatedAt: "2024-01-01",
                    content: { title: "Item 2", body: "" },
                    fieldValues: { nodes: [] },
                  },
                ],
              },
            },
          }),
        );

      const result = await client.listAllItems();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].title).toBe("Item 1");
      expect(result.data?.[1].title).toBe("Item 2");
    });
  });

  describe("createIssue", () => {
    it("creates an issue and returns it", async () => {
      // Mock getRepositoryId
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({ repository: { id: "repo-123" } }),
      );
      // Mock getLabelIds
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          repository: {
            labels: {
              nodes: [
                { id: "label-1", name: "bug" },
                { id: "label-2", name: "enhancement" },
              ],
            },
          },
        }),
      );
      // Mock createIssue
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          createIssue: {
            issue: { number: 100, id: "issue-100", url: "https://github.com/test/100" },
          },
        }),
      );

      const result = await client.createIssue({
        title: "Test Issue",
        body: "Body text",
        labels: ["bug"],
      });

      expect(result.error).toBeNull();
      expect(result.data?.number).toBe(100);
      expect(result.data?.url).toContain("100");
    });

    it("creates issue without labels", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({ repository: { id: "repo-123" } }),
      );
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          createIssue: {
            issue: { number: 101, id: "issue-101", url: "https://github.com/test/101" },
          },
        }),
      );

      const result = await client.createIssue({
        title: "No Labels",
        body: "Body",
      });

      expect(result.error).toBeNull();
      expect(result.data?.number).toBe(101);
    });

    it("returns error when repository lookup fails", async () => {
      mockFetch.mockResolvedValueOnce(graphqlError("Repo not found"));

      const result = await client.createIssue({
        title: "Test",
        body: "Body",
      });

      expect(result.error).toContain("Repo not found");
    });
  });

  describe("addItemToProject", () => {
    it("adds an issue to the project", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          addProjectV2ItemById: { item: { id: "proj-item-1" } },
        }),
      );

      const result = await client.addItemToProject("issue-100");
      expect(result.error).toBeNull();
      expect(result.data?.itemId).toBe("proj-item-1");
    });
  });

  describe("updateItemField", () => {
    it("updates a field value on a project item", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          updateProjectV2ItemFieldValue: { projectV2Item: { id: "item-1" } },
        }),
      );

      const result = await client.updateItemField("item-1", "field-1", { text: "Done" });
      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });

    it("returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(graphqlError("Field not found"));

      const result = await client.updateItemField("item-1", "bad-field", { text: "x" });
      expect(result.error).toContain("Field not found");
      expect(result.data).toBe(false);
    });
  });

  describe("getProjectFields", () => {
    it("returns project fields with options", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          node: {
            fields: {
              nodes: [
                { id: "f1", name: "Status", dataType: "SINGLE_SELECT", options: [{ id: "o1", name: "Ready" }] },
                { id: "f2", name: "Title", dataType: "TEXT" },
              ],
            },
          },
        }),
      );

      const result = await client.getProjectFields();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].name).toBe("Status");
      expect(result.data?.[0].options).toHaveLength(1);
    });
  });

  describe("getPRStatus", () => {
    it("returns PR status for an issue", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          repository: {
            issue: {
              timelineItems: {
                nodes: [
                  {
                    subject: {
                      number: 50,
                      state: "OPEN",
                      mergedAt: null,
                      reviewDecision: "APPROVED",
                      commits: {
                        nodes: [
                          { commit: { statusCheckRollup: { state: "SUCCESS" } } },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
      );

      const result = await client.getPRStatus(42);
      expect(result.error).toBeNull();
      expect(result.data?.prNumber).toBe(50);
      expect(result.data?.prState).toBe("OPEN");
      expect(result.data?.ciStatus).toBe("SUCCESS");
      expect(result.data?.reviewDecision).toBe("APPROVED");
    });

    it("returns null PR when no linked PR", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          repository: {
            issue: { timelineItems: { nodes: [] } },
          },
        }),
      );

      const result = await client.getPRStatus(42);
      expect(result.data?.prNumber).toBeNull();
      expect(result.data?.ciStatus).toBeNull();
    });
  });

  describe("rate limiting", () => {
    it("tracks rate limit from response headers", async () => {
      mockFetch.mockResolvedValueOnce(
        graphqlSuccess({
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
          },
        }),
      );

      await client.listItems();
      const rateInfo = client.getRateLimitInfo();
      expect(rateInfo?.remaining).toBe(4999);
    });

    it("returns null rate info before first request", () => {
      expect(client.getRateLimitInfo()).toBeNull();
    });
  });

  describe("error handling", () => {
    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("DNS resolution failed"));

      const result = await client.listItems();
      expect(result.error).toContain("DNS resolution failed");
    });

    it("handles HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

      const result = await client.listItems();
      expect(result.error).toContain("401");
    });
  });
});

describe("isGitHubProjectsAvailable", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when env vars are not set", () => {
    vi.stubEnv("GH_PAT_TOKEN", "");
    vi.stubEnv("GITHUB_PROJECT_ID", "");
    expect(isGitHubProjectsAvailable()).toBe(false);
  });

  it("returns true when both env vars are set", () => {
    vi.stubEnv("GH_PAT_TOKEN", "ghp_test");
    vi.stubEnv("GITHUB_PROJECT_ID", "PVT_test");
    expect(isGitHubProjectsAvailable()).toBe(true);
  });
});
