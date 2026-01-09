/**
 * Tests for Scheduled Posts Service
 * Resolves #571
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      socialAccount: {
        findMany: vi.fn(),
      },
      scheduledPost: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      scheduledPostAccount: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import type { ScheduledPostStatus, SocialPlatform } from "@prisma/client";
import {
  cancelScheduledPost,
  createScheduledPost,
  deleteScheduledPost,
  finalizePostPublishing,
  getCalendarView,
  getDueScheduledPosts,
  getScheduledPost,
  getScheduledPostsStats,
  listScheduledPosts,
  schedulePost,
  updateScheduledPost,
} from "./scheduled-posts";

describe("Scheduled Posts Service", () => {
  const mockWorkspaceId = "workspace-1";
  const mockUserId = "user-1";
  const mockPostId = "post-1";

  const mockAccount = {
    id: "account-1",
    platform: "LINKEDIN" as SocialPlatform,
    accountName: "Test Company",
  };

  const mockPostAccount = {
    id: "pa-1",
    postId: mockPostId,
    accountId: "account-1",
    platformPostId: null,
    publishedAt: null,
    status: "DRAFT" as ScheduledPostStatus,
    errorMessage: null,
    account: {
      platform: "LINKEDIN" as SocialPlatform,
      accountName: "Test Company",
    },
  };

  const mockPost = {
    id: mockPostId,
    content: "Test post content",
    scheduledAt: new Date("2025-01-15T10:00:00Z"),
    timezone: "UTC",
    recurrenceRule: null,
    recurrenceEndAt: null,
    status: "DRAFT" as ScheduledPostStatus,
    metadata: null,
    publishedAt: null,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    lastAttemptAt: null,
    nextOccurrenceAt: null,
    workspaceId: mockWorkspaceId,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    postAccounts: [mockPostAccount],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createScheduledPost", () => {
    it("should create a scheduled post with accounts", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([mockAccount]);
      mockPrisma.scheduledPost.create.mockResolvedValue(mockPost);

      const result = await createScheduledPost(mockWorkspaceId, mockUserId, {
        content: "Test post content",
        scheduledAt: new Date("2025-01-15T10:00:00Z"),
        accountIds: ["account-1"],
      });

      expect(result.id).toBe(mockPostId);
      expect(result.content).toBe("Test post content");
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.platform).toBe("LINKEDIN");

      expect(mockPrisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["account-1"] },
          workspaceId: mockWorkspaceId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          platform: true,
          accountName: true,
        },
      });

      expect(mockPrisma.scheduledPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: "Test post content",
          status: "DRAFT",
          workspaceId: mockWorkspaceId,
          createdById: mockUserId,
        }),
        include: expect.any(Object),
      });
    });

    it("should throw error if accounts are invalid", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([]);

      await expect(
        createScheduledPost(mockWorkspaceId, mockUserId, {
          content: "Test post",
          scheduledAt: new Date(),
          accountIds: ["invalid-account"],
        }),
      ).rejects.toThrow("One or more accounts are invalid or inactive");
    });

    it("should include metadata when provided", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([mockAccount]);
      mockPrisma.scheduledPost.create.mockResolvedValue({
        ...mockPost,
        metadata: { link: "https://example.com" },
      });

      const result = await createScheduledPost(mockWorkspaceId, mockUserId, {
        content: "Check out this link",
        scheduledAt: new Date("2025-01-15T10:00:00Z"),
        accountIds: ["account-1"],
        metadata: { link: "https://example.com" },
      });

      expect(result.metadata).toEqual({ link: "https://example.com" });
    });
  });

  describe("updateScheduledPost", () => {
    it("should update a scheduled post", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "DRAFT",
      });
      mockPrisma.scheduledPost.update.mockResolvedValue({
        ...mockPost,
        content: "Updated content",
      });

      const result = await updateScheduledPost(mockPostId, mockWorkspaceId, {
        content: "Updated content",
      });

      expect(result.content).toBe("Updated content");
      expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith({
        where: { id: mockPostId },
        data: { content: "Updated content" },
        include: expect.any(Object),
      });
    });

    it("should throw error if post not found", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue(null);

      await expect(
        updateScheduledPost(mockPostId, mockWorkspaceId, { content: "test" }),
      ).rejects.toThrow("Scheduled post not found");
    });

    it("should throw error if post belongs to different workspace", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: "other-workspace",
        status: "DRAFT",
      });

      await expect(
        updateScheduledPost(mockPostId, mockWorkspaceId, { content: "test" }),
      ).rejects.toThrow("Scheduled post not found");
    });

    it("should throw error when trying to update published post", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "PUBLISHED",
      });

      await expect(
        updateScheduledPost(mockPostId, mockWorkspaceId, { content: "test" }),
      ).rejects.toThrow("Cannot update a published or publishing post");
    });

    it("should update account associations when accountIds provided", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "DRAFT",
      });
      mockPrisma.socialAccount.findMany.mockResolvedValue([mockAccount]);
      mockPrisma.scheduledPostAccount.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.scheduledPostAccount.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.scheduledPost.update.mockResolvedValue(mockPost);

      await updateScheduledPost(mockPostId, mockWorkspaceId, {
        accountIds: ["account-1"],
      });

      expect(mockPrisma.scheduledPostAccount.deleteMany).toHaveBeenCalledWith({
        where: { postId: mockPostId },
      });
      expect(mockPrisma.scheduledPostAccount.createMany).toHaveBeenCalledWith({
        data: [{ postId: mockPostId, accountId: "account-1", status: "DRAFT" }],
      });
    });
  });

  describe("deleteScheduledPost", () => {
    it("should delete a scheduled post", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "DRAFT",
      });
      mockPrisma.scheduledPost.delete.mockResolvedValue(mockPost);

      await deleteScheduledPost(mockPostId, mockWorkspaceId);

      expect(mockPrisma.scheduledPost.delete).toHaveBeenCalledWith({
        where: { id: mockPostId },
      });
    });

    it("should throw error if post not found", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue(null);

      await expect(
        deleteScheduledPost(mockPostId, mockWorkspaceId),
      ).rejects.toThrow("Scheduled post not found");
    });

    it("should throw error when trying to delete publishing post", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "PUBLISHING",
      });

      await expect(
        deleteScheduledPost(mockPostId, mockWorkspaceId),
      ).rejects.toThrow("Cannot delete a post that is currently publishing");
    });
  });

  describe("getScheduledPost", () => {
    it("should return a scheduled post", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue(mockPost);

      const result = await getScheduledPost(mockPostId, mockWorkspaceId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPostId);
    });

    it("should return null if post not found", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue(null);

      const result = await getScheduledPost(mockPostId, mockWorkspaceId);

      expect(result).toBeNull();
    });

    it("should return null if post belongs to different workspace", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        workspaceId: "other-workspace",
      });

      const result = await getScheduledPost(mockPostId, mockWorkspaceId);

      expect(result).toBeNull();
    });
  });

  describe("listScheduledPosts", () => {
    it("should return paginated list of posts", async () => {
      mockPrisma.scheduledPost.findMany.mockResolvedValue([mockPost]);
      mockPrisma.scheduledPost.count.mockResolvedValue(1);

      const result = await listScheduledPosts({
        workspaceId: mockWorkspaceId,
      });

      expect(result.posts).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should filter by date range", async () => {
      mockPrisma.scheduledPost.findMany.mockResolvedValue([]);
      mockPrisma.scheduledPost.count.mockResolvedValue(0);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      await listScheduledPosts({
        workspaceId: mockWorkspaceId,
        dateRange: { start: startDate, end: endDate },
      });

      expect(mockPrisma.scheduledPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it("should filter by status", async () => {
      mockPrisma.scheduledPost.findMany.mockResolvedValue([]);
      mockPrisma.scheduledPost.count.mockResolvedValue(0);

      await listScheduledPosts({
        workspaceId: mockWorkspaceId,
        status: ["SCHEDULED", "DRAFT"],
      });

      expect(mockPrisma.scheduledPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["SCHEDULED", "DRAFT"] },
          }),
        }),
      );
    });
  });

  describe("getCalendarView", () => {
    it("should return posts for calendar display", async () => {
      mockPrisma.scheduledPost.findMany.mockResolvedValue([mockPost]);

      const dateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-31"),
      };

      const result = await getCalendarView(mockWorkspaceId, dateRange);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]?.id).toBe(mockPostId);
      expect(result.posts[0]?.platforms).toContain("LINKEDIN");
      expect(result.posts[0]?.isRecurring).toBe(false);
      expect(result.dateRange).toEqual(dateRange);
    });

    it("should identify recurring posts", async () => {
      mockPrisma.scheduledPost.findMany.mockResolvedValue([
        { ...mockPost, recurrenceRule: "FREQ=WEEKLY;BYDAY=MO" },
      ]);

      const result = await getCalendarView(mockWorkspaceId, {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-31"),
      });

      expect(result.posts[0]?.isRecurring).toBe(true);
    });
  });

  describe("schedulePost", () => {
    it("should change status from DRAFT to SCHEDULED", async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        scheduledAt: futureDate,
        status: "DRAFT",
      });
      mockPrisma.scheduledPost.update.mockResolvedValue({
        ...mockPost,
        scheduledAt: futureDate,
        status: "SCHEDULED",
        postAccounts: [{ ...mockPostAccount, status: "SCHEDULED" }],
      });

      const result = await schedulePost(mockPostId, mockWorkspaceId);

      expect(result.status).toBe("SCHEDULED");
      expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith({
        where: { id: mockPostId },
        data: expect.objectContaining({
          status: "SCHEDULED",
        }),
        include: expect.any(Object),
      });
    });

    it("should throw if post has no accounts", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        postAccounts: [],
      });

      await expect(schedulePost(mockPostId, mockWorkspaceId)).rejects.toThrow(
        "Post must have at least one target account",
      );
    });

    it("should throw if scheduled time is in the past", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        scheduledAt: new Date("2020-01-01"),
      });

      await expect(schedulePost(mockPostId, mockWorkspaceId)).rejects.toThrow(
        "Scheduled time must be in the future",
      );
    });
  });

  describe("cancelScheduledPost", () => {
    it("should cancel a scheduled post", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "SCHEDULED",
      });
      mockPrisma.scheduledPost.update.mockResolvedValue({
        ...mockPost,
        status: "CANCELLED",
        postAccounts: [{ ...mockPostAccount, status: "CANCELLED" }],
      });

      const result = await cancelScheduledPost(mockPostId, mockWorkspaceId);

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw if post is already published", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        workspaceId: mockWorkspaceId,
        status: "PUBLISHED",
      });

      await expect(
        cancelScheduledPost(mockPostId, mockWorkspaceId),
      ).rejects.toThrow("Cannot cancel a published or publishing post");
    });
  });

  describe("getDueScheduledPosts", () => {
    it("should return posts that are due for publishing", async () => {
      mockPrisma.scheduledPost.findMany.mockResolvedValue([mockPost]);

      const result = await getDueScheduledPosts();

      expect(result).toHaveLength(1);
      expect(mockPrisma.scheduledPost.findMany).toHaveBeenCalledWith({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: expect.any(Date) },
        },
        include: expect.any(Object),
        orderBy: { scheduledAt: "asc" },
        take: 100,
      });
    });
  });

  describe("finalizePostPublishing", () => {
    it("should mark post as PUBLISHED when all accounts succeed", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        postAccounts: [{ ...mockPostAccount, status: "PUBLISHED" }],
      });
      mockPrisma.scheduledPost.update.mockResolvedValue({
        ...mockPost,
        status: "PUBLISHED",
      });

      const result = await finalizePostPublishing(mockPostId);

      expect(result.allSucceeded).toBe(true);
      expect(result.partialSuccess).toBe(false);
    });

    it("should handle partial success", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        postAccounts: [
          { ...mockPostAccount, status: "PUBLISHED" },
          {
            ...mockPostAccount,
            id: "pa-2",
            accountId: "account-2",
            status: "FAILED",
            errorMessage: "API error",
          },
        ],
      });
      mockPrisma.scheduledPost.update.mockResolvedValue({
        ...mockPost,
        status: "PUBLISHED",
      });

      const result = await finalizePostPublishing(mockPostId);

      expect(result.allSucceeded).toBe(false);
      expect(result.partialSuccess).toBe(true);
    });

    it("should mark as FAILED when all accounts fail and retries exhausted", async () => {
      mockPrisma.scheduledPost.findUnique.mockResolvedValue({
        ...mockPost,
        retryCount: 3,
        maxRetries: 3,
        postAccounts: [
          { ...mockPostAccount, status: "FAILED", errorMessage: "API error" },
        ],
      });
      mockPrisma.scheduledPost.update.mockResolvedValue({
        ...mockPost,
        status: "FAILED",
      });

      const result = await finalizePostPublishing(mockPostId);

      expect(result.success).toBe(false);
      expect(result.allSucceeded).toBe(false);
    });
  });

  describe("getScheduledPostsStats", () => {
    it("should return statistics for the workspace", async () => {
      mockPrisma.scheduledPost.count
        .mockResolvedValueOnce(10) // totalScheduled
        .mockResolvedValueOnce(2) // todayCount
        .mockResolvedValueOnce(5) // thisWeekCount
        .mockResolvedValueOnce(1) // failedCount
        .mockResolvedValueOnce(3); // publishedTodayCount

      const result = await getScheduledPostsStats(mockWorkspaceId);

      expect(result.totalScheduled).toBe(10);
      expect(result.todayCount).toBe(2);
      expect(result.thisWeekCount).toBe(5);
      expect(result.failedCount).toBe(1);
      expect(result.publishedTodayCount).toBe(3);
    });
  });
});
