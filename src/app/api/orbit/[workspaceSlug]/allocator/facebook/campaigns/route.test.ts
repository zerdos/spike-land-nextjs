import prisma from "@/lib/prisma";

import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    allocatorCampaign: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/orbit/[workspaceSlug]/allocator/facebook/campaigns", () => {
  it("should return campaigns for a valid workspace", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({ id: "ws1", slug: "test-ws" });
    (prisma.allocatorCampaign.findMany as any).mockResolvedValue([{
      id: "camp1",
      name: "Campaign 1",
    }]);

    const req = new NextRequest("http://localhost/api/orbit/test-ws/allocator/facebook/campaigns");
    const res = await GET(req, { params: { workspaceSlug: "test-ws" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([{ id: "camp1", name: "Campaign 1" }]);
  });

  it("should return 404 if workspace is not found", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/orbit/non-existent-ws/allocator/facebook/campaigns",
    );
    const res = await GET(req, { params: { workspaceSlug: "non-existent-ws" } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Workspace not found");
  });
});
