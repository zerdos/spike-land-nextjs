/**
 * Campaign Performance API Route Tests
 *
 * Tests for the campaigns analytics endpoint including
 * campaign metrics, filtering, pagination, and authorization.
 */

import { UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
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
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    campaignAttribution: {
      findMany: vi.fn(),
    },
    campaignMetricsCache: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/admin/marketing/analytics/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-123",
        name: "Admin",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    // Mock cache to always return null (bypass cache, compute fresh)
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
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          name: "Test",
          email: "test@example.com",
          role: UserRole.USER,
        } as any,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
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
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
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
        "http://localhost/api/admin/marketing/analytics/campaigns?endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for missing endDate", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid date format", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=invalid&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid attributionModel", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31&attributionModel=INVALID",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for limit below minimum", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31&limit=0",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for limit above maximum", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31&limit=101",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for negative offset", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31&offset=-1",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });
  });

  describe("Campaign metrics calculation", () => {
    it("should return campaign metrics with correct structure", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "brand",
          utmSource: "google",
          _count: { id: 100, visitorId: 80 },
          _sum: { pageViewCount: 500 },
        },
        {
          utmCampaign: "retargeting",
          utmSource: "facebook",
          _count: { id: 50, visitorId: 40 },
          _sum: { pageViewCount: 200 },
        },
      ] as unknown as Prisma.GetVisitorSessionGroupByPayload<any>[]);

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { utmCampaign: "brand", utmSource: "google", pageViewCount: 1 },
        { utmCampaign: "brand", utmSource: "google", pageViewCount: 5 },
        { utmCampaign: "retargeting", utmSource: "facebook", pageViewCount: 1 },
        { utmCampaign: "retargeting", utmSource: "facebook", pageViewCount: 3 },
      ] as any);

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([
        {
          utmCampaign: "brand",
          platform: "google",
          conversionType: "SIGNUP",
          conversionValue: null,
        },
        {
          utmCampaign: "brand",
          platform: "google",
          conversionType: "PURCHASE",
          conversionValue: 9.99,
        },
        {
          utmCampaign: "retargeting",
          platform: "facebook",
          conversionType: "ENHANCEMENT",
          conversionValue: 50,
        },
      ] as any);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaigns).toBeInstanceOf(Array);
      expect(data.total).toBe(2);

      // Verify campaign structure
      const brandCampaign = data.campaigns.find(
        (c: Record<string, unknown>) => c.name === "brand",
      );
      expect(brandCampaign).toBeDefined();
      expect(brandCampaign.platform).toBe("Google");
      expect(brandCampaign.sessions).toBe(100);
      expect(brandCampaign.visitors).toBe(500);
    });

    it("should handle empty campaign data", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([] as any);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaigns).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should calculate bounce rate correctly", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "test",
          utmSource: "google",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 15 },
        },
      ]);

      // 3 bounced sessions (1 page view each), 2 engaged sessions
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { utmCampaign: "test", utmSource: "google", pageViewCount: 1 },
        { utmCampaign: "test", utmSource: "google", pageViewCount: 1 },
        { utmCampaign: "test", utmSource: "google", pageViewCount: 1 },
        { utmCampaign: "test", utmSource: "google", pageViewCount: 5 },
        { utmCampaign: "test", utmSource: "google", pageViewCount: 3 },
      ]);

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const campaign = data.campaigns[0];
      expect(campaign.bounceRate).toBe(60); // 3/5 * 100
    });

    it("should handle Direct traffic (null utmCampaign)", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: null,
          utmSource: null,
          _count: { id: 50, visitorId: 40 },
          _sum: { pageViewCount: 100 },
        },
      ]);

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { utmCampaign: null, utmSource: null, pageViewCount: 2 },
      ]);

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const directCampaign = data.campaigns.find(
        (c: Record<string, unknown>) => c.name === "Direct",
      );
      expect(directCampaign).toBeDefined();
      expect(directCampaign.platform).toBe("Direct");
    });
  });

  describe("Platform detection", () => {
    it("should detect Facebook platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "social",
          utmSource: "facebook",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("Facebook");
    });

    it("should detect Google platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "search",
          utmSource: "google",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("Google");
    });

    it("should detect Twitter/X platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "social",
          utmSource: "twitter",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("Twitter/X");
    });

    it("should detect LinkedIn platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "b2b",
          utmSource: "linkedin",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("LinkedIn");
    });

    it("should detect TikTok platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "viral",
          utmSource: "tiktok",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("TikTok");
    });

    it("should detect Email platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "weekly",
          utmSource: "newsletter",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("Email");
    });

    it("should detect Referral platform from source", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "partner",
          utmSource: "referral",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("Referral");
    });

    it("should default to Organic for unknown sources", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "test",
          utmSource: "unknown_source",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 20 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.campaigns[0].platform).toBe("Organic");
    });
  });

  describe("Filtering", () => {
    it("should filter by platform", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31&platform=google",
      );

      await GET(request);

      expect(prisma.visitorSession.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            utmSource: "google",
          }),
        }),
      );
    });
  });

  describe("Pagination", () => {
    it("should apply default pagination (limit=50, offset=0)", async () => {
      const campaigns = Array.from({ length: 60 }, (_, i) => ({
        utmCampaign: `campaign-${i}`,
        utmSource: "google",
        _count: { id: 10, visitorId: 10 },
        _sum: { pageViewCount: 20 },
      }));

      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue(campaigns);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaigns.length).toBe(50);
      expect(data.total).toBe(60);
    });

    it("should apply custom pagination", async () => {
      const campaigns = Array.from({ length: 30 }, (_, i) => ({
        utmCampaign: `campaign-${i}`,
        utmSource: "google",
        _count: { id: 10, visitorId: 10 },
        _sum: { pageViewCount: 20 },
      }));

      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue(campaigns);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31&limit=10&offset=5",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaigns.length).toBe(10);
      expect(data.total).toBe(30);
    });
  });

  describe("Sorting", () => {
    it("should sort campaigns by visitors descending", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        {
          utmCampaign: "low",
          utmSource: "google",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 50 },
        },
        {
          utmCampaign: "high",
          utmSource: "google",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 200 },
        },
        {
          utmCampaign: "medium",
          utmSource: "google",
          _count: { id: 10, visitorId: 10 },
          _sum: { pageViewCount: 100 },
        },
      ]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaigns[0].name).toBe("high");
      expect(data.campaigns[1].name).toBe("medium");
      expect(data.campaigns[2].name).toBe("low");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(prisma.visitorSession.groupBy).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/campaigns?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
