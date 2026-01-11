import { syncFacebookCampaigns } from "@/lib/allocator/facebook-ads/campaign-sync";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/allocator/facebook-ads/campaign-sync", () => ({
  syncFacebookCampaigns: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/orbit/[workspaceSlug]/allocator/facebook/sync", () => {
  it("should start the sync process for a valid workspace", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({ id: "ws1", slug: "test-ws" });

    const req = new NextRequest("http://localhost/api/orbit/test-ws/allocator/facebook/sync");
    const res = await POST(req, { params: { workspaceSlug: "test-ws" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Sync process started");
    expect(syncFacebookCampaigns).toHaveBeenCalledWith("ws1");
  });

  it("should return 404 if workspace is not found", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/orbit/non-existent-ws/allocator/facebook/sync",
    );
    const res = await POST(req, { params: { workspaceSlug: "non-existent-ws" } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Workspace not found");
  });
});
