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
  FacebookClient: vi.fn(),
}));

vi.mock("@/lib/social/clients/instagram", () => ({
  InstagramClient: vi.fn(),
}));

vi.mock("@/lib/social/clients/linkedin", () => ({
  LinkedInClient: vi.fn(),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { PLATFORM_CHARACTER_LIMITS, POST } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  socialAccount: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const MockTwitterClient = TwitterClient as ReturnType<typeof vi.fn>;
const MockFacebookClient = FacebookClient as ReturnType<typeof vi.fn>;

describe("Reply API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("PLATFORM_CHARACTER_LIMITS", () => {
    it("has correct limit for Twitter", () => {
      expect(PLATFORM_CHARACTER_LIMITS.TWITTER).toBe(280);
    });

    it("has correct limit for Facebook", () => {
      expect(PLATFORM_CHARACTER_LIMITS.FACEBOOK).toBe(8000);
    });

    it("has correct limit for Instagram", () => {
      expect(PLATFORM_CHARACTER_LIMITS.INSTAGRAM).toBe(2200);
    });

    it("has correct limit for LinkedIn", () => {
      expect(PLATFORM_CHARACTER_LIMITS.LINKEDIN).toBe(3000);
    });
  });

  describe("POST /api/social/[platform]/posts/[postId]/reply", () => {
    const createRequest = (body: object) =>
      new NextRequest("http://localhost/api/social/twitter/posts/123/reply", {
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
        createRequest({ accountId: "acc-123", content: "Test reply" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid platform", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const response = await POST(
        createRequest({ accountId: "acc-123", content: "Test reply" }),
        createParams("invalid", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid platform");
    });

    it("returns 400 when accountId is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const response = await POST(
        createRequest({ content: "Test reply" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("accountId is required");
    });

    it("returns 400 when content is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const response = await POST(
        createRequest({ accountId: "acc-123" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("content is required");
    });

    it("returns 400 when content exceeds character limit", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const longContent = "a".repeat(281); // Exceeds Twitter's 280 char limit

      const response = await POST(
        createRequest({ accountId: "acc-123", content: longContent }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("exceeds 280 characters");
    });

    it("returns 404 when account is not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue(null);

      const response = await POST(
        createRequest({ accountId: "acc-123", content: "Test reply" }),
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
        createRequest({ accountId: "acc-123", content: "Test reply" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("not active");
    });

    it("successfully replies to a Twitter post", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const mockReplyToPost = vi.fn().mockResolvedValue({
        platformPostId: "reply-456",
        url: "https://twitter.com/user/status/reply-456",
      });
      MockTwitterClient.mockImplementation(function() {
        return { replyToPost: mockReplyToPost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123", content: "Test reply" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.reply).toEqual({
        id: "reply-456",
        url: "https://twitter.com/user/status/reply-456",
      });
      expect(mockReplyToPost).toHaveBeenCalledWith("post-123", "Test reply");
    });

    it("handles token expiration error", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "twitter-123",
      });

      const mockReplyToPost = vi.fn().mockRejectedValue(
        new MockTwitterHttpError("Unauthorized", 401, "Unauthorized"),
      );
      MockTwitterClient.mockImplementation(function() {
        return { replyToPost: mockReplyToPost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123", content: "Test reply" }),
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

      const mockReplyToPost = vi.fn().mockRejectedValue(new Error("API Error"));
      MockTwitterClient.mockImplementation(function() {
        return { replyToPost: mockReplyToPost };
      });

      const response = await POST(
        createRequest({ accountId: "acc-123", content: "Test reply" }),
        createParams("twitter", "post-123"),
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to reply to post");
    });

    it("accepts longer content for Facebook", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-123",
        status: "ACTIVE",
        accessTokenEncrypted: "token",
        accountId: "fb-123",
      });

      const longContent = "a".repeat(500); // More than Twitter's limit but less than Facebook's

      const mockCommentOnPost = vi.fn().mockResolvedValue({ id: "comment-123" });
      MockFacebookClient.mockImplementation(function() {
        return { commentOnPost: mockCommentOnPost };
      });

      const request = new NextRequest(
        "http://localhost/api/social/facebook/posts/123/reply",
        {
          method: "POST",
          body: JSON.stringify({ accountId: "acc-123", content: longContent }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await POST(request, createParams("facebook", "post-123"));

      // Should pass validation (500 < 8000)
      expect(response.status).toBe(200);
    });
  });
});
