/**
 * Campaign Analytics Overview API Route Tests
 *
 * Tests for the analytics overview endpoint including
 * metrics calculation, trend comparison, and authorization.
 */

// @ts-nocheck - Test file with extensive Prisma mocking where strict types add no value
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock admin middleware
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    visitorSession: {
      findMany: vi.fn(),
    },
    campaignAttribution: {
      findMany: vi.fn(),
    },
    campaignMetricsCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/admin/marketing/analytics/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", name: "Admin", email: "admin@example.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    // Return null for cache to force fresh computation
    vi.mocked(prisma.campaignMetricsCache.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.campaignMetricsCache.upsert).mockResolvedValue({
      id: "cache-1",
      cacheKey: "test",
      metrics: {},
      computedAt: new Date(),
      expiresAt: new Date(),
    });
  });

  describe("Authentication and authorization", () => {
    it("should return 401 for unauthenticated request", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { name: "Test", email: "test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin user", async () => {
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });

  describe("Request validation", () => {
    it("should return 400 for missing startDate", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for missing endDate", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid startDate format", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=invalid&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid endDate format", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=not-a-date",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid attributionModel", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31&attributionModel=INVALID",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });
  });

  describe("Metrics calculation", () => {
    it("should return overview metrics with correct calculations", async () => {
      // Mock current period sessions (called twice: once for metrics, once for daily)
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([
          {
            id: "s1",
            visitorId: "v1",
            pageViewCount: 5,
            sessionStart: new Date("2024-01-15"),
          },
          {
            id: "s2",
            visitorId: "v2",
            pageViewCount: 3,
            sessionStart: new Date("2024-01-15"),
          },
          {
            id: "s3",
            visitorId: "v1",
            pageViewCount: 2,
            sessionStart: new Date("2024-01-16"),
          },
        ])
        // Previous period sessions
        .mockResolvedValueOnce([
          {
            id: "s4",
            visitorId: "v3",
            pageViewCount: 4,
            sessionStart: new Date("2024-01-01"),
          },
        ])
        // Daily metrics query
        .mockResolvedValueOnce([
          { sessionStart: new Date("2024-01-15"), visitorId: "v1" },
          { sessionStart: new Date("2024-01-15"), visitorId: "v2" },
        ])
        // Traffic sources query
        .mockResolvedValueOnce([
          { utmSource: "google", referrer: null, gclid: null, fbclid: null },
        ]);

      // Mock current period attributions
      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([
          { conversionType: "SIGNUP", conversionValue: null },
          { conversionType: "SIGNUP", conversionValue: null },
          { conversionType: "ENHANCEMENT", conversionValue: 50 },
          { conversionType: "PURCHASE", conversionValue: 9.99 },
          { conversionType: "PURCHASE", conversionValue: 19.99 },
        ])
        // Previous period attributions
        .mockResolvedValueOnce([
          { conversionType: "SIGNUP", conversionValue: null },
          { conversionType: "PURCHASE", conversionValue: 9.99 },
        ])
        // Daily conversions query
        .mockResolvedValueOnce([
          { convertedAt: new Date("2024-01-15") },
        ]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // New response structure: metrics object
      expect(data.metrics.visitors).toBe(2); // Unique visitors: v1 and v2
      expect(data.metrics.signups).toBe(2);
      expect(data.metrics.revenue).toBe(29.98); // 9.99 + 19.99

      // Conversion rate is signup/uniqueVisitors
      expect(data.metrics.conversionRate).toBe(100); // 2/2 * 100

      // Trends (visitorsChange, signupsChange, revenueChange)
      expect(data.metrics.visitorsChange).toBe(100); // (2-1)/1 * 100
      expect(data.metrics.signupsChange).toBe(100); // (2-1)/1 * 100
      expect(data.metrics.revenueChange).toBeGreaterThan(0); // (29.98-9.99)/9.99 * 100

      // Should have daily and trafficSources arrays
      expect(Array.isArray(data.daily)).toBe(true);
      expect(Array.isArray(data.trafficSources)).toBe(true);
    });

    it("should handle empty data with zero values", async () => {
      // Mock all 4 visitorSession queries (metrics current, metrics previous, daily, traffic)
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([]) // Current period metrics
        .mockResolvedValueOnce([]) // Previous period metrics
        .mockResolvedValueOnce([]) // Daily metrics
        .mockResolvedValueOnce([]); // Traffic sources

      // Mock all 3 campaignAttribution queries
      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([]) // Current period attributions
        .mockResolvedValueOnce([]) // Previous period attributions
        .mockResolvedValueOnce([]); // Daily conversions

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // New response structure
      expect(data.metrics.visitors).toBe(0);
      expect(data.metrics.signups).toBe(0);
      expect(data.metrics.revenue).toBe(0);
      expect(data.metrics.conversionRate).toBe(0);
      expect(data.metrics.visitorsChange).toBe(0);
      expect(data.metrics.signupsChange).toBe(0);
      expect(data.metrics.revenueChange).toBe(0);

      // Should have daily and trafficSources arrays (empty but present)
      expect(Array.isArray(data.daily)).toBe(true);
      expect(Array.isArray(data.trafficSources)).toBe(true);
    });

    it("should calculate positive trend when growing from zero", async () => {
      // Mock all 4 visitorSession queries
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([
          {
            id: "s1",
            visitorId: "v1",
            pageViewCount: 5,
            sessionStart: new Date("2024-01-15"),
          },
        ])
        .mockResolvedValueOnce([]) // Previous period empty
        .mockResolvedValueOnce([
          { sessionStart: new Date("2024-01-15"), visitorId: "v1" },
        ]) // Daily metrics
        .mockResolvedValueOnce([
          { utmSource: null, referrer: null, gclid: null, fbclid: null },
        ]); // Traffic sources

      // Mock all 3 campaignAttribution queries
      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([
          { conversionType: "SIGNUP", conversionValue: null },
        ])
        .mockResolvedValueOnce([]) // Previous period empty
        .mockResolvedValueOnce([]); // Daily conversions

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.visitorsChange).toBe(100); // Growth from 0
      expect(data.metrics.signupsChange).toBe(100); // Growth from 0
    });

    it("should use LAST_TOUCH attribution when specified", async () => {
      // Mock all required queries
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]) // Daily
        .mockResolvedValueOnce([]); // Traffic sources

      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]); // Daily conversions

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31&attributionModel=LAST_TOUCH",
      );

      await GET(request);

      expect(prisma.campaignAttribution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            attributionType: "LAST_TOUCH",
          }),
        }),
      );
    });

    it("should default to FIRST_TOUCH attribution", async () => {
      // Mock all required queries
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]) // Daily
        .mockResolvedValueOnce([]); // Traffic sources

      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]); // Daily conversions

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      await GET(request);

      expect(prisma.campaignAttribution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            attributionType: "FIRST_TOUCH",
          }),
        }),
      );
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 on attribution query error", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockRejectedValue(
        new Error("Attribution query failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("Date range handling", () => {
    it("should include entire end day", async () => {
      // Mock all required queries
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]) // Daily
        .mockResolvedValueOnce([]); // Traffic sources
      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]); // Daily conversions

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-15&endDate=2024-01-15",
      );

      await GET(request);

      // Check that the end date includes the entire day
      const sessionCall = vi.mocked(prisma.visitorSession.findMany).mock
        .calls[0][0];
      expect(sessionCall?.where?.sessionStart?.lte).toBeDefined();

      const endDate = sessionCall?.where?.sessionStart?.lte as Date;
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
    });

    it("should calculate previous period correctly", async () => {
      // Mock all required queries
      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]) // Daily
        .mockResolvedValueOnce([]); // Traffic sources
      vi.mocked(prisma.campaignAttribution.findMany)
        .mockResolvedValueOnce([]) // Current period
        .mockResolvedValueOnce([]) // Previous period
        .mockResolvedValueOnce([]); // Daily conversions

      // 7-day period: Jan 8 to Jan 14
      // Previous period should be: Jan 1 to Jan 7
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/overview?startDate=2024-01-08&endDate=2024-01-14",
      );

      await GET(request);

      // Second call is for previous period
      const prevSessionCall = vi.mocked(prisma.visitorSession.findMany).mock
        .calls[1][0];
      const prevStart = prevSessionCall?.where?.sessionStart?.gte as Date;
      const prevEnd = prevSessionCall?.where?.sessionStart?.lte as Date;

      // Previous period should be 7 days before
      expect(prevStart.getDate()).toBe(1);
      expect(prevEnd.getDate()).toBe(7);
    });
  });
});
