/**
 * Single Notification API Route Unit Tests
 *
 * Resolves #802
 */

import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/notification-service";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import type { Notification } from "@prisma/client";
import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  NotificationService: {
    getById: vi.fn(),
    markAsRead: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

describe("PATCH /api/orbit/[workspaceSlug]/notifications/[id]", () => {
  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
  };

  const mockNotification: Notification = {
    id: "notif-1",
    workspaceId: mockWorkspace.id,
    userId: "user-1",
    type: "alert",
    title: "Test Notification",
    message: "This is a test",
    priority: "medium",
    read: false,
    readAt: null,
    entityType: null,
    entityId: null,
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workspace.findUnique as Mock).mockResolvedValue(mockWorkspace);
    (requireWorkspacePermission as Mock).mockResolvedValue({
      userId: "user-1",
      role: "ADMIN",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("marks a notification as read", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getById as Mock).mockResolvedValue(mockNotification);
    const readNotification = { ...mockNotification, read: true, readAt: new Date() };
    (NotificationService.markAsRead as Mock).mockResolvedValue(readNotification);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/${mockNotification.id}`,
      { method: "PATCH" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: mockNotification.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.read).toBe(true);
    expect(NotificationService.markAsRead).toHaveBeenCalledWith(mockNotification.id);
  });

  it("returns 401 if user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireWorkspacePermission as Mock).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/notif-1`,
      { method: "PATCH" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: "notif-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 if workspace is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/non-existent/notifications/notif-1`,
      { method: "PATCH" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ workspaceSlug: "non-existent", id: "notif-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });

  it("returns 404 if notification is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getById as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/non-existent`,
      { method: "PATCH" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: "non-existent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Notification not found");
  });

  it("returns 403 if notification belongs to different workspace", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    const differentWorkspaceNotification = {
      ...mockNotification,
      workspaceId: "different-workspace",
    };
    (NotificationService.getById as Mock).mockResolvedValue(
      differentWorkspaceNotification,
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/${mockNotification.id}`,
      { method: "PATCH" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: mockNotification.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Notification does not belong to this workspace");
  });
});

describe("DELETE /api/orbit/[workspaceSlug]/notifications/[id]", () => {
  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
  };

  const mockNotification: Notification = {
    id: "notif-1",
    workspaceId: mockWorkspace.id,
    userId: "user-1",
    type: "alert",
    title: "Test Notification",
    message: "This is a test",
    priority: "medium",
    read: false,
    readAt: null,
    entityType: null,
    entityId: null,
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workspace.findUnique as Mock).mockResolvedValue(mockWorkspace);
    (requireWorkspacePermission as Mock).mockResolvedValue({
      userId: "user-1",
      role: "ADMIN",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("deletes a notification", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getById as Mock).mockResolvedValue(mockNotification);
    (NotificationService.delete as Mock).mockResolvedValue(undefined);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/${mockNotification.id}`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: mockNotification.id }),
    });

    expect(res.status).toBe(204);
    expect(NotificationService.delete).toHaveBeenCalledWith(mockNotification.id);
  });

  it("returns 401 if user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireWorkspacePermission as Mock).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/notif-1`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: "notif-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 if workspace is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/non-existent/notifications/notif-1`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ workspaceSlug: "non-existent", id: "notif-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });

  it("returns 404 if notification is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getById as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/non-existent`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: "non-existent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Notification not found");
  });

  it("returns 403 if notification belongs to different workspace", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    const differentWorkspaceNotification = {
      ...mockNotification,
      workspaceId: "different-workspace",
    };
    (NotificationService.getById as Mock).mockResolvedValue(
      differentWorkspaceNotification,
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/${mockNotification.id}`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug, id: mockNotification.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Notification does not belong to this workspace");
  });
});
