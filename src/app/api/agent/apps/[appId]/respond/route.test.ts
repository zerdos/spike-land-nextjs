import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock dependencies
vi.mock("@/lib/auth/agent", () => ({
  verifyAgentAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    appMessage: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    appCodeVersion: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) =>
      fn({
        appMessage: {
          create: vi.fn().mockResolvedValue({
            id: "msg-1",
            role: "AGENT",
            content: "Test",
            createdAt: new Date(),
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: vi.fn().mockResolvedValue({ id: "cv-1" }),
        },
      })
    ),
  },
}));

vi.mock("@/app/api/apps/[id]/messages/stream/route", () => ({
  broadcastMessage: vi.fn(),
  broadcastCodeUpdated: vi.fn(),
}));

vi.mock("@/lib/upstash", () => ({
  dequeueMessage: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const { verifyAgentAuth } = await import("@/lib/auth/agent");
const prisma = (await import("@/lib/prisma")).default;
const { broadcastMessage, broadcastCodeUpdated } = await import(
  "@/app/api/apps/[id]/messages/stream/route"
);

describe("POST /api/agent/apps/[appId]/respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should return 401 if agent auth fails", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({ content: "Test response" }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid JSON body", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: "invalid json",
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 for validation errors", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({ content: "" }), // Empty content is invalid
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should return 404 if app not found", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({ content: "Test response" }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should create agent message and return 201 on valid request", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      codespaceId: null,
    } as never);

    const mockMessage = {
      id: "msg-1",
      role: "AGENT",
      content: "Test response",
      createdAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        appMessage: {
          create: vi.fn().mockResolvedValue(mockMessage),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: vi.fn().mockResolvedValue({ id: "cv-1" }),
        },
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({ content: "Test response" }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("msg-1");
    expect(data.content).toBe("Test response");
    expect(broadcastMessage).toHaveBeenCalled();
  });

  it("should create code version when codeUpdated is true and app has codespace", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      codespaceId: "test-codespace-123",
    } as never);

    const mockMessage = {
      id: "msg-1",
      role: "AGENT",
      content: "Updated the code",
      createdAt: new Date(),
    };

    const mockCodeVersionCreate = vi.fn().mockResolvedValue({ id: "cv-1" });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        appMessage: {
          create: vi.fn().mockResolvedValue(mockMessage),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: mockCodeVersionCreate,
        },
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    // Mock fetch for session.json
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: "console.log('hello');" }),
    });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({
          content: "Updated the code",
          codeUpdated: true,
        }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);

    expect(response.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://testing.spike.land/live/test-codespace-123/session.json",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
    expect(mockCodeVersionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appId: "app-1",
        messageId: "msg-1",
        code: "console.log('hello');",
      }),
    });
    expect(broadcastCodeUpdated).toHaveBeenCalledWith("app-1");
  });

  it("should not create code version when codeUpdated is false", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      codespaceId: "test-codespace-123",
    } as never);

    const mockMessage = {
      id: "msg-1",
      role: "AGENT",
      content: "Just a message",
      createdAt: new Date(),
    };

    const mockCodeVersionCreate = vi.fn().mockResolvedValue({ id: "cv-1" });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        appMessage: {
          create: vi.fn().mockResolvedValue(mockMessage),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: mockCodeVersionCreate,
        },
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({
          content: "Just a message",
          codeUpdated: false,
        }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);

    expect(response.status).toBe(201);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCodeVersionCreate).not.toHaveBeenCalled();
    expect(broadcastCodeUpdated).not.toHaveBeenCalled();
  });

  it("should skip code version when app has no codespaceId", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      codespaceId: null,
    } as never);

    const mockMessage = {
      id: "msg-1",
      role: "AGENT",
      content: "Updated code",
      createdAt: new Date(),
    };

    const mockCodeVersionCreate = vi.fn().mockResolvedValue({ id: "cv-1" });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        appMessage: {
          create: vi.fn().mockResolvedValue(mockMessage),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: mockCodeVersionCreate,
        },
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({
          content: "Updated code",
          codeUpdated: true,
        }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    const response = await POST(request, context);

    expect(response.status).toBe(201);
    // codeUpdated is true, but codespaceId is null, so no fetch should occur
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCodeVersionCreate).not.toHaveBeenCalled();
  });

  it("should handle fetch failure gracefully when creating code version", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      codespaceId: "test-codespace-123",
    } as never);

    const mockMessage = {
      id: "msg-1",
      role: "AGENT",
      content: "Updated code",
      createdAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        appMessage: {
          create: vi.fn().mockResolvedValue(mockMessage),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: vi.fn().mockResolvedValue({ id: "cv-1" }),
        },
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    // Mock fetch to fail
    mockFetch.mockRejectedValue(new Error("Network error"));

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({
          content: "Updated code",
          codeUpdated: true,
        }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    // Should not throw - graceful degradation
    const response = await POST(request, context);

    expect(response.status).toBe(201);
    expect(broadcastCodeUpdated).toHaveBeenCalledWith("app-1");
  });

  it("should broadcast codeUpdated event when codeUpdated flag is true", async () => {
    vi.mocked(verifyAgentAuth).mockReturnValue(true);
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      codespaceId: null,
    } as never);

    const mockMessage = {
      id: "msg-1",
      role: "AGENT",
      content: "Code updated",
      createdAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        appMessage: {
          create: vi.fn().mockResolvedValue(mockMessage),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        app: {
          update: vi.fn().mockResolvedValue({}),
        },
        appCodeVersion: {
          create: vi.fn().mockResolvedValue({ id: "cv-1" }),
        },
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    const request = new NextRequest(
      "http://localhost/api/agent/apps/app-1/respond",
      {
        method: "POST",
        body: JSON.stringify({
          content: "Code updated",
          codeUpdated: true,
        }),
      },
    );
    const context = { params: Promise.resolve({ appId: "app-1" }) };

    await POST(request, context);

    expect(broadcastCodeUpdated).toHaveBeenCalledWith("app-1");
  });
});
