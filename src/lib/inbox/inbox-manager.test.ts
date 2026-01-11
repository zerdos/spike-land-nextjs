/**
 * Inbox Manager Tests
 *
 * Unit tests for inbox management functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma before importing the module under test
vi.mock("@/lib/prisma", () => ({
  default: {
    inboxItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import type { InboxItem } from "@prisma/client";

import prisma from "@/lib/prisma";

import {
  archiveInboxItem,
  assignInboxItem,
  createInboxItem,
  getInboxItem,
  getInboxItemByPlatformId,
  getInboxStats,
  listInboxItems,
  markAsRead,
  markAsUnread,
  markMultipleAsRead,
  updateInboxItem,
  upsertInboxItem,
} from "./inbox-manager";
import type { CreateInboxItemInput } from "./types";

// Helper to create mock inbox item
const createMockInboxItem = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  id: "inbox-1",
  type: "COMMENT",
  status: "UNREAD",
  platform: "TWITTER",
  platformItemId: "tweet-123",
  content: "Great post!",
  senderName: "John Doe",
  senderHandle: "@johndoe",
  senderAvatarUrl: "https://example.com/avatar.jpg",
  originalPostId: "post-123",
  originalPostContent: "Original post content",
  metadata: null,
  receivedAt: new Date("2024-01-15T10:00:00Z"),
  readAt: null,
  repliedAt: null,
  resolvedAt: null,
  workspaceId: "workspace-1",
  accountId: "account-1",
  assignedToId: null,
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:00:00Z"),
  // Smart Routing Fields
  sentiment: null,
  sentimentScore: null,
  priorityScore: null,
  priorityFactors: null,
  routingAnalyzedAt: null,
  routingMetadata: null,
  // Escalation Fields
  escalationStatus: "NONE",
  escalationLevel: 0,
  escalatedAt: null,
  escalatedToId: null,
  slaDeadline: null,
  slaBreach: false,
  ...overrides,
});

describe("Inbox Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createInboxItem", () => {
    it("should create a new inbox item", async () => {
      const input: CreateInboxItemInput = {
        type: "COMMENT",
        platform: "TWITTER",
        platformItemId: "tweet-123",
        content: "Great post!",
        senderName: "John Doe",
        senderHandle: "@johndoe",
        receivedAt: new Date("2024-01-15T10:00:00Z"),
        workspaceId: "workspace-1",
        accountId: "account-1",
      };

      const mockItem = createMockInboxItem();
      vi.mocked(prisma.inboxItem.create).mockResolvedValue(mockItem);

      const result = await createInboxItem(input);

      expect(result).toEqual(mockItem);
      expect(prisma.inboxItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "COMMENT",
          platform: "TWITTER",
          platformItemId: "tweet-123",
          content: "Great post!",
          senderName: "John Doe",
          workspaceId: "workspace-1",
          accountId: "account-1",
        }),
      });
    });

    it("should handle optional fields", async () => {
      const input: CreateInboxItemInput = {
        type: "DIRECT_MESSAGE",
        platform: "INSTAGRAM",
        platformItemId: "dm-456",
        content: "Hello!",
        senderName: "Jane Smith",
        receivedAt: new Date(),
        workspaceId: "workspace-1",
        accountId: "account-1",
        metadata: { source: "mobile" },
      };

      const mockItem = createMockInboxItem({ type: "DIRECT_MESSAGE", platform: "INSTAGRAM" });
      vi.mocked(prisma.inboxItem.create).mockResolvedValue(mockItem);

      await createInboxItem(input);

      expect(prisma.inboxItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { source: "mobile" },
        }),
      });
    });
  });

  describe("getInboxItem", () => {
    it("should retrieve an inbox item with relations", async () => {
      const mockItem = createMockInboxItem();
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(mockItem);

      const result = await getInboxItem("inbox-1");

      expect(result).toEqual(mockItem);
      expect(prisma.inboxItem.findUnique).toHaveBeenCalledWith({
        where: { id: "inbox-1" },
        include: {
          account: true,
          assignedTo: {
            include: { user: true },
          },
          drafts: true,
        },
      });
    });

    it("should return null when not found", async () => {
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(null);

      const result = await getInboxItem("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateInboxItem", () => {
    it("should update inbox item fields", async () => {
      const mockItem = createMockInboxItem({ status: "READ" });
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(mockItem);

      const result = await updateInboxItem("inbox-1", {
        status: "READ",
        readAt: new Date(),
      });

      expect(result.status).toBe("READ");
      expect(prisma.inboxItem.update).toHaveBeenCalledWith({
        where: { id: "inbox-1" },
        data: expect.objectContaining({
          status: "READ",
        }),
      });
    });

    it("should update assignment", async () => {
      const mockItem = createMockInboxItem({ assignedToId: "member-1" });
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(mockItem);

      await updateInboxItem("inbox-1", {
        assignedToId: "member-1",
      });

      expect(prisma.inboxItem.update).toHaveBeenCalledWith({
        where: { id: "inbox-1" },
        data: expect.objectContaining({
          assignedToId: "member-1",
        }),
      });
    });
  });

  describe("archiveInboxItem", () => {
    it("should archive an inbox item", async () => {
      const mockItem = createMockInboxItem({
        status: "ARCHIVED",
        resolvedAt: new Date(),
      });
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(mockItem);

      const result = await archiveInboxItem("inbox-1");

      expect(result.status).toBe("ARCHIVED");
      expect(prisma.inboxItem.update).toHaveBeenCalledWith({
        where: { id: "inbox-1" },
        data: {
          status: "ARCHIVED",
          resolvedAt: expect.any(Date),
        },
      });
    });
  });

  describe("markAsRead", () => {
    it("should mark inbox item as read", async () => {
      const mockItem = createMockInboxItem({
        status: "READ",
        readAt: new Date(),
      });
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(mockItem);

      const result = await markAsRead("inbox-1");

      expect(result.status).toBe("READ");
      expect(prisma.inboxItem.update).toHaveBeenCalledWith({
        where: { id: "inbox-1" },
        data: {
          status: "READ",
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe("markAsUnread", () => {
    it("should mark inbox item as unread", async () => {
      const mockItem = createMockInboxItem({
        status: "UNREAD",
        readAt: null,
      });
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(mockItem);

      const result = await markAsUnread("inbox-1");

      expect(result.status).toBe("UNREAD");
      expect(prisma.inboxItem.update).toHaveBeenCalledWith({
        where: { id: "inbox-1" },
        data: {
          status: "UNREAD",
          readAt: null,
        },
      });
    });
  });

  describe("markMultipleAsRead", () => {
    it("should mark multiple items as read", async () => {
      vi.mocked(prisma.inboxItem.updateMany).mockResolvedValue({ count: 3 });

      const result = await markMultipleAsRead(["inbox-1", "inbox-2", "inbox-3"]);

      expect(result).toBe(3);
      expect(prisma.inboxItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["inbox-1", "inbox-2", "inbox-3"] } },
        data: {
          status: "READ",
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe("assignInboxItem", () => {
    it("should assign inbox item to a team member", async () => {
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(
        createMockInboxItem({ assignedToId: null }),
      );
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(
        createMockInboxItem({ assignedToId: "member-1" }),
      );

      const result = await assignInboxItem("inbox-1", "member-1");

      expect(result.success).toBe(true);
      expect(result.item.assignedToId).toBe("member-1");
      expect(result.previousAssigneeId).toBeNull();
    });

    it("should track previous assignee when reassigning", async () => {
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(
        createMockInboxItem({ assignedToId: "member-1" }),
      );
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(
        createMockInboxItem({ assignedToId: "member-2" }),
      );

      const result = await assignInboxItem("inbox-1", "member-2");

      expect(result.success).toBe(true);
      expect(result.previousAssigneeId).toBe("member-1");
    });

    it("should unassign when assignedToId is null", async () => {
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(
        createMockInboxItem({ assignedToId: "member-1" }),
      );
      vi.mocked(prisma.inboxItem.update).mockResolvedValue(
        createMockInboxItem({ assignedToId: null }),
      );

      const result = await assignInboxItem("inbox-1", null);

      expect(result.success).toBe(true);
      expect(result.item.assignedToId).toBeNull();
    });

    it("should throw error when item not found", async () => {
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(null);

      await expect(assignInboxItem("non-existent", "member-1")).rejects.toThrow(
        "Inbox item with id non-existent not found",
      );
    });
  });

  describe("listInboxItems", () => {
    it("should list inbox items with default pagination", async () => {
      const mockItems = [
        createMockInboxItem({ id: "inbox-1" }),
        createMockInboxItem({ id: "inbox-2" }),
      ];

      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue(mockItems);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(2);

      const result = await listInboxItems({ workspaceId: "workspace-1" });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it("should filter by status", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems({
        workspaceId: "workspace-1",
        status: "UNREAD",
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "UNREAD",
          }),
        }),
      );
    });

    it("should filter by multiple statuses", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems({
        workspaceId: "workspace-1",
        status: ["UNREAD", "PENDING_REPLY"],
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["UNREAD", "PENDING_REPLY"] },
          }),
        }),
      );
    });

    it("should filter by platform", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems({
        workspaceId: "workspace-1",
        platform: "TWITTER",
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform: "TWITTER",
          }),
        }),
      );
    });

    it("should filter by type", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems({
        workspaceId: "workspace-1",
        type: "DIRECT_MESSAGE",
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "DIRECT_MESSAGE",
          }),
        }),
      );
    });

    it("should filter by assigned member", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems({
        workspaceId: "workspace-1",
        assignedToId: "member-1",
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: "member-1",
          }),
        }),
      );
    });

    it("should filter unassigned items", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems({
        workspaceId: "workspace-1",
        assignedToId: null,
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: null,
          }),
        }),
      );
    });

    it("should filter by date range", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      const receivedAfter = new Date("2024-01-01");
      const receivedBefore = new Date("2024-01-31");

      await listInboxItems({
        workspaceId: "workspace-1",
        receivedAfter,
        receivedBefore,
      });

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            receivedAt: {
              gte: receivedAfter,
              lte: receivedBefore,
            },
          }),
        }),
      );
    });

    it("should handle pagination", async () => {
      const mockItems = [createMockInboxItem({ id: "inbox-21" })];
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue(mockItems);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(50);

      const result = await listInboxItems(
        { workspaceId: "workspace-1" },
        { page: 3, limit: 10 },
      );

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it("should handle custom ordering", async () => {
      vi.mocked(prisma.inboxItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inboxItem.count).mockResolvedValue(0);

      await listInboxItems(
        { workspaceId: "workspace-1" },
        { orderBy: "createdAt", orderDirection: "asc" },
      );

      expect(prisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "asc" },
        }),
      );
    });
  });

  describe("getInboxStats", () => {
    it("should return inbox statistics", async () => {
      vi.mocked(prisma.inboxItem.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25) // unread
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(15); // assigned

      vi.mocked(prisma.inboxItem.groupBy)
        .mockResolvedValueOnce([
          { platform: "TWITTER", _count: 50 },
          { platform: "INSTAGRAM", _count: 30 },
          { platform: "FACEBOOK", _count: 20 },
        ] as never)
        .mockResolvedValueOnce([
          { type: "COMMENT", _count: 60 },
          { type: "MENTION", _count: 25 },
          { type: "DIRECT_MESSAGE", _count: 15 },
        ] as never);

      const stats = await getInboxStats("workspace-1");

      expect(stats.total).toBe(100);
      expect(stats.unread).toBe(25);
      expect(stats.pending).toBe(10);
      expect(stats.assigned).toBe(15);
      expect(stats.byPlatform.TWITTER).toBe(50);
      expect(stats.byPlatform.INSTAGRAM).toBe(30);
      expect(stats.byType.COMMENT).toBe(60);
      expect(stats.byType.MENTION).toBe(25);
    });
  });

  describe("getInboxItemByPlatformId", () => {
    it("should find inbox item by platform ID", async () => {
      const mockItem = createMockInboxItem();
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(mockItem);

      const result = await getInboxItemByPlatformId(
        "workspace-1",
        "TWITTER",
        "tweet-123",
      );

      expect(result).toEqual(mockItem);
      expect(prisma.inboxItem.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_platform_platformItemId: {
            workspaceId: "workspace-1",
            platform: "TWITTER",
            platformItemId: "tweet-123",
          },
        },
      });
    });

    it("should return null when not found", async () => {
      vi.mocked(prisma.inboxItem.findUnique).mockResolvedValue(null);

      const result = await getInboxItemByPlatformId(
        "workspace-1",
        "TWITTER",
        "non-existent",
      );

      expect(result).toBeNull();
    });
  });

  describe("upsertInboxItem", () => {
    it("should create new inbox item if not exists", async () => {
      const input: CreateInboxItemInput = {
        type: "COMMENT",
        platform: "TWITTER",
        platformItemId: "tweet-123",
        content: "Great post!",
        senderName: "John Doe",
        receivedAt: new Date(),
        workspaceId: "workspace-1",
        accountId: "account-1",
      };

      const mockItem = createMockInboxItem();
      vi.mocked(prisma.inboxItem.upsert).mockResolvedValue(mockItem);

      const result = await upsertInboxItem(input);

      expect(result).toEqual(mockItem);
      expect(prisma.inboxItem.upsert).toHaveBeenCalledWith({
        where: {
          workspaceId_platform_platformItemId: {
            workspaceId: "workspace-1",
            platform: "TWITTER",
            platformItemId: "tweet-123",
          },
        },
        create: expect.objectContaining({
          type: "COMMENT",
          platform: "TWITTER",
        }),
        update: expect.objectContaining({
          content: "Great post!",
          senderName: "John Doe",
        }),
      });
    });

    it("should update existing inbox item", async () => {
      const input: CreateInboxItemInput = {
        type: "COMMENT",
        platform: "TWITTER",
        platformItemId: "tweet-123",
        content: "Updated content!",
        senderName: "John Doe Updated",
        senderHandle: "@johndoe_new",
        receivedAt: new Date(),
        workspaceId: "workspace-1",
        accountId: "account-1",
      };

      const mockItem = createMockInboxItem({ content: "Updated content!" });
      vi.mocked(prisma.inboxItem.upsert).mockResolvedValue(mockItem);

      const result = await upsertInboxItem(input);

      expect(result.content).toBe("Updated content!");
    });
  });
});
