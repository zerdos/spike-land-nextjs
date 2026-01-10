/**
 * Publishing Service Tests
 *
 * Unit tests for the calendar publishing service.
 * Part of #576: Implement Calendar publishing
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/crypto/token-encryption", () => ({
  safeDecryptToken: vi.fn((token: string) => `decrypted-${token}`),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/social", () => ({
  createSocialClient: vi.fn(),
}));

vi.mock("./scheduled-posts", () => ({
  getDueScheduledPosts: vi.fn(),
  markPostPublishing: vi.fn(),
  recordAccountPublishResult: vi.fn(),
  finalizePostPublishing: vi.fn(),
}));

import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { createSocialClient } from "@/lib/social";
import {
  finalizePostPublishing,
  getDueScheduledPosts,
  markPostPublishing,
  recordAccountPublishResult,
} from "./scheduled-posts";

import { processScheduledPosts, publishScheduledPost } from "./publishing-service";

describe("Publishing Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publishScheduledPost", () => {
    it("should publish to all accounts and finalize", async () => {
      // Mock account fetch
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "account-1",
        platform: "LINKEDIN" as SocialPlatform,
        accessTokenEncrypted: "encrypted-token",
        metadata: null,
      } as never);

      // Mock social client
      const mockCreatePost = vi.fn().mockResolvedValue({
        platformPostId: "post-123",
        url: "https://linkedin.com/post/123",
        publishedAt: new Date(),
      });

      vi.mocked(createSocialClient).mockReturnValue({
        platform: "LINKEDIN" as SocialPlatform,
        createPost: mockCreatePost,
        getAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        getAccountInfo: vi.fn(),
        getPosts: vi.fn(),
        getMetrics: vi.fn(),
      });

      // Mock publishing functions
      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: true,
        results: [
          {
            accountId: "account-1",
            platform: "LINKEDIN" as SocialPlatform,
            success: true,
            platformPostId: "post-123",
          },
        ],
        allSucceeded: true,
        partialSuccess: false,
      });

      const result = await publishScheduledPost(
        "post-1",
        "Test content",
        [{ accountId: "account-1", platform: "LINKEDIN" as SocialPlatform }],
        null,
      );

      expect(markPostPublishing).toHaveBeenCalledWith("post-1");
      expect(safeDecryptToken).toHaveBeenCalledWith("encrypted-token");
      expect(createSocialClient).toHaveBeenCalledWith("LINKEDIN", {
        accessToken: "decrypted-encrypted-token",
        pageId: undefined,
        igUserId: undefined,
      });
      expect(mockCreatePost).toHaveBeenCalledWith("Test content", {});
      expect(recordAccountPublishResult).toHaveBeenCalled();
      expect(finalizePostPublishing).toHaveBeenCalledWith("post-1");
      expect(result.success).toBe(true);
      expect(result.allSucceeded).toBe(true);
    });

    it("should handle account not found", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue(null);
      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: false,
        results: [
          {
            accountId: "account-1",
            platform: "LINKEDIN" as SocialPlatform,
            success: false,
            error: "Account not found or access token missing",
          },
        ],
        allSucceeded: false,
        partialSuccess: false,
      });

      const result = await publishScheduledPost(
        "post-1",
        "Test content",
        [{ accountId: "account-1", platform: "LINKEDIN" as SocialPlatform }],
        null,
      );

      expect(recordAccountPublishResult).toHaveBeenCalledWith(
        "post-1",
        "account-1",
        expect.objectContaining({
          success: false,
          error: "Account not found or access token missing",
        }),
      );
      expect(result.success).toBe(false);
    });

    it("should handle social client error", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "account-1",
        platform: "TWITTER" as SocialPlatform,
        accessTokenEncrypted: "encrypted-token",
        metadata: null,
      } as never);

      const mockCreatePost = vi.fn().mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      vi.mocked(createSocialClient).mockReturnValue({
        platform: "TWITTER" as SocialPlatform,
        createPost: mockCreatePost,
        getAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        getAccountInfo: vi.fn(),
        getPosts: vi.fn(),
        getMetrics: vi.fn(),
      });

      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: false,
        results: [
          {
            accountId: "account-1",
            platform: "TWITTER" as SocialPlatform,
            success: false,
            error: "API rate limit exceeded",
          },
        ],
        allSucceeded: false,
        partialSuccess: false,
      });

      const result = await publishScheduledPost(
        "post-1",
        "Test content",
        [{ accountId: "account-1", platform: "TWITTER" as SocialPlatform }],
        null,
      );

      expect(recordAccountPublishResult).toHaveBeenCalledWith(
        "post-1",
        "account-1",
        expect.objectContaining({
          success: false,
          error: "API rate limit exceeded",
        }),
      );
      expect(result.success).toBe(false);
    });

    it("should use platform-specific content from metadata", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "account-1",
        platform: "TWITTER" as SocialPlatform,
        accessTokenEncrypted: "encrypted-token",
        metadata: null,
      } as never);

      const mockCreatePost = vi.fn().mockResolvedValue({
        platformPostId: "tweet-123",
        url: "https://twitter.com/status/123",
        publishedAt: new Date(),
      });

      vi.mocked(createSocialClient).mockReturnValue({
        platform: "TWITTER" as SocialPlatform,
        createPost: mockCreatePost,
        getAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        getAccountInfo: vi.fn(),
        getPosts: vi.fn(),
        getMetrics: vi.fn(),
      });

      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: true,
        results: [],
        allSucceeded: true,
        partialSuccess: false,
      });

      await publishScheduledPost(
        "post-1",
        "Default content",
        [{ accountId: "account-1", platform: "TWITTER" as SocialPlatform }],
        {
          platformOverrides: {
            TWITTER: {
              content: "Twitter-specific content #hashtag",
            },
          },
        },
      );

      expect(mockCreatePost).toHaveBeenCalledWith(
        "Twitter-specific content #hashtag",
        {},
      );
    });

    it("should pass media URLs from metadata", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "account-1",
        platform: "LINKEDIN" as SocialPlatform,
        accessTokenEncrypted: "encrypted-token",
        metadata: null,
      } as never);

      const mockCreatePost = vi.fn().mockResolvedValue({
        platformPostId: "post-123",
        url: "https://linkedin.com/post/123",
        publishedAt: new Date(),
      });

      vi.mocked(createSocialClient).mockReturnValue({
        platform: "LINKEDIN" as SocialPlatform,
        createPost: mockCreatePost,
        getAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        getAccountInfo: vi.fn(),
        getPosts: vi.fn(),
        getMetrics: vi.fn(),
      });

      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: true,
        results: [],
        allSucceeded: true,
        partialSuccess: false,
      });

      await publishScheduledPost(
        "post-1",
        "Content with media",
        [{ accountId: "account-1", platform: "LINKEDIN" as SocialPlatform }],
        {
          mediaUrls: ["https://example.com/image.jpg"],
        },
      );

      expect(mockCreatePost).toHaveBeenCalledWith("Content with media", {
        mediaUrls: ["https://example.com/image.jpg"],
      });
    });
  });

  describe("processScheduledPosts", () => {
    it("should return empty result when no posts are due", async () => {
      vi.mocked(getDueScheduledPosts).mockResolvedValue([]);

      const result = await processScheduledPosts();

      expect(result.processedCount).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should process multiple due posts", async () => {
      const mockPosts = [
        {
          id: "post-1",
          content: "Post 1 content",
          scheduledAt: new Date(),
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          status: "SCHEDULED" as const,
          metadata: null,
          publishedAt: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          workspaceId: "ws-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          accounts: [
            {
              id: "spa-1",
              accountId: "account-1",
              platform: "LINKEDIN" as SocialPlatform,
              accountName: "Test Account",
              platformPostId: null,
              publishedAt: null,
              status: "SCHEDULED" as const,
              errorMessage: null,
            },
          ],
        },
        {
          id: "post-2",
          content: "Post 2 content",
          scheduledAt: new Date(),
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          status: "SCHEDULED" as const,
          metadata: null,
          publishedAt: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          workspaceId: "ws-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          accounts: [
            {
              id: "spa-2",
              accountId: "account-2",
              platform: "TWITTER" as SocialPlatform,
              accountName: "Twitter Account",
              platformPostId: null,
              publishedAt: null,
              status: "SCHEDULED" as const,
              errorMessage: null,
            },
          ],
        },
      ];

      vi.mocked(getDueScheduledPosts).mockResolvedValue(mockPosts);

      // Mock successful publishing for both
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "account-1",
        platform: "LINKEDIN" as SocialPlatform,
        accessTokenEncrypted: "encrypted-token",
        metadata: null,
      } as never);

      vi.mocked(createSocialClient).mockReturnValue({
        platform: "LINKEDIN" as SocialPlatform,
        createPost: vi.fn().mockResolvedValue({
          platformPostId: "post-id",
          url: "https://example.com/post",
          publishedAt: new Date(),
        }),
        getAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        getAccountInfo: vi.fn(),
        getPosts: vi.fn(),
        getMetrics: vi.fn(),
      });

      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: true,
        results: [],
        allSucceeded: true,
        partialSuccess: false,
      });

      const result = await processScheduledPosts();

      expect(result.processedCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(getDueScheduledPosts).toHaveBeenCalledWith(50);
    });

    it("should handle errors during processing", async () => {
      const mockPosts = [
        {
          id: "post-1",
          content: "Post 1 content",
          scheduledAt: new Date(),
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          status: "SCHEDULED" as const,
          metadata: null,
          publishedAt: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          workspaceId: "ws-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          accounts: [
            {
              id: "spa-1",
              accountId: "account-1",
              platform: "LINKEDIN" as SocialPlatform,
              accountName: "Test Account",
              platformPostId: null,
              publishedAt: null,
              status: "SCHEDULED" as const,
              errorMessage: null,
            },
          ],
        },
      ];

      vi.mocked(getDueScheduledPosts).mockResolvedValue(mockPosts);
      vi.mocked(markPostPublishing).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await processScheduledPosts();

      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe("Database connection failed");
    });

    it("should count partial success correctly", async () => {
      const mockPosts = [
        {
          id: "post-1",
          content: "Multi-platform post",
          scheduledAt: new Date(),
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          status: "SCHEDULED" as const,
          metadata: null,
          publishedAt: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          workspaceId: "ws-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          accounts: [
            {
              id: "spa-1",
              accountId: "account-1",
              platform: "LINKEDIN" as SocialPlatform,
              accountName: "LinkedIn Account",
              platformPostId: null,
              publishedAt: null,
              status: "SCHEDULED" as const,
              errorMessage: null,
            },
            {
              id: "spa-2",
              accountId: "account-2",
              platform: "TWITTER" as SocialPlatform,
              accountName: "Twitter Account",
              platformPostId: null,
              publishedAt: null,
              status: "SCHEDULED" as const,
              errorMessage: null,
            },
          ],
        },
      ];

      vi.mocked(getDueScheduledPosts).mockResolvedValue(mockPosts);
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "account-1",
        platform: "LINKEDIN" as SocialPlatform,
        accessTokenEncrypted: "encrypted-token",
        metadata: null,
      } as never);

      vi.mocked(createSocialClient).mockReturnValue({
        platform: "LINKEDIN" as SocialPlatform,
        createPost: vi.fn().mockResolvedValue({
          platformPostId: "post-id",
          url: "https://example.com/post",
          publishedAt: new Date(),
        }),
        getAuthUrl: vi.fn(),
        exchangeCodeForTokens: vi.fn(),
        getAccountInfo: vi.fn(),
        getPosts: vi.fn(),
        getMetrics: vi.fn(),
      });

      vi.mocked(markPostPublishing).mockResolvedValue(undefined);
      vi.mocked(recordAccountPublishResult).mockResolvedValue(undefined);
      vi.mocked(finalizePostPublishing).mockResolvedValue({
        postId: "post-1",
        success: true,
        results: [
          {
            accountId: "account-1",
            platform: "LINKEDIN" as SocialPlatform,
            success: true,
            platformPostId: "li-123",
          },
          {
            accountId: "account-2",
            platform: "TWITTER" as SocialPlatform,
            success: false,
            error: "Rate limited",
          },
        ],
        allSucceeded: false,
        partialSuccess: true,
      });

      const result = await processScheduledPosts();

      expect(result.processedCount).toBe(1);
      expect(result.partialSuccessCount).toBe(1);
      expect(result.successCount).toBe(0);
    });
  });
});
