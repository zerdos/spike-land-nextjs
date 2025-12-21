/**
 * GitHub Issues Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Save original env
const originalEnv = { ...process.env };

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("github-issues", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isGitHubAvailable", () => {
    it("should return true when GITHUB_TOKEN is set", async () => {
      process.env.GITHUB_TOKEN = "ghp_test_token";
      const { isGitHubAvailable } = await import("./github-issues");
      expect(isGitHubAvailable()).toBe(true);
    });

    it("should return false when GITHUB_TOKEN is not set", async () => {
      delete process.env.GITHUB_TOKEN;
      const { isGitHubAvailable } = await import("./github-issues");
      expect(isGitHubAvailable()).toBe(false);
    });

    it("should return false when GITHUB_TOKEN is empty string", async () => {
      process.env.GITHUB_TOKEN = "";
      const { isGitHubAvailable } = await import("./github-issues");
      expect(isGitHubAvailable()).toBe(false);
    });
  });

  describe("listIssues", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = "ghp_test_token";
      process.env.GITHUB_OWNER = "test-owner";
      process.env.GITHUB_REPO = "test-repo";
    });

    it("should list issues successfully", async () => {
      const mockApiIssues = [
        {
          number: 123,
          title: "Fix bug",
          state: "open",
          labels: [{ name: "bug" }, { name: "high-priority" }],
          user: { login: "testuser" },
          assignees: [{ login: "dev1" }, { login: "dev2" }],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          html_url: "https://github.com/test-owner/test-repo/issues/123",
          body: "This is a bug description",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiIssues,
      });

      const { listIssues } = await import("./github-issues");
      const result = await listIssues();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        number: 123,
        title: "Fix bug",
        state: "open",
        labels: ["bug", "high-priority"],
        author: "testuser",
        assignees: ["dev1", "dev2"],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        url: "https://github.com/test-owner/test-repo/issues/123",
        body: "This is a bug description",
      });
    });

    it("should include correct authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { listIssues } = await import("./github-issues");
      await listIssues();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer ghp_test_token",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          }),
        }),
      );
    });

    it("should use default values for options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { listIssues } = await import("./github-issues");
      await listIssues();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("state=open"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=20"),
        expect.any(Object),
      );
    });

    it("should filter by state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { listIssues } = await import("./github-issues");
      await listIssues({ state: "closed" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("state=closed"),
        expect.any(Object),
      );
    });

    it("should filter by labels", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { listIssues } = await import("./github-issues");
      await listIssues({ labels: "bug,enhancement" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("labels=bug%2Cenhancement"),
        expect.any(Object),
      );
    });

    it("should respect limit option", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { listIssues } = await import("./github-issues");
      await listIssues({ limit: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=50"),
        expect.any(Object),
      );
    });

    it("should return error when token is not configured", async () => {
      delete process.env.GITHUB_TOKEN;
      vi.resetModules();

      const { listIssues } = await import("./github-issues");
      const result = await listIssues();

      expect(result.data).toBeNull();
      expect(result.error).toBe("GITHUB_TOKEN is not configured");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Rate limit exceeded" }),
      });

      const { listIssues } = await import("./github-issues");
      const result = await listIssues();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Rate limit exceeded");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const { listIssues } = await import("./github-issues");
      const result = await listIssues();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network error: Connection refused");
    });

    it("should use default owner and repo when not configured", async () => {
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
      vi.resetModules();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { listIssues } = await import("./github-issues");
      await listIssues();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/repos/zerdos/spike-land-nextjs/issues"),
        expect.any(Object),
      );
    });
  });

  describe("getWorkflowRuns", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = "ghp_test_token";
      process.env.GITHUB_OWNER = "test-owner";
      process.env.GITHUB_REPO = "test-repo";
    });

    it("should get workflow runs successfully", async () => {
      const mockApiRuns = {
        workflow_runs: [
          {
            id: 1,
            name: "CI",
            status: "completed",
            conclusion: "success",
            head_branch: "main",
            event: "push",
            created_at: "2024-01-01T00:00:00Z",
            html_url: "https://github.com/test-owner/test-repo/actions/runs/1",
          },
          {
            id: 2,
            name: "Deploy",
            status: "in_progress",
            conclusion: null,
            head_branch: "feature",
            event: "pull_request",
            created_at: "2024-01-02T00:00:00Z",
            html_url: "https://github.com/test-owner/test-repo/actions/runs/2",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiRuns,
      });

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({
        id: 1,
        name: "CI",
        status: "completed",
        conclusion: "success",
        branch: "main",
        event: "push",
        createdAt: "2024-01-01T00:00:00Z",
        url: "https://github.com/test-owner/test-repo/actions/runs/1",
      });
    });

    it("should use default limit of 10", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      });

      const { getWorkflowRuns } = await import("./github-issues");
      await getWorkflowRuns();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=10"),
        expect.any(Object),
      );
    });

    it("should respect custom limit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: [] }),
      });

      const { getWorkflowRuns } = await import("./github-issues");
      await getWorkflowRuns({ limit: 25 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=25"),
        expect.any(Object),
      );
    });

    it("should return error when token is not configured", async () => {
      delete process.env.GITHUB_TOKEN;
      vi.resetModules();

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.data).toBeNull();
      expect(result.error).toBe("GITHUB_TOKEN is not configured");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: "Not Found" }),
      });

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Not Found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network error: Timeout");
    });

    it("should handle null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.data).toBeNull();
      expect(result.error).toBe("No response received");
    });

    it("should handle JSON parse errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Unexpected token");
        },
      });

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to parse response: Unexpected token");
    });

    it("should handle API error without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const { getWorkflowRuns } = await import("./github-issues");
      const result = await getWorkflowRuns();

      expect(result.data).toBeNull();
      expect(result.error).toBe("API error: 500");
    });
  });
});
