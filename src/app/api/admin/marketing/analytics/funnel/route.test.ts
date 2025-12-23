/**
 * Conversion Funnel API Route Tests
 *
 * Tests for the funnel analytics endpoint including
 * funnel stage calculation, filtering, and authorization.
 */

import { UserRole } from "@prisma/client";
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
  },
}));

const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/admin/marketing/analytics/funnel", () => {
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
  });

  describe("Authentication and authorization", () => {
    it("should return 401 for unauthenticated request", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
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
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
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
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
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
        "http://localhost/api/admin/marketing/analytics/funnel?endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for missing endDate", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid startDate format", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=invalid&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });

    it("should return 400 for invalid endDate format", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=not-a-date",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid parameters");
    });
  });

  describe("Funnel metrics calculation", () => {
    it("should return funnel stages with correct structure", async () => {
      // Mock unique visitors
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { visitorId: "v1" },
        { visitorId: "v2" },
        { visitorId: "v3" },
        { visitorId: "v4" },
        { visitorId: "v5" },
      ] as unknown as never);

      // Mock unique users per conversion type (3 signups, 2 enhancements, 1 purchase)
      vi.mocked(prisma.campaignAttribution.findMany).mockImplementation(
        async (args: { where?: { conversionType?: string; }; }) => {
          const conversionType = args?.where?.conversionType;
          if (conversionType === "SIGNUP") {
            return [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }] as unknown as never;
          }
          if (conversionType === "ENHANCEMENT") {
            return [{ userId: "u1" }, { userId: "u2" }] as unknown as never;
          }
          if (conversionType === "PURCHASE") {
            return [{ userId: "u1" }] as unknown as never;
          }
          return [] as unknown as never;
        },
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stages).toBeInstanceOf(Array);
      expect(data.stages.length).toBe(4);
      expect(data.campaigns).toBeInstanceOf(Array);

      // Verify stage structure
      expect(data.stages[0]).toEqual({
        name: "Visitors",
        count: 5,
        conversionRate: 100,
        dropoffRate: 40, // (5-3)/5 * 100
      });

      expect(data.stages[1]).toEqual({
        name: "Signups",
        count: 3,
        conversionRate: 60, // 3/5 * 100
        dropoffRate: 33.33, // (3-2)/3 * 100
      });

      expect(data.stages[2]).toEqual({
        name: "Enhancements",
        count: 2,
        conversionRate: 66.67, // 2/3 * 100, rounded
        dropoffRate: 50, // (2-1)/2 * 100
      });

      expect(data.stages[3]).toEqual({
        name: "Purchases",
        count: 1,
        conversionRate: 50, // 1/2 * 100
        dropoffRate: 0, // Last stage has no dropoff
      });
    });

    it("should handle zero visitors", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([] as unknown as never);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([] as unknown as never);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stages[0]).toEqual({
        name: "Visitors",
        count: 0,
        conversionRate: 100,
        dropoffRate: 0,
      });
      expect(data.stages[1]).toEqual({
        name: "Signups",
        count: 0,
        conversionRate: 0,
        dropoffRate: 0,
      });
      expect(data.stages[2]).toEqual({
        name: "Enhancements",
        count: 0,
        conversionRate: 0,
        dropoffRate: 0,
      });
      expect(data.stages[3]).toEqual({
        name: "Purchases",
        count: 0,
        conversionRate: 0,
        dropoffRate: 0,
      });
    });

    it("should handle visitors with no conversions", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { visitorId: "v1" },
        { visitorId: "v2" },
        { visitorId: "v3" },
      ] as unknown as never);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([] as unknown as never);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stages[0].count).toBe(3);
      expect(data.stages[1].count).toBe(0);
      expect(data.stages[1].conversionRate).toBe(0);
    });

    it("should handle signups with no enhancements", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { visitorId: "v1" },
        { visitorId: "v2" },
      ]);
      vi.mocked(prisma.campaignAttribution.findMany).mockImplementation(
        async (args: { where?: { conversionType?: string; }; }) => {
          const conversionType = args?.where?.conversionType;
          if (conversionType === "SIGNUP") {
            return [{ userId: "u1" }, { userId: "u2" }];
          }
          return [];
        },
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stages[1].count).toBe(2);
      expect(data.stages[2].count).toBe(0);
      expect(data.stages[2].conversionRate).toBe(0);
    });

    it("should handle enhancements with no purchases", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { visitorId: "v1" },
      ]);
      vi.mocked(prisma.campaignAttribution.findMany).mockImplementation(
        async (args: { where?: { conversionType?: string; }; }) => {
          const conversionType = args?.where?.conversionType;
          if (conversionType === "SIGNUP") {
            return [{ userId: "u1" }];
          }
          if (conversionType === "ENHANCEMENT") {
            return [{ userId: "u1" }];
          }
          return [];
        },
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stages[2].count).toBe(1);
      expect(data.stages[3].count).toBe(0);
      expect(data.stages[3].conversionRate).toBe(0);
    });
  });

  describe("Filtering", () => {
    it("should filter by utmCampaign", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31&utmCampaign=brand",
      );

      await GET(request);

      // Check first call (visitors) has utmCampaign filter
      expect(vi.mocked(prisma.visitorSession.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            utmCampaign: "brand",
          }),
        }),
      );

      // Check attribution calls have utmCampaign filter
      expect(vi.mocked(prisma.campaignAttribution.findMany))
        .toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              utmCampaign: "brand",
            }),
          }),
        );
    });

    it("should filter by platform", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31&platform=google",
      );

      await GET(request);

      expect(vi.mocked(prisma.visitorSession.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            utmSource: {
              contains: "google",
              mode: "insensitive",
            },
          }),
        }),
      );

      expect(vi.mocked(prisma.campaignAttribution.findMany))
        .toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              platform: {
                contains: "google",
                mode: "insensitive",
              },
            }),
          }),
        );
    });

    it("should filter by both utmCampaign and platform", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31&utmCampaign=brand&platform=google",
      );

      await GET(request);

      expect(vi.mocked(prisma.visitorSession.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            utmCampaign: "brand",
            utmSource: {
              contains: "google",
              mode: "insensitive",
            },
          }),
        }),
      );
    });
  });

  describe("Date range handling", () => {
    it("should include entire end day", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-15&endDate=2024-01-15",
      );

      await GET(request);

      const sessionCall = vi.mocked(prisma.visitorSession.findMany).mock
        .calls[0][0];
      const endDate = sessionCall?.where?.sessionStart?.lte as Date;

      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error during session lookup", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 on database error during attribution lookup", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { visitorId: "v1" },
      ]);
      vi.mocked(prisma.campaignAttribution.findMany).mockRejectedValue(
        new Error("Attribution query failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("Conversion rate precision", () => {
    it("should round conversion rates to 2 decimal places", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([
        { visitorId: "v1" },
        { visitorId: "v2" },
        { visitorId: "v3" },
      ]);
      vi.mocked(prisma.campaignAttribution.findMany).mockImplementation(
        async (args: { where?: { conversionType?: string; }; }) => {
          const conversionType = args?.where?.conversionType;
          if (conversionType === "SIGNUP") {
            return [{ userId: "u1" }];
          }
          return [];
        },
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/funnel?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      // 1/3 = 0.3333... should be 33.33
      expect(data.stages[1].conversionRate).toBe(33.33);
    });
  });
});
