/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Mocking prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    connection: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Connections API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns connections list", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({ id: "ws1" });
    (prisma.connection.findMany as any).mockResolvedValue([
      { id: "c1", displayName: "Test Conn" },
    ]);

    const req = new NextRequest("http://localhost/api/orbit/test-ws/connections");
    const res = await GET(req, { params: { workspaceSlug: "test-ws" } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].displayName).toBe("Test Conn");
  });

  it("POST creates new connection", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({ id: "ws1" });
    (prisma.connection.create as any).mockResolvedValue({ id: "c2", displayName: "New Conn" });

    const req = new NextRequest("http://localhost/api/orbit/test-ws/connections", {
      method: "POST",
      body: JSON.stringify({ displayName: "New Conn" }),
    });

    const res = await POST(req, { params: { workspaceSlug: "test-ws" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("New Conn");
  });
});
