import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  broadcastAgentWorking,
  broadcastCodeUpdated,
  broadcastMessage,
  broadcastStatus,
  GET,
} from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/upstash", () => ({
  isAgentWorking: vi.fn(() => Promise.resolve(false)),
  publishSSEEvent: vi.fn(() => Promise.resolve()),
  getSSEEvents: vi.fn(() => Promise.resolve([])),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/apps/[id]/messages/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/apps/app-1/messages/stream",
    );
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if app not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/apps/app-1/messages/stream",
    );
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("App not found");
  });

  it("should return SSE stream for valid app", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      status: "PROMPTING",
    } as never);

    const request = new NextRequest(
      "http://localhost/api/apps/app-1/messages/stream",
    );
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate",
    );

    // Read first event (connected)
    const reader = response.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("connected");
    expect(text).toContain("app-1");

    // Cancel the stream
    await reader.cancel();
  });
});

describe("Broadcast functions", () => {
  it("broadcastMessage should not throw without connections", () => {
    expect(() =>
      broadcastMessage("app-1", {
        id: "msg-1",
        role: "USER",
        content: "Hello",
        createdAt: new Date(),
      })
    ).not.toThrow();
  });

  it("broadcastStatus should not throw without connections", () => {
    expect(() => broadcastStatus("app-1", "LIVE", "App is now live")).not
      .toThrow();
  });

  it("broadcastAgentWorking should not throw without connections", () => {
    expect(() => broadcastAgentWorking("app-1", true)).not.toThrow();
  });

  it("broadcastCodeUpdated should not throw without connections", () => {
    expect(() => broadcastCodeUpdated("app-1")).not.toThrow();
  });
});

describe("Redis Pub/Sub Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should publish events to Redis when broadcasting", async () => {
    const { publishSSEEvent } = await import("@/lib/upstash");

    broadcastMessage("test-app", {
      id: "msg-1",
      role: "USER",
      content: "test",
      createdAt: new Date(),
    });

    // Wait for async publish
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(publishSSEEvent).toHaveBeenCalledWith(
      "test-app",
      expect.objectContaining({
        type: "message",
        data: expect.objectContaining({
          id: "msg-1",
          role: "USER",
          content: "test",
        }),
        timestamp: expect.any(Number),
      }),
    );
  });

  it("should poll Redis and forward events to local connections", async () => {
    const { getSSEEvents } = await import("@/lib/upstash");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      status: "PROMPTING",
    } as never);

    // Mock Redis returning an event after initial connection
    let callCount = 0;
    vi.mocked(getSSEEvents).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First poll: no events
        return Promise.resolve([]);
      }
      // Second poll: return event from another instance
      return Promise.resolve([
        {
          type: "message",
          data: { content: "from another instance" },
          timestamp: Date.now(),
          sourceInstanceId: "other-instance",
        },
      ]);
    });

    const request = new NextRequest(
      "http://localhost/api/apps/app-1/messages/stream",
    );
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const reader = response.body!.getReader();

    // Read connected event
    await reader.read();

    // Wait for polling interval (2 seconds + buffer)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Read the event from Redis
    const { value } = await reader.read();
    const decoded = new TextDecoder().decode(value);

    expect(decoded).toContain("from another instance");
    expect(getSSEEvents).toHaveBeenCalled();

    // Cancel the stream
    await reader.cancel();
  });

  it("should continue working when Redis publish fails", async () => {
    const { publishSSEEvent } = await import("@/lib/upstash");

    // Mock Redis failure
    vi.mocked(publishSSEEvent).mockRejectedValue(
      new Error("Redis unavailable"),
    );

    // Should not throw
    expect(() => {
      broadcastMessage("test-app", {
        id: "msg-1",
        role: "USER",
        content: "test",
        createdAt: new Date(),
      });
    }).not.toThrow();

    // Wait for async publish attempt
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(publishSSEEvent).toHaveBeenCalled();
  });

  it("should continue working when Redis poll fails", async () => {
    const { getSSEEvents } = await import("@/lib/upstash");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      status: "PROMPTING",
    } as never);

    // Mock Redis failure
    vi.mocked(getSSEEvents).mockRejectedValue(new Error("Redis unavailable"));

    const request = new NextRequest(
      "http://localhost/api/apps/app-1/messages/stream",
    );
    const context = { params: Promise.resolve({ id: "app-1" }) };

    const response = await GET(request, context);
    const reader = response.body!.getReader();

    // Read connected event - should not throw
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("connected");

    // Wait for polling interval
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Should have attempted to poll despite errors
    expect(getSSEEvents).toHaveBeenCalled();

    // Cancel the stream
    await reader.cancel();
  });

  it(
    "should cleanup Redis polling interval on disconnect",
    async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
      } as Session);

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        status: "PROMPTING",
      } as never);

      const { getSSEEvents } = await import("@/lib/upstash");
      const pollCallCount = vi.mocked(getSSEEvents).mock.calls.length;

      const request = new NextRequest(
        "http://localhost/api/apps/app-1/messages/stream",
      );
      const context = { params: Promise.resolve({ id: "app-1" }) };

      const response = await GET(request, context);
      const reader = response.body!.getReader();

      // Read connected event
      await reader.read();

      // Wait for at least one poll
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Cancel the stream
      await reader.cancel();

      const callsAfterCancel = vi.mocked(getSSEEvents).mock.calls.length;

      // Wait to ensure no more polls happen
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const callsAfterWait = vi.mocked(getSSEEvents).mock.calls.length;

      // Should not have new calls after cancellation
      expect(callsAfterWait).toBe(callsAfterCancel);
      expect(callsAfterWait).toBeGreaterThan(pollCallCount);
    },
    10000,
  ); // 10 second timeout
});
