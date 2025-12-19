/**
 * Page View Tracking API Route Tests
 *
 * Tests for the page view tracking API endpoint including
 * page view recording, session validation, and error handling.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    visitorSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pageView: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock rate limiter
vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(() =>
    Promise.resolve({
      isLimited: false,
      remaining: 199,
      resetAt: Date.now() + 60000,
    })
  ),
}));

const prisma = (await import("@/lib/prisma")).default;
const { checkRateLimit } = await import("@/lib/rate-limiter");

describe("POST /api/tracking/pageview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 199,
      resetAt: Date.now() + 60000,
    });
  });

  describe("Request validation", () => {
    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not valid json {",
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON body");
    });

    it("should return 400 for missing sessionId", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
      expect(data.error).toContain("sessionId");
    });

    it("should return 400 for missing path", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
      expect(data.error).toContain("path");
    });

    it("should return 400 for empty sessionId", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "",
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for empty path", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for sessionId exceeding max length", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "x".repeat(129),
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for path exceeding max length", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/".concat("x".repeat(2049)),
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for invalid timeOnPage", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
            timeOnPage: -1,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for timeOnPage exceeding max (24 hours)", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
            timeOnPage: 86401, // 24 hours + 1 second
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for invalid scrollDepth (below 0)", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
            scrollDepth: -1,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 400 for invalid scrollDepth (above 100)", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
            scrollDepth: 101,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid input");
    });

    it("should return 413 for oversized request", async () => {
      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          headers: {
            "content-length": "3000",
          },
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

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

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("Too many requests");
      expect(response.headers.get("Retry-After")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should use x-forwarded-for for rate limiting", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
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
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          headers: {
            "x-forwarded-for": "10.0.0.1, 192.168.1.1",
          },
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "tracking_pageview:10.0.0.1",
        expect.any(Object),
      );
    });

    it("should use x-real-ip when x-forwarded-for not present", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
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
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          headers: {
            "x-real-ip": "10.0.0.50",
          },
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "tracking_pageview:10.0.0.50",
        expect.any(Object),
      );
    });

    it("should use 'unknown' when no IP headers present", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
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
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "tracking_pageview:unknown",
        expect.any(Object),
      );
    });
  });

  describe("Session validation", () => {
    it("should return 404 for non-existent session", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "non-existent-session",
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Session not found");
    });
  });

  describe("Page view recording", () => {
    it("should record page view with all fields", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
        id: "session-123",
        visitorId: "v_visitor-123",
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
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        if (typeof callback === "function") {
          await callback({
            pageView: { create: vi.fn() },
            visitorSession: { update: vi.fn() },
          });
        }
      });

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
            title: "About Us",
            timeOnPage: 45,
            scrollDepth: 75,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should record page view with minimal fields", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
        id: "session-456",
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
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        if (typeof callback === "function") {
          await callback({
            pageView: { create: vi.fn() },
            visitorSession: { update: vi.fn() },
          });
        }
      });

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-456",
            path: "/pricing",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept valid scrollDepth at boundaries (0 and 100)", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
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
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        if (typeof callback === "function") {
          await callback({
            pageView: { create: vi.fn() },
            visitorSession: { update: vi.fn() },
          });
        }
      });

      // Test scrollDepth = 0
      const request0 = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/test",
            scrollDepth: 0,
          }),
        },
      );
      const response0 = await POST(request0);
      expect(response0.status).toBe(200);

      // Test scrollDepth = 100
      const request100 = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/test",
            scrollDepth: 100,
          }),
        },
      );
      const response100 = await POST(request100);
      expect(response100.status).toBe(200);
    });

    it("should accept valid timeOnPage at boundaries", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
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
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        if (typeof callback === "function") {
          await callback({
            pageView: { create: vi.fn() },
            visitorSession: { update: vi.fn() },
          });
        }
      });

      // Test timeOnPage = 0
      const request0 = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/test",
            timeOnPage: 0,
          }),
        },
      );
      const response0 = await POST(request0);
      expect(response0.status).toBe(200);

      // Test timeOnPage = 86400 (24 hours max)
      const requestMax = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/test",
            timeOnPage: 86400,
          }),
        },
      );
      const responseMax = await POST(requestMax);
      expect(responseMax.status).toBe(200);
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error during session lookup", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 on transaction error", async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue({
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
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Transaction failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/tracking/pageview",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "session-123",
            path: "/about",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
