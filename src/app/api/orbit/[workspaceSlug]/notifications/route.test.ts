/**
 * Notifications API Route Unit Tests
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
import { GET, POST } from "./route";

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
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

describe("GET /api/orbit/[workspaceSlug]/notifications", () => {
  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
  };

  const mockNotifications: Notification[] = [
    {
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
    },
  ];

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

  it("returns a list of notifications", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.list as Mock).mockResolvedValue({
      notifications: mockNotifications,
      total: 1,
      limit: 20,
      offset: 0,
    });

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { slug: mockWorkspace.slug },
      select: { id: true },
    });
    expect(requireWorkspacePermission).toHaveBeenCalledWith(
      { user: { id: "user-1" } },
      mockWorkspace.id,
      "notifications:view",
    );
    expect(NotificationService.list).toHaveBeenCalledWith(mockWorkspace.id, {
      limit: undefined,
      offset: undefined,
      unreadOnly: false,
    });
  });

  it("applies pagination parameters", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.list as Mock).mockResolvedValue({
      notifications: mockNotifications,
      total: 50,
      limit: 10,
      offset: 20,
    });

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications?limit=10&offset=20`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(20);
    expect(NotificationService.list).toHaveBeenCalledWith(mockWorkspace.id, {
      limit: 10,
      offset: 20,
      unreadOnly: false,
    });
  });

  it("filters unread notifications", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.list as Mock).mockResolvedValue({
      notifications: mockNotifications,
      total: 1,
      limit: 20,
      offset: 0,
    });

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications?unreadOnly=true`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });

    expect(res.status).toBe(200);
    expect(NotificationService.list).toHaveBeenCalledWith(mockWorkspace.id, {
      limit: undefined,
      offset: undefined,
      unreadOnly: true,
    });
  });

  it("returns 401 if user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireWorkspacePermission as Mock).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });

    expect(res.status).toBe(401);
  });

  it("returns 404 if workspace is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/non-existent/notifications`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "non-existent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });
});

describe("POST /api/orbit/[workspaceSlug]/notifications", () => {
  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
  };

  const mockNotification: Notification = {
    id: "notif-1",
    workspaceId: mockWorkspace.id,
    userId: null,
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

  it("creates a notification", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.create as Mock).mockResolvedValue(mockNotification);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "alert",
          title: "Test Notification",
          message: "This is a test",
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("notif-1");
    expect(NotificationService.create).toHaveBeenCalledWith({
      workspaceId: mockWorkspace.id,
      type: "alert",
      title: "Test Notification",
      message: "This is a test",
    });
  });

  it("creates notification with all optional fields", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.create as Mock).mockResolvedValue(mockNotification);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "alert",
          title: "Test Notification",
          message: "This is a test",
          userId: "user-1",
          priority: "high",
          entityType: "campaign",
          entityId: "campaign-1",
          metadata: { key: "value" },
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });

    expect(res.status).toBe(201);
    expect(NotificationService.create).toHaveBeenCalledWith({
      workspaceId: mockWorkspace.id,
      type: "alert",
      title: "Test Notification",
      message: "This is a test",
      userId: "user-1",
      priority: "high",
      entityType: "campaign",
      entityId: "campaign-1",
      metadata: { key: "value" },
    });
  });

  it("returns 400 for invalid body", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "", // empty type should fail
          title: "Test",
          message: "Test",
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });

    expect(res.status).toBe(400);
  });

  it("returns 401 if user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireWorkspacePermission as Mock).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "alert",
          title: "Test",
          message: "Test",
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });

    expect(res.status).toBe(401);
  });

  it("returns 404 if workspace is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/non-existent/notifications`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "alert",
          title: "Test",
          message: "Test",
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ workspaceSlug: "non-existent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });
});
