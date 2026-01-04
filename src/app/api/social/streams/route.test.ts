/**
 * Tests for Social Streams API Route
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const { auth } = await import("@/auth");

/**
 * Helper to create a mock NextRequest with query parameters
 */
function createMockRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/social/streams");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    nextUrl: url,
    url: url.toString(),
  } as unknown as Request;
}

describe("GET /api/social/streams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 if session has no user ID", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {},
      } as any);

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth error"));

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Query Parameter Validation", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should return 400 if workspaceId is missing", async () => {
      const request = createMockRequest({});
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("workspaceId query parameter is required");
    });

    it("should return 400 for invalid platform", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER,INVALID_PLATFORM",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid platform(s): INVALID_PLATFORM");
    });

    it("should return 400 for invalid limit (non-number)", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "abc",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("limit must be a positive integer");
    });

    it("should return 400 for invalid limit (zero)", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "0",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("limit must be a positive integer");
    });

    it("should return 400 for invalid limit (negative)", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "-5",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("limit must be a positive integer");
    });

    it("should return 400 for invalid sortBy", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        sortBy: "invalidSort",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid sortBy value");
    });

    it("should return 400 for invalid sortOrder", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        sortOrder: "random",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid sortOrder value");
    });

    it("should return 400 for invalid startDate", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        startDate: "not-a-date",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("startDate must be a valid ISO date string");
    });

    it("should return 400 for invalid endDate", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        endDate: "invalid-date",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("endDate must be a valid ISO date string");
    });
  });

  describe("Successful Response", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should return posts with default parameters", async () => {
      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toBeDefined();
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.accounts).toBeDefined();
      expect(Array.isArray(data.accounts)).toBe(true);
      expect(typeof data.hasMore).toBe("boolean");
    });

    it("should return posts for specific platform", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.every((p: any) => p.platform === "TWITTER")).toBe(true);
      expect(data.accounts.every((a: any) => a.platform === "TWITTER")).toBe(true);
    });

    it("should return posts for multiple platforms", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER,FACEBOOK",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const platforms = new Set(data.posts.map((p: any) => p.platform));
      expect(platforms.has("TWITTER")).toBe(true);
      expect(platforms.has("FACEBOOK")).toBe(true);
      expect(platforms.has("INSTAGRAM")).toBe(false);
    });

    it("should respect limit parameter", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "5",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBeLessThanOrEqual(5);
    });

    it("should cap limit at 100", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "200",
        platforms: "TWITTER,FACEBOOK,INSTAGRAM,LINKEDIN",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // With 4 platforms * 5 posts = 20 total posts, all should be returned
      // But if there were more, it would be capped at 100
      expect(data.posts.length).toBeLessThanOrEqual(100);
    });

    it("should sort by publishedAt descending by default", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const dates = data.posts.map((p: any) => new Date(p.publishedAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it("should sort by publishedAt ascending when specified", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        sortOrder: "asc",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const dates = data.posts.map((p: any) => new Date(p.publishedAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeLessThanOrEqual(dates[i]);
      }
    });

    it("should sort by likes when specified", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        sortBy: "likes",
        sortOrder: "desc",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const likes = data.posts.map((p: any) => p.metrics?.likes || 0);
      for (let i = 1; i < likes.length; i++) {
        expect(likes[i - 1]).toBeGreaterThanOrEqual(likes[i]);
      }
    });

    it("should sort by comments when specified", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        sortBy: "comments",
        sortOrder: "asc",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const comments = data.posts.map((p: any) => p.metrics?.comments || 0);
      for (let i = 1; i < comments.length; i++) {
        expect(comments[i - 1]).toBeLessThanOrEqual(comments[i]);
      }
    });

    it("should sort by engagementRate when specified", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        sortBy: "engagementRate",
        sortOrder: "desc",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const rates = data.posts.map((p: any) => p.metrics?.engagementRate || 0);
      for (let i = 1; i < rates.length; i++) {
        expect(rates[i - 1]).toBeGreaterThanOrEqual(rates[i]);
      }
    });

    it("should filter by search query", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        searchQuery: "Sample",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // All mock posts contain "Sample" in content
      expect(data.posts.length).toBeGreaterThan(0);
    });

    it("should filter by search query (case insensitive)", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        searchQuery: "SAMPLE",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-matching search query", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        searchQuery: "xyz123nonexistent",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toEqual([]);
    });

    it("should handle date range filtering with valid dates", async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = now.toISOString();

      const request = createMockRequest({
        workspaceId: "workspace-123",
        startDate,
        endDate,
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Posts should be within the date range
      data.posts.forEach((post: any) => {
        const postDate = new Date(post.publishedAt);
        expect(postDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(postDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it("should handle pagination with cursor", async () => {
      // First page
      const request1 = createMockRequest({
        workspaceId: "workspace-123",
        limit: "5",
      });
      const response1 = await GET(request1 as any);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.posts.length).toBeLessThanOrEqual(5);

      if (data1.hasMore && data1.nextCursor) {
        // Second page
        const request2 = createMockRequest({
          workspaceId: "workspace-123",
          limit: "5",
          cursor: data1.nextCursor,
        });
        const response2 = await GET(request2 as any);
        const data2 = await response2.json();

        expect(response2.status).toBe(200);
        // Posts should be different
        const page1Ids = new Set(data1.posts.map((p: any) => p.id));
        data2.posts.forEach((post: any) => {
          expect(page1Ids.has(post.id)).toBe(false);
        });
      }
    });

    it("should handle invalid cursor gracefully", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        cursor: "invalid-cursor",
      });
      const response = await GET(request as any);
      const data = await response.json();

      // Should start from beginning if cursor is invalid
      expect(response.status).toBe(200);
      expect(data.posts).toBeDefined();
    });
  });

  describe("Response Format", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should return correct StreamsResponse structure", async () => {
      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("posts");
      expect(data).toHaveProperty("accounts");
      expect(data).toHaveProperty("hasMore");
      // nextCursor is optional
      expect(["string", "undefined"]).toContain(typeof data.nextCursor);
    });

    it("should return posts with correct StreamPost structure", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        limit: "1",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBeGreaterThan(0);

      const post = data.posts[0];
      expect(post).toHaveProperty("id");
      expect(post).toHaveProperty("platformPostId");
      expect(post).toHaveProperty("platform");
      expect(post).toHaveProperty("content");
      expect(post).toHaveProperty("publishedAt");
      expect(post).toHaveProperty("url");
      expect(post).toHaveProperty("accountId");
      expect(post).toHaveProperty("accountName");
      expect(post).toHaveProperty("canLike");
      expect(post).toHaveProperty("canReply");
      expect(post).toHaveProperty("canShare");
      expect(post).toHaveProperty("metrics");
    });

    it("should return metrics with correct structure", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "1",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const metrics = data.posts[0].metrics;

      expect(metrics).toHaveProperty("likes");
      expect(metrics).toHaveProperty("comments");
      expect(metrics).toHaveProperty("shares");
      expect(metrics).toHaveProperty("impressions");
      expect(metrics).toHaveProperty("engagementRate");
      expect(typeof metrics.likes).toBe("number");
      expect(typeof metrics.comments).toBe("number");
      expect(typeof metrics.shares).toBe("number");
    });

    it("should return accounts with correct structure", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts.length).toBeGreaterThan(0);

      const account = data.accounts[0];
      expect(account).toHaveProperty("id");
      expect(account).toHaveProperty("platform");
      expect(account).toHaveProperty("accountName");
      expect(account.platform).toBe("TWITTER");
    });

    it("should set correct platform capabilities for Twitter", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        limit: "1",
      });
      const response = await GET(request as any);
      const data = await response.json();

      const post = data.posts[0];
      expect(post.canLike).toBe(true);
      expect(post.canReply).toBe(true);
      expect(post.canShare).toBe(true);
    });

    it("should set correct platform capabilities for Facebook", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "FACEBOOK",
        limit: "1",
      });
      const response = await GET(request as any);
      const data = await response.json();

      const post = data.posts[0];
      expect(post.canLike).toBe(true);
      expect(post.canReply).toBe(true);
      expect(post.canShare).toBe(false);
    });

    it("should set correct platform capabilities for Instagram", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "INSTAGRAM",
        limit: "1",
      });
      const response = await GET(request as any);
      const data = await response.json();

      const post = data.posts[0];
      expect(post.canLike).toBe(true);
      expect(post.canReply).toBe(true);
      expect(post.canShare).toBe(false);
    });

    it("should set correct platform capabilities for LinkedIn", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "LINKEDIN",
        limit: "1",
      });
      const response = await GET(request as any);
      const data = await response.json();

      const post = data.posts[0];
      expect(post.canLike).toBe(true);
      expect(post.canReply).toBe(true);
      expect(post.canShare).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should handle empty platforms list gracefully", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "",
      });
      const response = await GET(request as any);
      const data = await response.json();

      // Empty platforms string is falsy, so it falls back to default platforms
      expect(response.status).toBe(200);
      expect(data.posts.length).toBeGreaterThan(0);
    });

    it("should handle platforms with spaces", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: " TWITTER , FACEBOOK ",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const platforms = new Set(data.posts.map((p: any) => p.platform));
      expect(platforms.has("TWITTER")).toBe(true);
      expect(platforms.has("FACEBOOK")).toBe(true);
    });

    it("should handle lowercase platform names", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "twitter,facebook",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      const platforms = new Set(data.posts.map((p: any) => p.platform));
      expect(platforms.has("TWITTER")).toBe(true);
      expect(platforms.has("FACEBOOK")).toBe(true);
    });

    it("should handle very large limit values", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "999999",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should be capped at 100
      expect(data.posts.length).toBeLessThanOrEqual(100);
    });

    it("should handle startDate only filter", async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const request = createMockRequest({
        workspaceId: "workspace-123",
        startDate,
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.posts.forEach((post: any) => {
        expect(new Date(post.publishedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(startDate).getTime(),
        );
      });
    });

    it("should handle endDate only filter", async () => {
      const endDate = new Date().toISOString();
      const request = createMockRequest({
        workspaceId: "workspace-123",
        endDate,
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.posts.forEach((post: any) => {
        expect(new Date(post.publishedAt).getTime()).toBeLessThanOrEqual(
          new Date(endDate).getTime(),
        );
      });
    });

    it("should handle TIKTOK platform (not fully implemented)", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TIKTOK",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // TIKTOK has limited capabilities
      if (data.posts.length > 0) {
        const post = data.posts[0];
        expect(post.canLike).toBe(false);
        expect(post.canReply).toBe(false);
        expect(post.canShare).toBe(false);
      }
    });

    it("should handle search by account name", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        searchQuery: "Twitter Account",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should find posts by the Twitter account
      expect(data.posts.length).toBeGreaterThan(0);
    });

    it("should return hasMore false when all posts fit in one page", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
        limit: "100",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // With only 5 mock posts for Twitter and limit 100, hasMore should be false
      expect(data.hasMore).toBe(false);
      expect(data.nextCursor).toBeUndefined();
    });

    it("should return hasMore true when more posts are available", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "2",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // With default platforms and only 2 limit, there should be more
      if (data.posts.length === 2) {
        expect(data.hasMore).toBe(true);
        expect(data.nextCursor).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should return 500 when an unexpected error occurs", async () => {
      // Mock PLATFORM_CAPABILITIES to throw when accessed
      const originalModule = await import("@/lib/social/types");
      const originalCapabilities = originalModule.PLATFORM_CAPABILITIES;

      // Temporarily replace PLATFORM_CAPABILITIES with a proxy that throws
      Object.defineProperty(originalModule, "PLATFORM_CAPABILITIES", {
        get: () => {
          throw new Error("Simulated error");
        },
        configurable: true,
      });

      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch social streams");
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch social streams:",
        expect.any(Error),
      );

      // Restore original
      Object.defineProperty(originalModule, "PLATFORM_CAPABILITIES", {
        value: originalCapabilities,
        configurable: true,
        writable: true,
      });
    });
  });
});
