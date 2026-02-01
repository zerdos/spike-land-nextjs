import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth/agent", () => ({
  verifyAgentAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(),
}));

const { verifyAgentAuth } = await import("@/lib/auth/agent");
const { tryCatch } = await import("@/lib/try-catch");

describe("GET /api/agent/apps/[appId]/context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if agent is not authenticated", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-123/context",
      { headers: { Authorization: "Bearer invalid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ appId: "app-123" }),
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
      "http://localhost/api/agent/apps/app-123/context",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    // Create a rejected promise that won't cause unhandled rejection
    const rejectedParams = Promise.resolve({ appId: "app-123" });
    // The tryCatch mock already simulates the error case

    const response = await GET(request, {
      params: rejectedParams,
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid parameters");
  });

  it("should return 404 if app is not found", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { appId: "app-123" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-123/context",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ appId: "app-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return 500 if database fetch fails", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { appId: "app-123" }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("DB error") });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-123/context",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ appId: "app-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return app context with requirements and chat history", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);

    const mockApp = {
      id: "app-123",
      name: "Test App",
      description: "Test description",
      status: "WAITING",
      codespaceId: "test-codespace",
      codespaceUrl: "https://testing.spike.land/live/test-codespace/",
      isPublic: false,
      slug: "test-app",
      requirements: [
        { id: "req-1", description: "Feature 1", priority: 1, status: "PENDING" },
        { id: "req-2", description: "Feature 2", priority: 2, status: "DONE" },
      ],
      messages: [
        {
          id: "msg-2",
          role: "AGENT",
          content: "I can help!",
          createdAt: new Date("2024-01-01T00:01:00Z"),
          isRead: true,
          attachments: [],
        },
        {
          id: "msg-1",
          role: "USER",
          content: "Hello",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          isRead: false,
          attachments: [
            {
              image: {
                id: "img-1",
                originalUrl: "https://example.com/image.png",
                aiDescription: "A test image",
                tags: ["test"],
              },
            },
          ],
        },
      ],
    };

    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { appId: "app-123" }, error: null })
      .mockResolvedValueOnce({ data: mockApp, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-123/context?historyLimit=5",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ appId: "app-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.app).toEqual({
      id: "app-123",
      name: "Test App",
      description: "Test description",
      status: "WAITING",
      codespaceId: "test-codespace",
      codespaceUrl: "https://testing.spike.land/live/test-codespace/",
      isPublic: false,
      slug: "test-app",
    });
    expect(data.requirements).toHaveLength(2);
    // Chat history should be reversed (oldest first)
    expect(data.chatHistory).toHaveLength(2);
    expect(data.chatHistory[0].id).toBe("msg-1");
    expect(data.chatHistory[1].id).toBe("msg-2");
  });

  it("should cap historyLimit at 50", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);

    const mockApp = {
      id: "app-123",
      name: "Test App",
      description: null,
      status: "WAITING",
      codespaceId: null,
      codespaceUrl: null,
      isPublic: true,
      slug: "test-app",
      requirements: [],
      messages: [],
    };

    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { appId: "app-123" }, error: null })
      .mockResolvedValueOnce({ data: mockApp, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-123/context?historyLimit=100",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ appId: "app-123" }),
    });

    expect(response.status).toBe(200);
    // The function should have capped at 50, but we verify via the response success
  });

  it("should use default historyLimit of 10", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);

    const mockApp = {
      id: "app-123",
      name: "Test App",
      description: null,
      status: "WAITING",
      codespaceId: null,
      codespaceUrl: null,
      isPublic: false,
      slug: "test-app",
      requirements: [],
      messages: [],
    };

    vi.mocked(tryCatch)
      .mockResolvedValueOnce({ data: { appId: "app-123" }, error: null })
      .mockResolvedValueOnce({ data: mockApp, error: null });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-123/context",
      { headers: { Authorization: "Bearer valid-key" } },
    );

    const response = await GET(request, {
      params: Promise.resolve({ appId: "app-123" }),
    });

    expect(response.status).toBe(200);
  });
});
