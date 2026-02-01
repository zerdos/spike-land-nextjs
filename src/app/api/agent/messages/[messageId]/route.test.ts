import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

vi.mock("@/lib/auth/agent", () => ({
  verifyAgentAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    appMessage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(),
}));

const { verifyAgentAuth } = await import("@/lib/auth/agent");
const { tryCatch } = await import("@/lib/try-catch");

describe("GET /api/agent/messages/[messageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if agent is not authenticated", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      { headers: { Authorization: "Bearer invalid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - Invalid or missing agent API key");
  });

  it("should return 400 if params promise rejects", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch).mockResolvedValueOnce({
      data: null,
      error: new Error("Invalid params"),
    });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    // The tryCatch mock simulates the error case
    const response = await GET(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid parameters");
  });

  it("should return 404 if message is not found", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Message not found");
  });

  it("should return 500 if database fetch fails", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("DB error") });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return message with attachments", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);

    const mockMessage = {
      id: "msg-123",
      appId: "app-456",
      role: "USER",
      content: "Hello world",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      isRead: false,
      attachments: [
        {
          image: {
            id: "img-1",
            originalUrl: "https://example.com/image.png",
            aiDescription: "A test image",
            tags: ["test", "image"],
          },
        },
      ],
    };

    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: mockMessage, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("msg-123");
    expect(data.appId).toBe("app-456");
    expect(data.role).toBe("USER");
    expect(data.content).toBe("Hello world");
    expect(data.isRead).toBe(false);
    expect(data.attachments).toHaveLength(1);
    expect(data.attachments[0].image.originalUrl).toBe(
      "https://example.com/image.png",
    );
  });
});

describe("PATCH /api/agent/messages/[messageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if agent is not authenticated", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer invalid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - Invalid or missing agent API key");
  });

  it("should return 400 if params promise rejects", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch).mockResolvedValueOnce({
      data: null,
      error: new Error("Invalid params"),
    });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      },
    );

    // The tryCatch mock simulates the error case
    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid parameters");
  });

  it("should return 400 if JSON body is invalid", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("Invalid JSON") });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }), // Valid JSON, but mock simulates error
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 if isRead is not a boolean", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: { isRead: "true" }, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: "true" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("isRead must be a boolean");
  });

  it("should return 500 if update fails", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: { isRead: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("Update failed") });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should successfully mark message as read", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: { isRead: true }, error: null })
      .mockResolvedValueOnce({
        data: { id: "msg-123", isRead: true },
        error: null,
      });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("msg-123");
    expect(data.isRead).toBe(true);
  });

  it("should successfully mark message as unread", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { messageId: "msg-123" }, error: null })
      .mockResolvedValueOnce({ data: { isRead: false }, error: null })
      .mockResolvedValueOnce({
        data: { id: "msg-123", isRead: false },
        error: null,
      });

    const request = new NextRequest(
      "http://localhost/api/agent/messages/msg-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer valid-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: false }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ messageId: "msg-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("msg-123");
    expect(data.isRead).toBe(false);
  });
});
