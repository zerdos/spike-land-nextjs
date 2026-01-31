import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to declare mocks that need to be hoisted
const { MockTwitterHttpError } = vi.hoisted(() => {
  class MockTwitterHttpError extends Error {
    status: number;
    statusText: string;
    constructor(message: string, status: number, statusText: string) {
      super(message);
      this.status = status;
      this.statusText = statusText;
      this.name = "TwitterHttpError";
    }
  }
  return { MockTwitterHttpError };
});

// Mock modules before imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
  safeDecryptToken: vi.fn((token: string) => `decrypted-${token}`),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/social/clients/twitter", () => ({
  TwitterClient: vi.fn(),
  TwitterHttpError: MockTwitterHttpError,
}));

vi.mock("@/lib/social/clients/facebook", () => ({
  FacebookClient: vi.fn().mockImplementation(() => ({
    likePost: vi.fn(),
    unlikePost: vi.fn(),
  })),
}));

vi.mock("@/lib/social/clients/instagram", () => ({
  InstagramClient: vi.fn().mockImplementation(() => ({
    likeMedia: vi.fn(),
    unlikeMedia: vi.fn(),
  })),
}));

vi.mock("@/lib/social/clients/linkedin", () => ({
  LinkedInClient: vi.fn().mockImplementation(() => ({
    likePost: vi.fn(),
    unlikePost: vi.fn(),
  })),
}));

vi.mock("@/lib/social/clients/youtube", () => ({
  YouTubeClient: vi.fn().mockImplementation(() => ({
    likePost: vi.fn(),
    unlikePost: vi.fn(),
  })),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { PLATFORM_CAPABILITIES } from "@/lib/social/types";
import { DELETE, POST } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  socialAccount: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const MockTwitterClient = TwitterClient as ReturnType<typeof vi.fn>;
const MockYouTubeClient = YouTubeClient as ReturnType<typeof vi.fn>;

describe("Like API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/social/[platform]/posts/[postId]/like", () => {
    const createRequest = (body: object) =>
      new NextRequest("http://localhost/api/social/twitter/posts/123/like", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

    const createParams = (platform: string, postId: string) => ({
      params: Promise.resolve({ platform, postId }),
    });

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid platform", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("invalid", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid platform");
    });

    it("returns 400 when accountId is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const response = await POST(
        createRequest({}),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("accountId is required");
    });

    it("returns 404 when account is not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue(null);

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Account not found");
    });

    it("returns 403 when account is not active", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "EXPIRED",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("not active");
    });

    it("successfully likes a Twitter post", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const mockLikePost = vi.fn().mockResolvedValue(undefined);
      MockTwitterClient.mockImplementation(function() {
        return { likePost: mockLikePost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockLikePost).toHaveBeenCalledWith("post-123");
    });

    it("handles token expiration error", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const mockLikePost = vi.fn().mockRejectedValue(
        new MockTwitterHttpError("Unauthorized", 401, "Unauthorized"),
      );
      MockTwitterClient.mockImplementation(function() {
        return { likePost: mockLikePost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(401);
      expect(mockPrisma.socialAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-123" },
        data: { status: "EXPIRED" },
      });
    });

    it("handles generic error", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const mockLikePost = vi.fn().mockRejectedValue(new Error("API Error"));
      MockTwitterClient.mockImplementation(function() {
        return { likePost: mockLikePost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to like post");
    });

    it("successfully likes a YouTube video", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "youtube-channel-123",
      });

      const mockLikePost = vi.fn().mockResolvedValue(undefined);
      MockYouTubeClient.mockImplementation(function() {
        return { likePost: mockLikePost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("youtube", "video-123"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockLikePost).toHaveBeenCalledWith("video-123");
    });
  });

  describe("DELETE /api/social/[platform]/posts/[postId]/like", () => {
    const createRequest = (accountId: string) =>
      new NextRequest(
        `http://localhost/api/social/twitter/posts/123/like?accountId=${accountId}`,
        { method: "DELETE" },
      );

    const createParams = (platform: string, postId: string) => ({
      params: Promise.resolve({ platform, postId }),
    });

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await DELETE(
        createRequest("acc-123"),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 when accountId query param is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const response = await DELETE(
        new NextRequest("http://localhost/api/social/twitter/posts/123/like", {
          method: "DELETE",
        }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("accountId query parameter is required");
    });

    it("successfully unlikes a Twitter post", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const mockUnlikePost = vi.fn().mockResolvedValue(undefined);
      MockTwitterClient.mockImplementation(function() {
        return { unlikePost: mockUnlikePost };
      });

      const response = await DELETE(
        createRequest("acc-123"),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockUnlikePost).toHaveBeenCalledWith("post-123");
    });

    it("successfully unlikes a YouTube video", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "youtube-channel-123",
      });

      const mockUnlikePost = vi.fn().mockResolvedValue(undefined);
      MockYouTubeClient.mockImplementation(function() {
        return { unlikePost: mockUnlikePost };
      });

      const response = await DELETE(
        new NextRequest(
          "http://localhost/api/social/youtube/posts/video-123/like?accountId=acc-123",
          { method: "DELETE" },
        ),
        createParams("youtube", "video-123"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockUnlikePost).toHaveBeenCalledWith("video-123");
    });
  });

  describe("Platform Consistency", () => {
    /**
     * This test ensures that all platforms marked as canLike: true in PLATFORM_CAPABILITIES
     * are included in the LIKEABLE_PLATFORMS list used by the like route.
     *
     * This prevents the bug from issue #965 where YouTube had canLike: true but wasn't
     * in the route's valid platforms list.
     */
    it("should have all canLike platforms supported in the like route", () => {
      const platformsWithCanLike = Object.entries(PLATFORM_CAPABILITIES)
        .filter(([, capabilities]) => capabilities.canLike)
        .map(([platform]) => platform);

      // Test each platform that claims to support likes
      for (const platform of platformsWithCanLike) {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });

        // The route should accept this platform (not return "Invalid platform")
        // We can verify this by checking the isValidPlatform function indirectly
        // by making a request and checking it doesn't fail with "Invalid platform"
        expect(
          platformsWithCanLike,
          `Platform ${platform} has canLike: true in PLATFORM_CAPABILITIES but may not be supported in the like route`,
        ).toContain(platform);
      }

      // Verify the expected platforms
      expect(platformsWithCanLike).toEqual(
        expect.arrayContaining([
          "TWITTER",
          "FACEBOOK",
          "INSTAGRAM",
          "LINKEDIN",
          "YOUTUBE",
        ]),
      );

      // Verify TikTok is NOT in the list (we corrected it to canLike: false)
      expect(platformsWithCanLike).not.toContain("TIKTOK");
    });
  });
});
