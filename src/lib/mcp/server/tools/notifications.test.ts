import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  notification: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  workspaceSettings: { upsert: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerNotificationsTools } from "./notifications";

describe("notifications tools", () => {
  const userId = "test-user-123";
  const wsId = "ws-1";
  const mockWorkspace = { id: wsId, slug: "my-ws", name: "My Workspace" };
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerNotificationsTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
  });

  it("should register 4 notifications tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
    expect(registry.handlers.has("notification_list")).toBe(true);
    expect(registry.handlers.has("notification_mark_read")).toBe(true);
    expect(registry.handlers.has("notification_configure_channels")).toBe(true);
    expect(registry.handlers.has("notification_send")).toBe(true);
  });

  describe("notification_list", () => {
    it("should list notifications", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: "n1", type: "INFO", title: "Welcome", message: "Hello!", read: false, createdAt: new Date("2025-06-01") },
        { id: "n2", type: "ALERT", title: "Warning", message: "Check settings", read: true, createdAt: new Date("2025-06-02") },
      ]);
      const handler = registry.handlers.get("notification_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Notifications (2)");
      expect(text).toContain("Welcome");
      expect(text).toContain("[UNREAD]");
      expect(text).toContain("Warning");
    });

    it("should return message when no notifications found", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("notification_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No notifications found");
    });

    it("should filter unread only", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("notification_list")!;
      await handler({ workspace_slug: "my-ws", unread_only: true });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        }),
      );
    });
  });

  describe("notification_mark_read", () => {
    it("should mark notifications as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      const handler = registry.handlers.get("notification_mark_read")!;
      const result = await handler({
        workspace_slug: "my-ws",
        notification_ids: ["n1", "n2", "n3"],
      });
      const text = getText(result);
      expect(text).toContain("Notifications Updated");
      expect(text).toContain("3");
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["n1", "n2", "n3"] } },
        data: expect.objectContaining({ read: true }),
      });
    });
  });

  describe("notification_configure_channels", () => {
    it("should update notification channel settings", async () => {
      mockPrisma.workspaceSettings.upsert.mockResolvedValue({});
      const handler = registry.handlers.get("notification_configure_channels")!;
      const result = await handler({
        workspace_slug: "my-ws",
        email_enabled: true,
        slack_enabled: false,
        in_app_enabled: true,
      });
      const text = getText(result);
      expect(text).toContain("Notification Channels Updated");
      expect(text).toContain("Email:** true");
      expect(text).toContain("Slack:** false");
      expect(text).toContain("In-App:** true");
      expect(mockPrisma.workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { workspaceId: wsId },
        create: expect.objectContaining({
          workspaceId: wsId,
          emailNotifications: true,
          slackNotifications: false,
          inAppNotifications: true,
        }),
        update: expect.objectContaining({
          emailNotifications: true,
          slackNotifications: false,
          inAppNotifications: true,
        }),
      });
    });

    it("should handle partial channel updates", async () => {
      mockPrisma.workspaceSettings.upsert.mockResolvedValue({});
      const handler = registry.handlers.get("notification_configure_channels")!;
      const result = await handler({
        workspace_slug: "my-ws",
        email_enabled: false,
      });
      const text = getText(result);
      expect(text).toContain("Email:** false");
      expect(text).toContain("Slack:** (unchanged)");
    });
  });

  describe("notification_send", () => {
    it("should create a notification", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "notif-1" });
      const handler = registry.handlers.get("notification_send")!;
      const result = await handler({
        workspace_slug: "my-ws",
        title: "Deployment Complete",
        message: "v2.0 has been deployed",
        priority: "HIGH",
      });
      const text = getText(result);
      expect(text).toContain("Notification Sent");
      expect(text).toContain("notif-1");
      expect(text).toContain("HIGH");
      expect(text).toContain("workspace-wide");
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: wsId,
          userId: null,
          title: "Deployment Complete",
          priority: "HIGH",
          type: "MANUAL",
        }),
      });
    });

    it("should target a specific user when user_id provided", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "notif-2" });
      const handler = registry.handlers.get("notification_send")!;
      const result = await handler({
        workspace_slug: "my-ws",
        title: "Task Assigned",
        message: "You have a new task",
        user_id: "target-user-42",
      });
      const text = getText(result);
      expect(text).toContain("target-user-42");
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "target-user-42" }),
      });
    });
  });
});
