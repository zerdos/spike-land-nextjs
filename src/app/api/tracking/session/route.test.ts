/**
 * Session Tracking API Route Tests
 *
 * Tests for the session tracking API endpoint including
 * session creation, updates, and error handling.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, POST } from "./route";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    visitorSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock rate limiter
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

describe("POST /api/tracking/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
  });

  describe("Request validation", () => {
    it("should return 400 for invalid JSON body", async () => {
      // Create a request and mock its json() method to throw a SyntaxError
      // This avoids the unhandled rejection from NextRequest's internal body parsing
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // Override json() to simulate invalid JSON parsing error
      vi.spyOn(request, "json").mockRejectedValue(
        new SyntaxError(
          "Unexpected token 'n', \"not valid json {\" is not valid JSON",
        ),
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON body");
    });

    it("should return 400 for missing visitorId", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
      expect(data.error).toContain("visitorId");
    });

    it("should return 400 for missing landingPage", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
      expect(data.error).toContain("landingPage");
    });

    it("should return 400 for empty visitorId", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "",
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for visitorId exceeding max length", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "x".repeat(129),
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 413 for oversized request", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        headers: {
          "content-length": "5000",
        },
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toBe("Request too large");
    });
  });

  describe("Rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt: Date.now() + 30000,
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("Too many requests");
      expect(response.headers.get("Retry-After")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should use x-forwarded-for for rate limiting", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
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

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "tracking_session:192.168.1.1",
        expect.any(Object),
      );
    });

    it("should use x-real-ip for rate limiting when x-forwarded-for not present", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
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

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        headers: {
          "x-real-ip": "192.168.1.100",
        },
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "tracking_session:192.168.1.100",
        expect.any(Object),
      );
    });

    it("should use 'unknown' when no IP headers present", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
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

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "tracking_session:unknown",
        expect.any(Object),
      );
    });
  });

  describe("New session creation", () => {
    it("should create a new session for new visitor", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "new-session-123",
        visitorId: "v_visitor-123",
        userId: null,
        sessionStart: new Date(),
        sessionEnd: null,
        deviceType: "desktop",
        browser: "Chrome",
        os: "macOS",
        ipCountry: null,
        ipCity: null,
        referrer: "https://google.com",
        landingPage: "/",
        exitPage: "/",
        pageViewCount: 1,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "brand",
        utmTerm: null,
        utmContent: null,
        gclid: "abc123",
        fbclid: null,
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
          referrer: "https://google.com",
          deviceType: "desktop",
          browser: "Chrome",
          os: "macOS",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand",
          gclid: "abc123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.sessionId).toBe("new-session-123");
      expect(prisma.visitorSession.create).toHaveBeenCalledWith({
        data: {
          visitorId: "v_visitor-123",
          landingPage: "/",
          exitPage: "/",
          pageViewCount: 1,
          referrer: "https://google.com",
          deviceType: "desktop",
          browser: "Chrome",
          os: "macOS",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand",
          utmTerm: null,
          utmContent: null,
          gclid: "abc123",
          fbclid: null,
        },
      });
    });

    it("should handle optional fields with null", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "session-minimal",
        visitorId: "v_visitor-456",
        userId: null,
        sessionStart: new Date(),
        sessionEnd: null,
        deviceType: null,
        browser: null,
        os: null,
        ipCountry: null,
        ipCity: null,
        referrer: null,
        landingPage: "/about",
        exitPage: "/about",
        pageViewCount: 1,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        gclid: null,
        fbclid: null,
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-456",
          landingPage: "/about",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.sessionId).toBe("session-minimal");
      expect(prisma.visitorSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrer: null,
          deviceType: null,
          browser: null,
          os: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: null,
        }),
      });
    });
  });

  describe("Existing session update", () => {
    it("should update existing active session", async () => {
      const existingSession = {
        id: "existing-session-123",
        visitorId: "v_visitor-123",
        userId: null,
        sessionStart: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        sessionEnd: null,
        deviceType: "desktop",
        browser: "Chrome",
        os: "macOS",
        ipCountry: null,
        ipCity: null,
        referrer: "https://google.com",
        landingPage: "/",
        exitPage: "/",
        pageViewCount: 2,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "brand",
        utmTerm: null,
        utmContent: null,
        gclid: null,
        fbclid: null,
      };

      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(
        existingSession,
      );
      vi.mocked(prisma.visitorSession.update).mockResolvedValue({
        ...existingSession,
        pageViewCount: 3,
        exitPage: "/about",
        sessionEnd: new Date(),
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/about",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe("existing-session-123");
      expect(prisma.visitorSession.update).toHaveBeenCalledWith({
        where: { id: "existing-session-123" },
        data: {
          pageViewCount: 3,
          exitPage: "/about",
          sessionEnd: expect.any(Date),
        },
      });
    });

    it("should create new session for timed out visitor", async () => {
      // No existing session found (timed out)
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "new-session-after-timeout",
        visitorId: "v_visitor-123",
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

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.sessionId).toBe("new-session-after-timeout");
      expect(prisma.visitorSession.create).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 on session create error", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockRejectedValue(
        new Error("Create failed"),
      );

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 on session update error", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue({
        id: "existing-session",
        visitorId: "v_visitor-123",
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
      vi.mocked(prisma.visitorSession.update).mockRejectedValue(
        new Error("Update failed"),
      );

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/about",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("UTM parameter storage", () => {
    it("should store all UTM parameters", async () => {
      vi.mocked(prisma.visitorSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "session-with-utm",
        visitorId: "v_visitor-123",
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
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "brand",
        utmTerm: "image enhancement",
        utmContent: "ad-variant-a",
        gclid: "gclid-123",
        fbclid: "fbclid-456",
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: JSON.stringify({
          visitorId: "v_visitor-123",
          landingPage: "/",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand",
          utmTerm: "image enhancement",
          utmContent: "ad-variant-a",
          gclid: "gclid-123",
          fbclid: "fbclid-456",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.visitorSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand",
          utmTerm: "image enhancement",
          utmContent: "ad-variant-a",
          gclid: "gclid-123",
          fbclid: "fbclid-456",
        }),
      });
    });
  });
});

describe("PATCH /api/tracking/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
  });

  describe("Request validation", () => {
    it("should return 400 for missing sessionId", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          exitPage: "/about",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for no update fields provided", async () => {
      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No update fields provided");
    });
  });

  describe("User validation", () => {
    it("should return 400 when userId does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
          userId: "non-existent-user",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User not found");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-user" },
        select: { id: true },
      });
    });

    it("should update session when userId exists", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-123" } as any);
      vi.mocked(prisma.visitorSession.update).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
        userId: "user-123",
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

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
          userId: "user-123",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe("session-123");
      expect(prisma.visitorSession.update).toHaveBeenCalledWith({
        where: { id: "session-123" },
        data: { userId: "user-123" },
      });
    });

    it("should skip user validation when userId not provided", async () => {
      vi.mocked(prisma.visitorSession.update).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
        userId: null,
        sessionStart: new Date(),
        sessionEnd: new Date(),
        deviceType: null,
        browser: null,
        os: null,
        ipCountry: null,
        ipCity: null,
        referrer: null,
        landingPage: "/",
        exitPage: "/about",
        pageViewCount: 1,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        gclid: null,
        fbclid: null,
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
          exitPage: "/about",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe("session-123");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("Session update", () => {
    it("should update session end time", async () => {
      const sessionEnd = new Date().toISOString();
      vi.mocked(prisma.visitorSession.update).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
        userId: null,
        sessionStart: new Date(),
        sessionEnd: new Date(sessionEnd),
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

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
          sessionEnd,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe("session-123");
      expect(prisma.visitorSession.update).toHaveBeenCalledWith({
        where: { id: "session-123" },
        data: { sessionEnd: expect.any(Date) },
      });
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(prisma.visitorSession.update).mockRejectedValue(
        new Error("Record to update not found"),
      );

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "non-existent-session",
          exitPage: "/about",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Session not found");
    });

    it("should handle foreign key constraint violation gracefully", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-123" } as any);
      const fkError = new Error("Foreign key constraint failed") as Error & {
        code: string;
      };
      fkError.code = "P2003";
      vi.mocked(prisma.visitorSession.update).mockRejectedValue(fkError);

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
          userId: "user-123",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User not found");
    });
  });

  describe("Rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt: Date.now() + 30000,
      });

      const request = new NextRequest("http://localhost/api/tracking/session", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: "session-123",
          exitPage: "/about",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Too many requests");
    });
  });
});
