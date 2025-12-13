import { BoxMessageRole, BoxStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before they are hoisted
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    box: {
      findUnique: vi.fn(),
    },
    boxMessage: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Import after mocks are set up
import { POST } from "./route";

describe("/api/boxes/[id]/messages POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    const response = await POST(req, { params });

    expect(response.status).toBe(401);
  });

  it("returns 404 if box is not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    } as any);
    mockPrisma.box.findUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    const response = await POST(req, { params });

    expect(response.status).toBe(404);
  });

  it("returns 400 if content is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    } as any);
    mockPrisma.box.findUnique.mockResolvedValue({
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
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    mockPrisma.box.findUnique.mockResolvedValue({
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

    mockPrisma.boxMessage.create
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
    // Compare with date strings since JSON serializes Date objects to strings
    expect(data.userMessage).toEqual({
      ...userMessage,
      createdAt: userMessage.createdAt.toISOString(),
    });
    expect(data.agentMessage).toEqual({
      ...agentMessage,
      createdAt: agentMessage.createdAt.toISOString(),
    });
  });
});
