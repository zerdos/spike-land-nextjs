/**
 * Tests for Social Streams API Route
 */

import type { SocialAccount } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
  },
}));

// Mock token decryption
vi.mock("@/lib/crypto/token-encryption", () => ({
  safeDecryptToken: vi.fn((token: string) => `decrypted_${token}`),
}));

// Mock social client factory
vi.mock("@/lib/social", () => ({
  createSocialClient: vi.fn(),
}));

// Mock workspace middleware
vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspaceMembership: vi.fn().mockResolvedValue({
    workspaceId: "workspace-123",
    userId: "user-123",
    role: "OWNER",
  }),
}));

// Mock token refresh utility
vi.mock("@/lib/social/token-refresh", () => ({
  getValidAccessToken: vi.fn().mockImplementation(async (account: SocialAccount) => ({
    accessToken: `decrypted_${account.accessTokenEncrypted}`,
    wasRefreshed: false,
  })),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { createSocialClient } = await import("@/lib/social");
const { getValidAccessToken } = await import("@/lib/social/token-refresh");

// Import the route after mocks are set up
const { GET, fetchConnectedAccounts, fetchAccountPosts, fetchAllAccountPosts } = await import(
  "./route"
);

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

/**
 * Helper to create a mock SocialAccount
 */
function createMockAccount(
  overrides: Partial<SocialAccount> = {},
): SocialAccount {
  return {
    id: "account-123",
    platform: "TWITTER",
    accountId: "twitter_123",
    accountName: "Test Twitter Account",
    accessTokenEncrypted: "encrypted_token_123",
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
    connectedAt: new Date(),
    status: "ACTIVE",
    metadata: null,
    userId: "user-123",
    workspaceId: "workspace-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create a mock social client
 */
function createMockSocialClient(posts: Array<Record<string, unknown>> = []) {
  return {
    platform: "TWITTER",
    getPosts: vi.fn().mockResolvedValue(posts),
  };
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

  describe("Successful Response with Connected Accounts", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should return empty posts when no accounts are connected", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toEqual([]);
      expect(data.accounts).toEqual([]);
      expect(data.hasMore).toBe(false);
    });

    it("should fetch posts from connected accounts", async () => {
      const mockAccount = createMockAccount();
      const mockPosts = [
        {
          id: "post-1",
          platformPostId: "twitter_post_1",
          platform: "TWITTER",
          content: "Test tweet content",
          publishedAt: new Date("2024-01-15"),
          url: "https://twitter.com/user/status/123",
          metrics: { likes: 100, comments: 10, shares: 5 },
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(1);
      expect(data.accounts.length).toBe(1);
      expect(data.accounts[0].platform).toBe("TWITTER");
    });

    it("should fetch posts from multiple platforms", async () => {
      const twitterAccount = createMockAccount({
        id: "account-twitter",
        platform: "TWITTER",
        accountName: "Twitter Account",
      });
      const facebookAccount = createMockAccount({
        id: "account-facebook",
        platform: "FACEBOOK",
        accountId: "fb_123",
        accountName: "Facebook Account",
      });

      const twitterPosts = [
        {
          id: "tw-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Tweet content",
          publishedAt: new Date("2024-01-15"),
          url: "https://twitter.com/status/1",
        },
      ];
      const facebookPosts = [
        {
          id: "fb-1",
          platformPostId: "facebook_1",
          platform: "FACEBOOK",
          content: "Facebook content",
          publishedAt: new Date("2024-01-14"),
          url: "https://facebook.com/post/1",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        twitterAccount,
        facebookAccount,
      ]);

      vi.mocked(createSocialClient)
        .mockResolvedValueOnce(createMockSocialClient(twitterPosts) as any)
        .mockResolvedValueOnce(createMockSocialClient(facebookPosts) as any);

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(2);
      expect(data.accounts.length).toBe(2);
    });

    it("should filter posts by platform", async () => {
      const twitterAccount = createMockAccount({ platform: "TWITTER" });
      const mockPosts = [
        {
          id: "tw-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Tweet",
          publishedAt: new Date(),
          url: "https://twitter.com/status/1",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        twitterAccount,
      ]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TWITTER",
      });
      const response = await GET(request as any);
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-123",
          status: "ACTIVE",
          platform: { in: ["TWITTER"] },
        },
      });
    });

    it("should handle date range filtering", async () => {
      const mockAccount = createMockAccount();
      const mockPosts = [
        {
          id: "post-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Test tweet",
          publishedAt: new Date("2024-01-10"),
          url: "https://twitter.com/status/1",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Post should be included since it's within range
      expect(data.posts.length).toBe(1);
    });

    it("should handle pagination with cursor", async () => {
      const mockAccount = createMockAccount();
      const mockPosts = Array.from({ length: 5 }, (_, i) => ({
        id: `post-${i}`,
        platformPostId: `twitter_${i}`,
        platform: "TWITTER",
        content: `Tweet ${i}`,
        publishedAt: new Date(Date.now() - i * 3600000),
        url: `https://twitter.com/status/${i}`,
      }));

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      // First page
      const request1 = createMockRequest({
        workspaceId: "workspace-123",
        limit: "2",
      });
      const response1 = await GET(request1 as any);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.posts.length).toBe(2);
      expect(data1.hasMore).toBe(true);
      expect(data1.nextCursor).toBeDefined();
    });

    it("should sort posts by likes descending", async () => {
      const mockAccount = createMockAccount();
      const mockPosts = [
        {
          id: "post-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Low likes",
          publishedAt: new Date(),
          url: "https://twitter.com/status/1",
          metrics: { likes: 10, comments: 0, shares: 0 },
        },
        {
          id: "post-2",
          platformPostId: "twitter_2",
          platform: "TWITTER",
          content: "High likes",
          publishedAt: new Date(),
          url: "https://twitter.com/status/2",
          metrics: { likes: 100, comments: 0, shares: 0 },
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        sortBy: "likes",
        sortOrder: "desc",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts[0].content).toBe("High likes");
      expect(data.posts[1].content).toBe("Low likes");
    });

    it("should filter by search query", async () => {
      const mockAccount = createMockAccount();
      const mockPosts = [
        {
          id: "post-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Hello world tweet",
          publishedAt: new Date(),
          url: "https://twitter.com/status/1",
        },
        {
          id: "post-2",
          platformPostId: "twitter_2",
          platform: "TWITTER",
          content: "Another post",
          publishedAt: new Date(),
          url: "https://twitter.com/status/2",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        searchQuery: "hello",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(1);
      expect(data.posts[0].content).toContain("Hello");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should handle partial failures gracefully", async () => {
      const twitterAccount = createMockAccount({
        id: "account-twitter",
        platform: "TWITTER",
      });
      const facebookAccount = createMockAccount({
        id: "account-facebook",
        platform: "FACEBOOK",
        accountId: "fb_123",
      });

      const twitterPosts = [
        {
          id: "tw-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Tweet",
          publishedAt: new Date(),
          url: "https://twitter.com/status/1",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        twitterAccount,
        facebookAccount,
      ]);

      // Twitter succeeds, Facebook fails
      vi.mocked(createSocialClient)
        .mockResolvedValueOnce(createMockSocialClient(twitterPosts) as any)
        .mockReturnValueOnce({
          platform: "FACEBOOK",
          getPosts: vi.fn().mockRejectedValue(new Error("Facebook API error")),
        } as any);

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(1); // Only Twitter posts
      expect(data.accounts.length).toBe(2); // Both accounts listed
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBe(1);
      expect(data.errors[0].platform).toBe("FACEBOOK");
    });

    it("should return 500 when database query fails", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch social streams");
    });

    it("should handle non-Error rejection in fetch", async () => {
      const mockAccount = createMockAccount();

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue({
        platform: "TWITTER",
        getPosts: vi.fn().mockRejectedValue("String error"),
      } as any);

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toBeDefined();
      expect(data.errors[0].message).toBe("Failed to fetch posts");
    });
  });

  describe("Platform-Specific Client Options", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should pass pageId for Facebook accounts", async () => {
      const facebookAccount = createMockAccount({
        platform: "FACEBOOK",
        accountId: "fb_page_123",
      });

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        facebookAccount,
      ]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const request = createMockRequest({ workspaceId: "workspace-123" });
      await GET(request as any);

      expect(createSocialClient).toHaveBeenCalledWith(
        "FACEBOOK",
        expect.objectContaining({
          pageId: "fb_page_123",
        }),
      );
    });

    it("should pass igUserId for Instagram accounts", async () => {
      const instagramAccount = createMockAccount({
        platform: "INSTAGRAM",
        accountId: "ig_user_123",
      });

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        instagramAccount,
      ]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const request = createMockRequest({ workspaceId: "workspace-123" });
      await GET(request as any);

      expect(createSocialClient).toHaveBeenCalledWith(
        "INSTAGRAM",
        expect.objectContaining({
          igUserId: "ig_user_123",
        }),
      );
    });

    it("should decrypt access token before passing to client", async () => {
      const mockAccount = createMockAccount({
        accessTokenEncrypted: "encrypted_test_token",
      });

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const request = createMockRequest({ workspaceId: "workspace-123" });
      await GET(request as any);

      expect(createSocialClient).toHaveBeenCalledWith(
        "TWITTER",
        expect.objectContaining({
          accessToken: "decrypted_encrypted_test_token",
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as any);
    });

    it("should handle empty platforms list gracefully", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "",
      });
      const response = await GET(request as any);
      await response.json();

      // Empty platforms string means fetch all platforms
      expect(response.status).toBe(200);
    });

    it("should handle platforms with spaces", async () => {
      const mockAccount = createMockAccount();
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: " TWITTER , FACEBOOK ",
      });
      const response = await GET(request as any);

      expect(response.status).toBe(200);
      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-123",
          status: "ACTIVE",
          platform: { in: ["TWITTER", "FACEBOOK"] },
        },
      });
    });

    it("should handle lowercase platform names", async () => {
      const mockAccount = createMockAccount();
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "twitter,facebook",
      });
      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });

    it("should cap limit at 100", async () => {
      const mockAccount = createMockAccount();
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        limit: "999999",
      });
      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });

    it("should handle account with metadata containing avatarUrl", async () => {
      const mockAccount = createMockAccount({
        metadata: { avatarUrl: "https://example.com/avatar.jpg" },
      });
      const mockPosts = [
        {
          id: "post-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Test",
          publishedAt: new Date(),
          url: "https://twitter.com/status/1",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({ workspaceId: "workspace-123" });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts[0].avatarUrl).toBe("https://example.com/avatar.jpg");
    });

    it("should handle TIKTOK platform validation", async () => {
      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "TIKTOK",
      });
      const response = await GET(request as any);

      // TIKTOK is valid platform but not yet implemented
      expect(response.status).toBe(200);
    });

    it("should handle YOUTUBE platform validation", async () => {
      const mockAccount = createMockAccount({
        platform: "YOUTUBE",
        accountName: "Test YouTube Channel",
      });
      const mockPosts = [
        {
          id: "yt-1",
          platformPostId: "youtube_video_1",
          platform: "YOUTUBE",
          content: "Test Video Title",
          publishedAt: new Date(),
          url: "https://www.youtube.com/watch?v=abc123",
        },
      ];

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const request = createMockRequest({
        workspaceId: "workspace-123",
        platforms: "YOUTUBE",
      });
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts.length).toBe(1);
      expect(data.accounts[0].platform).toBe("YOUTUBE");
    });

    it("should handle startDate only filter", async () => {
      const mockAccount = createMockAccount();
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString();
      const request = createMockRequest({
        workspaceId: "workspace-123",
        startDate,
      });
      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });

    it("should handle endDate only filter", async () => {
      const mockAccount = createMockAccount();
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount]);
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const endDate = new Date().toISOString();
      const request = createMockRequest({
        workspaceId: "workspace-123",
        endDate,
      });
      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });
  });
});

describe("Exported Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConnectedAccounts", () => {
    it("should query accounts with workspaceId and ACTIVE status", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      await fetchConnectedAccounts("workspace-123");

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-123",
          status: "ACTIVE",
        },
      });
    });

    it("should filter by platforms when provided", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      await fetchConnectedAccounts("workspace-123", ["TWITTER", "FACEBOOK"]);

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-123",
          status: "ACTIVE",
          platform: { in: ["TWITTER", "FACEBOOK"] },
        },
      });
    });

    it("should not filter by platforms when empty array", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      await fetchConnectedAccounts("workspace-123", []);

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-123",
          status: "ACTIVE",
        },
      });
    });
  });

  describe("fetchAccountPosts", () => {
    it("should use token refresh and create client with correct options", async () => {
      const mockAccount = createMockAccount();
      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      await fetchAccountPosts(mockAccount, 10);

      expect(getValidAccessToken).toHaveBeenCalledWith(mockAccount);
      expect(createSocialClient).toHaveBeenCalledWith("TWITTER", {
        accessToken: "decrypted_encrypted_token_123",
        accountId: "twitter_123",
      });
    });

    it("should return posts and context", async () => {
      const mockAccount = createMockAccount();
      const mockPosts = [
        {
          id: "post-1",
          platformPostId: "twitter_1",
          platform: "TWITTER",
          content: "Test",
          publishedAt: new Date(),
          url: "https://twitter.com/status/1",
        },
      ];

      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient(mockPosts) as any,
      );

      const result = await fetchAccountPosts(mockAccount, 10);

      expect(result.posts).toEqual(mockPosts);
      expect(result.context.accountId).toBe("account-123");
      expect(result.context.accountName).toBe("Test Twitter Account");
      expect(result.context.platform).toBe("TWITTER");
    });
  });

  describe("fetchAllAccountPosts", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("should fetch posts from all accounts in parallel", async () => {
      const account1 = createMockAccount({ id: "acc-1" });
      const account2 = createMockAccount({ id: "acc-2" });

      vi.mocked(createSocialClient).mockResolvedValue(
        createMockSocialClient([]) as any,
      );

      const result = await fetchAllAccountPosts([account1, account2], 10);

      expect(result.accounts.length).toBe(2);
      expect(result.postsWithContext.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("should handle mixed success and failure", async () => {
      const account1 = createMockAccount({ id: "acc-1" });
      const account2 = createMockAccount({ id: "acc-2" });

      vi.mocked(createSocialClient)
        .mockResolvedValueOnce(createMockSocialClient([]) as any)
        .mockReturnValueOnce({
          platform: "TWITTER",
          getPosts: vi.fn().mockRejectedValue(new Error("API Error")),
        } as any);

      const result = await fetchAllAccountPosts([account1, account2], 10);

      expect(result.accounts.length).toBe(2);
      expect(result.postsWithContext.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]?.accountId).toBe("acc-2");
    });
  });
});
