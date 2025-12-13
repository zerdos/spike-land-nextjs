import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxMessageRole, BoxStatus } from "@prisma/client";

vi.mock("@/auth");
vi.mock("@/lib/prisma", () => ({
  default: {
    box: {
      findUnique: vi.fn(),
    },
    boxMessage: {
      create: vi.fn(),
    },
  },
}));

describe("/api/boxes/[id]/messages POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    const response = await POST(req, { params });

    expect(response.status).toBe(401);
  });

  it("returns 404 if box is not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    const response = await POST(req, { params });

    expect(response.status).toBe(404);
  });

  it("returns 400 if content is empty", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);
    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-123",
      userId: "user-123",
      name: "Test Box",
      status: BoxStatus.RUNNING,
    } as any);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    const response = await POST(req, { params });

    expect(response.status).toBe(400);
  });

  it("creates user and agent messages successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-123",
      userId: "user-123",
      name: "Test Box",
      status: BoxStatus.RUNNING,
    } as any);

    const userMessage = {
      id: "msg-1",
      boxId: "box-123",
      role: BoxMessageRole.USER,
      content: "Test message",
      createdAt: new Date(),
    };

    const agentMessage = {
      id: "msg-2",
      boxId: "box-123",
      role: BoxMessageRole.AGENT,
      content: "Message received. This is a placeholder response.",
      createdAt: new Date(),
    };

    vi.mocked(prisma.boxMessage.create)
      .mockResolvedValueOnce(userMessage)
      .mockResolvedValueOnce(agentMessage);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    const response = await POST(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.userMessage).toEqual(userMessage);
    expect(data.agentMessage).toEqual(agentMessage);
  });
});
