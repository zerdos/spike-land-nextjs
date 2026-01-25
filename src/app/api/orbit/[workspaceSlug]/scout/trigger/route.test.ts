import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { runTopicMonitoring } from "@/lib/scout/topic-monitor";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/auth");
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/lib/scout/topic-monitor");

describe("/api/orbit/[workspaceSlug]/scout/trigger", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req, { params: Promise.resolve({ workspaceSlug: "test" }) });
      expect(res.status).toBe(401);
    });

    it("should return 404 if workspace is not found", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "123" } } as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req, { params: Promise.resolve({ workspaceSlug: "test" }) });
      expect(res.status).toBe(404);
    });

    it("should call runTopicMonitoring and return a success message", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "123" } } as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        { id: "ws-123" } as any,
      );

      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req, { params: Promise.resolve({ workspaceSlug: "test" }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Topic monitoring has been triggered.");
      expect(runTopicMonitoring).toHaveBeenCalledWith("ws-123");
    });
  });
});
