import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  TwitterClient: vi.fn().mockImplementation(() => ({
    likePost: vi.fn(),
    unlikePost: vi.fn(),
  })),
  TwitterHttpError: class TwitterHttpError extends Error {
    constructor(
      message: string,
      public status: number,
      public statusText: string,
    ) {
      super(message);
    }
  },
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

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { TwitterClient, TwitterHttpError } from "@/lib/social/clients/twitter";
import { DELETE, POST } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as {
  socialAccount: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

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
      (TwitterClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        likePost: mockLikePost,
      }));

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
        new TwitterHttpError("Unauthorized", 401, "Unauthorized"),
      );
      (TwitterClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        likePost: mockLikePost,
      }));

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
      (TwitterClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        likePost: mockLikePost,
      }));

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to like post");
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
      (TwitterClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        unlikePost: mockUnlikePost,
      }));

      const response = await DELETE(
        createRequest("acc-123"),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockUnlikePost).toHaveBeenCalledWith("post-123");
    });
  });
});
