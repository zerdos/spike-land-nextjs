import { BoxMessageRole, BoxStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before they are hoisted
const { mockAuth, mockPrisma, mockGemini } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    box: {
      findUnique: vi.fn(),
    },
    boxMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  mockGemini: {
    generateAgentResponse: vi.fn(),
    isGeminiConfigured: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));
vi.mock("@/lib/ai/gemini-client", () => ({
  generateAgentResponse: mockGemini.generateAgentResponse,
  isGeminiConfigured: mockGemini.isGeminiConfigured,
}));

// Import after mocks are set up
import { POST } from "./route";

describe("/api/boxes/[id]/messages POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    // Default happy path
    mockGemini.isGeminiConfigured.mockReturnValue(true);
    mockGemini.generateAgentResponse.mockResolvedValue("AI Response Content");
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

  it("creates user and agent messages successfully with AI response", async () => {
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

    // Simulate history:
    // 1. User: "Old message 1" (Oldest)
    // 2. Agent: "Old response 1" (Newest among history)
    // findMany with orderBy desc returns: [Agent, User]
    mockPrisma.boxMessage.findMany.mockResolvedValue([
      { role: BoxMessageRole.AGENT, content: "Old response 1" },
      { role: BoxMessageRole.USER, content: "Old message 1" },
    ]);

    const agentMessage = {
      id: "msg-2",
      boxId: "box-123",
      role: BoxMessageRole.AGENT,
      content: "AI Response Content",
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
    expect(mockPrisma.boxMessage.create).toHaveBeenCalledTimes(2);

    // Verify AI was called with correct history (reversed back to chronological order)
    expect(mockGemini.generateAgentResponse).toHaveBeenCalledWith({
      messages: [
        { role: "user", content: "Old message 1" },
        { role: "model", content: "Old response 1" },
        { role: "user", content: "Test message" },
      ],
    });

    expect(data.userMessage).toEqual({
      ...userMessage,
      createdAt: userMessage.createdAt.toISOString(),
    });
    expect(data.agentMessage).toEqual({
      ...agentMessage,
      createdAt: agentMessage.createdAt.toISOString(),
    });
  });

  it("uses fallback when Gemini is not configured", async () => {
    mockGemini.isGeminiConfigured.mockReturnValue(false);

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    mockPrisma.box.findUnique.mockResolvedValue({
      id: "box-123",
      userId: "user-123",
    } as any);

    const userMessage = {
      id: "msg-1",
      boxId: "box-123",
      role: BoxMessageRole.USER,
      content: "Test message",
    };

    mockPrisma.boxMessage.create.mockResolvedValueOnce(userMessage);
    // For the second call, we mock the return value, but we are interested in the arguments passed TO it
    mockPrisma.boxMessage.create.mockResolvedValueOnce({
      id: "msg-2",
      role: BoxMessageRole.AGENT,
      content: "AI agent is currently unavailable. Please try again later.",
    });

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    await POST(req, { params });

    // Verify that create was called with the fallback message
    expect(mockPrisma.boxMessage.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "AI agent is currently unavailable. Please try again later.",
        }),
      }),
    );

    // Verify AI was NOT called
    expect(mockGemini.generateAgentResponse).not.toHaveBeenCalled();
    expect(mockPrisma.boxMessage.findMany).not.toHaveBeenCalled();
  });

  it("uses fallback when Gemini throws error", async () => {
    mockGemini.isGeminiConfigured.mockReturnValue(true);
    mockGemini.generateAgentResponse.mockRejectedValue(new Error("API Error"));

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    mockPrisma.box.findUnique.mockResolvedValue({
      id: "box-123",
      userId: "user-123",
    } as any);

    mockPrisma.boxMessage.findMany.mockResolvedValue([]);
    mockPrisma.boxMessage.create.mockResolvedValue({} as any);

    const req = new Request("http://localhost/api/boxes/box-123/messages", {
      method: "POST",
      body: JSON.stringify({ content: "Test message" }),
    });
    const params = Promise.resolve({ id: "box-123" });

    await POST(req, { params });

    // Verify that create was called with the error fallback message
    expect(mockPrisma.boxMessage.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "I encountered an error processing your request. Please try again.",
        }),
      }),
    );
  });
});
