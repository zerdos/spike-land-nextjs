import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { InboxItemStatus, SocialPlatform } from "@prisma/client";
import { NextRequest } from "next/server";
import { vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const mockedAuth = auth as ReturnType<typeof vi.fn>;

describe("GET /api/orbit/[workspaceSlug]/inbox", () => {
  let workspace: any;

  beforeEach(async () => {
    workspace = await prisma.workspace.create({
      data: {
        name: "Test Workspace",
        slug: "test-workspace",
      },
    });
    await prisma.inboxItem.createMany({
      data: [
        {
          workspaceId: workspace.id,
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
          workspaceId: workspace.id,
          type: "MENTION",
          platform: SocialPlatform.FACEBOOK,
          status: InboxItemStatus.READ,
          content: "test",
          platformItemId: "2",
          receivedAt: new Date(),
          senderName: "test",
          accountId: "1",
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.inboxItem.deleteMany({});
    await prisma.workspace.deleteMany({});
  });

  it("returns a list of inbox items", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "1" } });
    const req = new NextRequest(`https://localhost/api/orbit/${workspace.slug}/inbox`);
    const res = await GET(req, { params: { workspaceSlug: workspace.slug } });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(2);
  });

  it("filters by platform", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "1" } });
    const req = new NextRequest(
      `https://localhost/api/orbit/${workspace.slug}/inbox?platform=TWITTER`,
    );
    const res = await GET(req, { params: { workspaceSlug: workspace.slug } });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].platform).toBe(SocialPlatform.TWITTER);
  });

  it("returns a 401 if the user is not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new NextRequest(`https://localhost/api/orbit/${workspace.slug}/inbox`);
    const res = await GET(req, { params: { workspaceSlug: workspace.slug } });
    expect(res.status).toBe(401);
  });
});
