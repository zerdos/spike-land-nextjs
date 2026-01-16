import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: vi.fn().mockImplementation((data, init) => {
        return {
          json: () => Promise.resolve(data),
          status: init?.status ?? 200,
        };
      }),
    },
  };
});

vi.mock("@/auth");
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
    scoutTopic: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("/api/orbit/[workspaceSlug]/scout/topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost");
      const res = await GET(req, { params: { workspaceSlug: "test" } });
      expect(res.status).toBe(401);
    });

    it("should return 404 if workspace is not found", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "123" } } as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const req = new NextRequest("http://localhost");
      const res = await GET(req, { params: { workspaceSlug: "test" } });
      expect(res.status).toBe(404);
    });

    it("should return topics for a valid workspace", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "123" } } as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        { id: "ws-123" } as any,
      );
      vi.mocked(prisma.scoutTopic.findMany).mockResolvedValue(
        [{ id: "topic-1", name: "Test" }] as any,
      );
      const req = new NextRequest("http://localhost");
      const res = await GET(req, { params: { workspaceSlug: "test" } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([{ id: "topic-1", name: "Test" }]);
    });
  });

  describe("POST", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req, { params: { workspaceSlug: "test" } });
      expect(res.status).toBe(401);
    });

    it("should return 404 if workspace is not found", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "123" } } as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const req = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "New Topic" }),
      });
      const res = await POST(req, { params: { workspaceSlug: "test" } });
      expect(res.status).toBe(404);
    });

    it("should create a new topic and return it", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "123" } } as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
        { id: "ws-123" } as any,
      );
      const newTopic = { name: "New Topic", keywords: {} };
      vi.mocked(prisma.scoutTopic.create).mockResolvedValue(
        { id: "new-topic-1", ...newTopic } as any,
      );

      const req = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify(newTopic),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req, { params: { workspaceSlug: "test" } });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual({ id: "new-topic-1", ...newTopic });
      expect(prisma.scoutTopic.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "ws-123",
          ...newTopic,
          isActive: true,
        },
      });
    });
  });
});
