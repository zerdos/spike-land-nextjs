/**
 * Notification Service Unit Tests
 *
 * Resolves #802
 */

import prisma from "@/lib/prisma";
import type { Notification } from "@prisma/client";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationService } from "./notification-service";

vi.mock("@/lib/prisma", () => ({
  default: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("NotificationService", () => {
  const mockNotification: Notification = {
    id: "notif-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    type: "alert",
    title: "Test Notification",
    message: "This is a test notification",
    priority: "medium",
    read: false,
    readAt: null,
    entityType: "campaign",
    entityId: "campaign-1",
    metadata: {},
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("create", () => {
    it("creates a notification with all fields", async () => {
      (prisma.notification.create as Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.create({
        workspaceId: "workspace-1",
        userId: "user-1",
        type: "alert",
        title: "Test Notification",
        message: "This is a test notification",
        priority: "medium",
        entityType: "campaign",
        entityId: "campaign-1",
        metadata: {},
      });

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-1",
          userId: "user-1",
          type: "alert",
          title: "Test Notification",
          message: "This is a test notification",
          priority: "medium",
          entityType: "campaign",
          entityId: "campaign-1",
          metadata: {},
          read: false,
        },
      });
    });

    it("creates a notification with default priority", async () => {
      (prisma.notification.create as Mock).mockResolvedValue(mockNotification);

      await NotificationService.create({
        workspaceId: "workspace-1",
        type: "alert",
        title: "Test Notification",
        message: "This is a test notification",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: "medium",
          metadata: {},
        }),
      });
    });

    it("throws error on database failure", async () => {
      const dbError = new Error("Database connection failed");
      (prisma.notification.create as Mock).mockRejectedValue(dbError);

      await expect(
        NotificationService.create({
          workspaceId: "workspace-1",
          type: "alert",
          title: "Test",
          message: "Test",
        }),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("list", () => {
    it("lists notifications with default pagination", async () => {
      (prisma.notification.findMany as Mock).mockResolvedValue([mockNotification]);
      (prisma.notification.count as Mock).mockResolvedValue(1);

      const result = await NotificationService.list("workspace-1");

      expect(result).toEqual({
        notifications: [mockNotification],
        total: 1,
        limit: 20,
        offset: 0,
      });
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1" },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0,
      });
    });

    it("lists notifications with custom pagination", async () => {
      (prisma.notification.findMany as Mock).mockResolvedValue([mockNotification]);
      (prisma.notification.count as Mock).mockResolvedValue(50);

      const result = await NotificationService.list("workspace-1", {
        limit: 10,
        offset: 20,
      });

      expect(result).toEqual({
        notifications: [mockNotification],
        total: 50,
        limit: 10,
        offset: 20,
      });
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1" },
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 20,
      });
    });

    it("filters unread only notifications", async () => {
      (prisma.notification.findMany as Mock).mockResolvedValue([mockNotification]);
      (prisma.notification.count as Mock).mockResolvedValue(1);

      await NotificationService.list("workspace-1", { unreadOnly: true });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1", read: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0,
      });
    });

    it("throws error on findMany failure", async () => {
      const dbError = new Error("Query failed");
      (prisma.notification.findMany as Mock).mockRejectedValue(dbError);
      (prisma.notification.count as Mock).mockResolvedValue(0);

      await expect(NotificationService.list("workspace-1")).rejects.toThrow(
        "Query failed",
      );
    });

    it("throws error on count failure", async () => {
      const dbError = new Error("Count failed");
      (prisma.notification.findMany as Mock).mockResolvedValue([]);
      (prisma.notification.count as Mock).mockRejectedValue(dbError);

      await expect(NotificationService.list("workspace-1")).rejects.toThrow(
        "Count failed",
      );
    });
  });

  describe("getUnreadCount", () => {
    it("returns unread count", async () => {
      (prisma.notification.count as Mock).mockResolvedValue(5);

      const result = await NotificationService.getUnreadCount("workspace-1");

      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1", read: false },
      });
    });

    it("throws error on database failure", async () => {
      const dbError = new Error("Count failed");
      (prisma.notification.count as Mock).mockRejectedValue(dbError);

      await expect(
        NotificationService.getUnreadCount("workspace-1"),
      ).rejects.toThrow("Count failed");
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", async () => {
      const readNotification = { ...mockNotification, read: true, readAt: new Date() };
      (prisma.notification.update as Mock).mockResolvedValue(readNotification);

      const result = await NotificationService.markAsRead("notif-1");

      expect(result.read).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it("throws error on database failure", async () => {
      const dbError = new Error("Update failed");
      (prisma.notification.update as Mock).mockRejectedValue(dbError);

      await expect(NotificationService.markAsRead("notif-1")).rejects.toThrow(
        "Update failed",
      );
    });
  });

  describe("markAllAsRead", () => {
    it("marks all notifications as read for a workspace", async () => {
      (prisma.notification.updateMany as Mock).mockResolvedValue({ count: 5 });

      await NotificationService.markAllAsRead("workspace-1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1", read: false },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it("throws error on database failure", async () => {
      const dbError = new Error("Update failed");
      (prisma.notification.updateMany as Mock).mockRejectedValue(dbError);

      await expect(
        NotificationService.markAllAsRead("workspace-1"),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("delete", () => {
    it("deletes a notification", async () => {
      (prisma.notification.delete as Mock).mockResolvedValue(mockNotification);

      await NotificationService.delete("notif-1");

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: "notif-1" },
      });
    });

    it("throws error on database failure", async () => {
      const dbError = new Error("Delete failed");
      (prisma.notification.delete as Mock).mockRejectedValue(dbError);

      await expect(NotificationService.delete("notif-1")).rejects.toThrow(
        "Delete failed",
      );
    });
  });

  describe("getById", () => {
    it("returns notification by id", async () => {
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.getById("notif-1");

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: "notif-1" },
      });
    });

    it("returns null when notification not found", async () => {
      (prisma.notification.findUnique as Mock).mockResolvedValue(null);

      const result = await NotificationService.getById("non-existent");

      expect(result).toBeNull();
    });

    it("throws error on database failure", async () => {
      const dbError = new Error("Query failed");
      (prisma.notification.findUnique as Mock).mockRejectedValue(dbError);

      await expect(NotificationService.getById("notif-1")).rejects.toThrow(
        "Query failed",
      );
    });
  });
});
