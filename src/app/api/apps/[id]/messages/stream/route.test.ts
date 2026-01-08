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
