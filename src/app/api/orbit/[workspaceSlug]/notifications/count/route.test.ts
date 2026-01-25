/**
 * Notification Count API Route Unit Tests
 *
 * Resolves #802
 */

import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/notification-service";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

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
    getUnreadCount: vi.fn(),
  },
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

describe("GET /api/orbit/[workspaceSlug]/notifications/count", () => {
  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
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

  it("returns unread notification count", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getUnreadCount as Mock).mockResolvedValue(5);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/count`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(5);
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { slug: mockWorkspace.slug },
      select: { id: true },
    });
    expect(requireWorkspacePermission).toHaveBeenCalledWith(
      { user: { id: "user-1" } },
      mockWorkspace.id,
      "notifications:view",
    );
    expect(NotificationService.getUnreadCount).toHaveBeenCalledWith(mockWorkspace.id);
  });

  it("returns zero when no unread notifications", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getUnreadCount as Mock).mockResolvedValue(0);

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/count`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it("returns 401 if user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireWorkspacePermission as Mock).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/count`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });

    expect(res.status).toBe(401);
  });

  it("returns 404 if workspace is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/non-existent/notifications/count`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "non-existent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });

  it("returns 500 on service error", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "user-1" } });
    (NotificationService.getUnreadCount as Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/notifications/count`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Database error");
  });
});
