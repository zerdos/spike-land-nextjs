import { auth } from "@/auth";
import { listInboxItems } from "@/lib/inbox/inbox-manager";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { InboxItemStatus, SocialPlatform } from "@prisma/client";
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

vi.mock("@/lib/inbox/inbox-manager", () => ({
  listInboxItems: vi.fn(),
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspacePermission: vi.fn(),
}));

describe("GET /api/orbit/[workspaceSlug]/inbox", () => {
  const mockWorkspace = {
    id: "workspace-1",
    slug: "test-workspace",
  };

  const mockInboxItems = [
    {
      id: "item-1",
      workspaceId: mockWorkspace.id,
      type: "MENTION",
      platform: SocialPlatform.TWITTER,
      status: InboxItemStatus.UNREAD,
      content: "test",
      platformItemId: "1",
      receivedAt: new Date(),
      senderName: "test",
      accountId: "1",
    },
    {
      id: "item-2",
      workspaceId: mockWorkspace.id,
      type: "MENTION",
      platform: SocialPlatform.FACEBOOK,
      status: InboxItemStatus.READ,
      content: "test",
      platformItemId: "2",
      receivedAt: new Date(),
      senderName: "test",
      accountId: "1",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workspace.findUnique as Mock).mockResolvedValue(mockWorkspace);
    (requireWorkspacePermission as Mock).mockResolvedValue({
      userId: "1",
      role: "ADMIN",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns a list of inbox items", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "1" } });
    (listInboxItems as Mock).mockResolvedValue({
      items: mockInboxItems,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/inbox`,
    );
    const res = await GET(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(2);
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { slug: mockWorkspace.slug },
      select: { id: true },
    });
    expect(requireWorkspacePermission).toHaveBeenCalledWith(
      { user: { id: "1" } },
      mockWorkspace.id,
      "inbox:view",
    );
  });

  it("filters by platform", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "1" } });
    (listInboxItems as Mock).mockResolvedValue({
      items: [mockInboxItems[0]],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/inbox?platform=TWITTER`,
    );
    const res = await GET(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(listInboxItems).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: mockWorkspace.id,
        platform: ["TWITTER"],
      }),
      expect.any(Object),
    );
  });

  it("returns a 401 if the user is not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireWorkspacePermission as Mock).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

    const req = new NextRequest(
      `https://localhost/api/orbit/${mockWorkspace.slug}/inbox`,
    );
    const res = await GET(req, {
      params: Promise.resolve({ workspaceSlug: mockWorkspace.slug }),
    });

    expect(res.status).toBe(401);
  });

  it("returns a 404 if the workspace is not found", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "1" } });
    (prisma.workspace.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest(
      `https://localhost/api/orbit/non-existent/inbox`,
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "non-existent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });
});
