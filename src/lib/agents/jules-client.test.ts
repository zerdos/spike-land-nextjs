/**
 * Jules API Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Save original env
const originalEnv = { ...process.env };

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("jules-client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isJulesAvailable", () => {
    it("should return true when JULES_API_KEY is set", async () => {
      process.env.JULES_API_KEY = "test-api-key";
      const { isJulesAvailable } = await import("./jules-client");
      expect(isJulesAvailable()).toBe(true);
    });

    it("should return false when JULES_API_KEY is not set", async () => {
      delete process.env.JULES_API_KEY;
      const { isJulesAvailable } = await import("./jules-client");
      expect(isJulesAvailable()).toBe(false);
    });

    it("should return false when JULES_API_KEY is empty string", async () => {
      process.env.JULES_API_KEY = "";
      const { isJulesAvailable } = await import("./jules-client");
      expect(isJulesAvailable()).toBe(false);
    });
  });

  describe("listSources", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should list sources successfully", async () => {
      const mockSources = {
        sources: [
          { name: "sources/github/owner/repo1" },
          { name: "sources/github/owner/repo2" },
        ],
        nextPageToken: "token123",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSources,
      });

      const { listSources } = await import("./jules-client");
      const result = await listSources();

      expect(result.data).toEqual(mockSources);
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sources?pageSize=50"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Goog-Api-Key": "test-api-key",
          }),
        }),
      );
    });

    it("should handle pagination parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: [] }),
      });

      const { listSources } = await import("./jules-client");
      await listSources(10, "page-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=10"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pageToken=page-token"),
        expect.any(Object),
      );
    });
  });

  describe("getSource", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should get source by name", async () => {
      const mockSource = { name: "sources/github/owner/repo" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSource,
      });

      const { getSource } = await import("./jules-client");
      const result = await getSource("sources/github/owner/repo");

      expect(result.data).toEqual(mockSource);
      expect(result.error).toBeNull();
    });
  });

  describe("listSessions", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should list sessions successfully", async () => {
      const mockSessions = {
        sessions: [
          { name: "sessions/abc123", state: "COMPLETED" },
          { name: "sessions/def456", state: "IN_PROGRESS" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      const { listSessions } = await import("./jules-client");
      const result = await listSessions();

      expect(result.data).toEqual(mockSessions);
      expect(result.error).toBeNull();
    });

    it("should use default page size of 20", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: [] }),
      });

      const { listSessions } = await import("./jules-client");
      await listSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=20"),
        expect.any(Object),
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: "Internal server error" } }),
      });

      const { listSessions } = await import("./jules-client");
      const result = await listSessions();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Internal server error");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const { listSessions } = await import("./jules-client");
      const result = await listSessions();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Network error: Network failure");
    });
  });

  describe("getSession", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should get session by name", async () => {
      const mockSession = { name: "sessions/abc123", state: "COMPLETED" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const { getSession } = await import("./jules-client");
      const result = await getSession("abc123");

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sessions/abc123"),
        expect.any(Object),
      );
    });

    it("should handle session name with prefix", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: "sessions/abc123" }),
      });

      const { getSession } = await import("./jules-client");
      await getSession("sessions/abc123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sessions/abc123"),
        expect.any(Object),
      );
    });

    it("should reject invalid session ID format", async () => {
      const { getSession } = await import("./jules-client");

      await expect(getSession("../../../etc/passwd")).rejects.toThrow(
        "Invalid session ID format",
      );
    });

    it("should reject session ID with special characters", async () => {
      const { getSession } = await import("./jules-client");

      await expect(getSession("abc/../def")).rejects.toThrow(
        "Invalid session ID format",
      );
    });
  });

  describe("createSession", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should create session successfully", async () => {
      const mockSession = {
        name: "sessions/new123",
        state: "QUEUED",
        title: "Test Task",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const { createSession } = await import("./jules-client");
      const result = await createSession({
        prompt: "Fix the bug in auth",
        sourceContext: {
          source: "sources/github/owner/repo",
          githubRepoContext: { startingBranch: "main" },
        },
        title: "Test Task",
      });

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sessions"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Fix the bug in auth"),
        }),
      );
    });
  });

  describe("approvePlan", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should approve plan successfully", async () => {
      const mockSession = { name: "sessions/abc123", state: "IN_PROGRESS" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const { approvePlan } = await import("./jules-client");
      const result = await approvePlan("abc123");

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sessions/abc123:approvePlan"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should reject invalid session ID", async () => {
      const { approvePlan } = await import("./jules-client");

      await expect(approvePlan("invalid/path")).rejects.toThrow(
        "Invalid session ID format",
      );
    });
  });

  describe("sendMessage", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should send message successfully", async () => {
      const mockSession = { name: "sessions/abc123", state: "IN_PROGRESS" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const { sendMessage } = await import("./jules-client");
      const result = await sendMessage("abc123", "Please also add tests");

      expect(result.data).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sessions/abc123:sendMessage"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Please also add tests"),
        }),
      );
    });

    it("should reject invalid session ID", async () => {
      const { sendMessage } = await import("./jules-client");

      await expect(sendMessage("../invalid", "message")).rejects.toThrow(
        "Invalid session ID format",
      );
    });
  });

  describe("listActivities", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should list activities successfully", async () => {
      const mockActivities = {
        activities: [
          { name: "sessions/abc/activities/1", type: "MESSAGE" },
          { name: "sessions/abc/activities/2", type: "CODE_COMMIT" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivities,
      });

      const { listActivities } = await import("./jules-client");
      const result = await listActivities("abc123");

      expect(result.data).toEqual(mockActivities);
      expect(result.error).toBeNull();
    });

    it("should use default page size of 50", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: [] }),
      });

      const { listActivities } = await import("./jules-client");
      await listActivities("abc123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=50"),
        expect.any(Object),
      );
    });

    it("should reject invalid session ID", async () => {
      const { listActivities } = await import("./jules-client");

      await expect(listActivities("invalid/session")).rejects.toThrow(
        "Invalid session ID format",
      );
    });
  });

  describe("getActivity", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should get activity by name", async () => {
      const mockActivity = {
        name: "sessions/abc/activities/1",
        type: "MESSAGE",
        content: "Working on it",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivity,
      });

      const { getActivity } = await import("./jules-client");
      const result = await getActivity("sessions/abc/activities/1");

      expect(result.data).toEqual(mockActivity);
      expect(result.error).toBeNull();
    });
  });

  describe("buildSourceName", () => {
    it("should build source name from owner and repo", async () => {
      process.env.JULES_API_KEY = "test-api-key";
      const { buildSourceName } = await import("./jules-client");

      expect(buildSourceName("owner", "repo")).toBe("sources/github/owner/repo");
    });
  });

  describe("extractSessionId", () => {
    it("should extract session ID from resource name", async () => {
      process.env.JULES_API_KEY = "test-api-key";
      const { extractSessionId } = await import("./jules-client");

      expect(extractSessionId("sessions/abc123")).toBe("abc123");
    });

    it("should return as-is if no prefix", async () => {
      process.env.JULES_API_KEY = "test-api-key";
      const { extractSessionId } = await import("./jules-client");

      expect(extractSessionId("abc123")).toBe("abc123");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      process.env.JULES_API_KEY = "test-api-key";
    });

    it("should handle missing API key", async () => {
      delete process.env.JULES_API_KEY;
      vi.resetModules();
      const { listSessions } = await import("./jules-client");

      await expect(listSessions()).rejects.toThrow(
        "JULES_API_KEY environment variable is not set",
      );
    });

    it("should handle JSON parse errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const { listSessions } = await import("./jules-client");
      const result = await listSessions();

      expect(result.data).toBeNull();
      expect(result.error).toBe("Failed to parse response: Invalid JSON");
    });

    it("should handle null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { listSessions } = await import("./jules-client");
      const result = await listSessions();

      expect(result.data).toBeNull();
      expect(result.error).toBe("No response received");
    });

    it("should handle API error without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      });

      const { listSessions } = await import("./jules-client");
      const result = await listSessions();

      expect(result.data).toBeNull();
      expect(result.error).toBe("API error: 403");
    });
  });
});
