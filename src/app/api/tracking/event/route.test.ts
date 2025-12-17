import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    visitorSession: {
      findUnique: vi.fn(),
    },
    analyticsEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(() =>
    Promise.resolve({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    })
  ),
}));

const prisma = (await import("@/lib/prisma")).default;
const { checkRateLimit } = await import("@/lib/rate-limiter");

describe("POST /api/tracking/event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limiter to not limited by default
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
  });

  it("should create an event with valid whitelisted name", async () => {
    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
      id: "session-123",
      visitorId: "visitor-123",
      userId: null,
      sessionStart: new Date(),
      sessionEnd: null,
      deviceType: "desktop",
      browser: "Chrome",
      os: "macOS",
      ipCountry: null,
      ipCity: null,
      referrer: null,
      landingPage: "/",
      exitPage: "/",
      pageViewCount: 1,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      fbclid: null,
    });

    vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({
      id: "event-123",
      sessionId: "session-123",
      name: "signup_started",
      category: "conversion",
      value: null,
      metadata: null,
      timestamp: new Date(),
    });

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
        name: "signup_started",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.eventId).toBe("event-123");
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        sessionId: "session-123",
        name: "signup_started",
        category: "conversion",
        value: null,
        // metadata is conditionally included only when provided
      },
    });
  });

  it("should return 400 for invalid event name", async () => {
    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
        name: "invalid_event_name",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid event name");
    expect(prisma.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("should return 400 for missing sessionId", async () => {
    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        name: "signup_started",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid input");
  });

  it("should return 400 for missing name", async () => {
    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid input");
  });

  it("should return 404 for non-existent session", async () => {
    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "non-existent-session",
        name: "signup_started",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Session not found");
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
        name: "signup_started",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("Too many requests");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("should return 413 for oversized request", async () => {
    const largeMetadata = { data: "x".repeat(10000) };

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      headers: {
        "content-length": "10000",
      },
      body: JSON.stringify({
        sessionId: "session-123",
        name: "signup_started",
        metadata: largeMetadata,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toBe("Request too large");
  });

  it("should return 400 for invalid JSON body", async () => {
    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "not valid json {",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should include value when provided", async () => {
    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
      id: "session-123",
      visitorId: "visitor-123",
      userId: null,
      sessionStart: new Date(),
      sessionEnd: null,
      deviceType: null,
      browser: null,
      os: null,
      ipCountry: null,
      ipCity: null,
      referrer: null,
      landingPage: "/",
      exitPage: "/",
      pageViewCount: 1,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      fbclid: null,
    });

    vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({
      id: "event-456",
      sessionId: "session-123",
      name: "enhancement_completed",
      category: "conversion",
      value: 5,
      metadata: null,
      timestamp: new Date(),
    });

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
        name: "enhancement_completed",
        value: 5,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        value: 5,
      }),
    });
  });

  it("should include metadata when provided", async () => {
    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
      id: "session-123",
      visitorId: "visitor-123",
      userId: null,
      sessionStart: new Date(),
      sessionEnd: null,
      deviceType: null,
      browser: null,
      os: null,
      ipCountry: null,
      ipCity: null,
      referrer: null,
      landingPage: "/",
      exitPage: "/",
      pageViewCount: 1,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      fbclid: null,
    });

    vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({
      id: "event-789",
      sessionId: "session-123",
      name: "signup_completed",
      category: "conversion",
      value: null,
      metadata: { method: "google" },
      timestamp: new Date(),
    });

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
        name: "signup_completed",
        metadata: { method: "google" },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { method: "google" },
      }),
    });
  });

  it("should return 500 on database error", async () => {
    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
      id: "session-123",
      visitorId: "visitor-123",
      userId: null,
      sessionStart: new Date(),
      sessionEnd: null,
      deviceType: null,
      browser: null,
      os: null,
      ipCountry: null,
      ipCity: null,
      referrer: null,
      landingPage: "/",
      exitPage: "/",
      pageViewCount: 1,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      fbclid: null,
    });

    vi.mocked(prisma.analyticsEvent.create).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/tracking/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-123",
        name: "signup_started",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should accept all whitelisted event names", async () => {
    const whitelistedEvents = [
      "signup_started",
      "signup_completed",
      "enhancement_started",
      "enhancement_completed",
      "purchase_started",
      "purchase_completed",
      "page_scroll_25",
      "page_scroll_50",
      "page_scroll_75",
      "page_scroll_100",
      "time_on_page_30s",
      "time_on_page_60s",
      "time_on_page_180s",
    ];

    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
      id: "session-123",
      visitorId: "visitor-123",
      userId: null,
      sessionStart: new Date(),
      sessionEnd: null,
      deviceType: null,
      browser: null,
      os: null,
      ipCountry: null,
      ipCity: null,
      referrer: null,
      landingPage: "/",
      exitPage: "/",
      pageViewCount: 1,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      fbclid: null,
    });

    for (const eventName of whitelistedEvents) {
      vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({
        id: `event-${eventName}`,
        sessionId: "session-123",
        name: eventName,
        category: "conversion",
        value: null,
        metadata: null,
        timestamp: new Date(),
      });

      const request = new NextRequest("http://localhost/api/tracking/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-123",
          name: eventName,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    }
  });
});
