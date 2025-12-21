/**
 * System Report API Route Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock auth
vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpOrSession: vi.fn(),
}));

// Mock admin middleware
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

// Mock system report
vi.mock("@/lib/reports/system-report", () => ({
  generateSystemReport: vi.fn(),
  generateSystemReportSummary: vi.fn(),
}));

import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { authenticateMcpOrSession } from "@/lib/mcp/auth";
import { generateSystemReport, generateSystemReportSummary } from "@/lib/reports/system-report";
import { NextRequest } from "next/server";

function createRequest(
  searchParams: Record<string, string> = {},
): NextRequest {
  const url = new URL("http://localhost/api/reports/system");
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/reports/system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(authenticateMcpOrSession).mockResolvedValue({
        success: false,
        error: "Missing Authorization header",
      });

      const response = await GET(createRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Missing Authorization header");
    });

    it("should return 403 when not admin", async () => {
      vi.mocked(authenticateMcpOrSession).mockResolvedValue({
        success: true,
        userId: "user_123",
      });
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const response = await GET(createRequest());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Admin access required");
    });

    it("should allow access with valid admin session", async () => {
      vi.mocked(authenticateMcpOrSession).mockResolvedValue({
        success: true,
        userId: "admin_123",
      });
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
        platform: {
          totalUsers: 100,
          adminCount: 5,
          totalEnhancements: 500,
          jobStatus: {
            pending: 10,
            processing: 5,
            completed: 480,
            failed: 5,
            active: 15,
          },
          tokensInCirculation: 10000,
          tokensSpent: 5000,
          activeVouchers: 3,
        },
        users: {
          totalUsers: 100,
          newUsersLast7Days: 10,
          newUsersLast30Days: 30,
          activeUsersLast7Days: 50,
          activeUsersLast30Days: 80,
          authProviderBreakdown: [],
        },
        tokens: {
          totalRevenue: 5000,
          tokensInCirculation: 10000,
          averageTokensPerUser: 100,
          packageSales: [],
        },
        health: {
          queueDepth: 15,
          recentFailures: 5,
          avgProcessingTimeByTier: [],
          failureRateByTier: [],
        },
        marketing: {
          visitors: 1000,
          visitorsChange: 10,
          signups: 50,
          signupsChange: 5,
          conversionRate: 5,
          revenue: 2500,
          trafficSources: [],
        },
        errors: {
          last24Hours: 25,
          topErrorTypes: {},
          topErrorFiles: {},
        },
      });

      const response = await GET(createRequest());

      expect(response.status).toBe(200);
    });

    it("should allow access with valid API key", async () => {
      vi.mocked(authenticateMcpOrSession).mockResolvedValue({
        success: true,
        userId: "admin_123",
        apiKeyId: "key_456",
      });
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
        platform: {
          totalUsers: 100,
          adminCount: 5,
          totalEnhancements: 500,
          jobStatus: {
            pending: 10,
            processing: 5,
            completed: 480,
            failed: 5,
            active: 15,
          },
          tokensInCirculation: 10000,
          tokensSpent: 5000,
          activeVouchers: 3,
        },
        users: {
          totalUsers: 100,
          newUsersLast7Days: 10,
          newUsersLast30Days: 30,
          activeUsersLast7Days: 50,
          activeUsersLast30Days: 80,
          authProviderBreakdown: [],
        },
        tokens: {
          totalRevenue: 5000,
          tokensInCirculation: 10000,
          averageTokensPerUser: 100,
          packageSales: [],
        },
        health: {
          queueDepth: 15,
          recentFailures: 5,
          avgProcessingTimeByTier: [],
          failureRateByTier: [],
        },
        marketing: {
          visitors: 1000,
          visitorsChange: 10,
          signups: 50,
          signupsChange: 5,
          conversionRate: 5,
          revenue: 2500,
          trafficSources: [],
        },
        errors: {
          last24Hours: 25,
          topErrorTypes: {},
          topErrorFiles: {},
        },
      });

      const response = await GET(createRequest());

      expect(response.status).toBe(200);
    });
  });

  describe("Query Parameters", () => {
    beforeEach(() => {
      vi.mocked(authenticateMcpOrSession).mockResolvedValue({
        success: true,
        userId: "admin_123",
      });
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    });

    it("should use default period of 30d", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
      });

      await GET(createRequest());

      expect(generateSystemReport).toHaveBeenCalledWith("30d", expect.any(Array));
    });

    it("should accept 7d period", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-24", end: "2024-01-31" },
      });

      await GET(createRequest({ period: "7d" }));

      expect(generateSystemReport).toHaveBeenCalledWith("7d", expect.any(Array));
    });

    it("should accept 90d period", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2023-11-02", end: "2024-01-31" },
      });

      await GET(createRequest({ period: "90d" }));

      expect(generateSystemReport).toHaveBeenCalledWith("90d", expect.any(Array));
    });

    it("should parse include parameter", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
      });

      await GET(createRequest({ include: "platform,errors,vercel" }));

      expect(generateSystemReport).toHaveBeenCalledWith(
        "30d",
        expect.arrayContaining(["platform", "errors", "vercel"]),
      );
    });

    it("should filter invalid sections", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
      });

      await GET(createRequest({ include: "platform,invalid,errors" }));

      expect(generateSystemReport).toHaveBeenCalledWith(
        "30d",
        expect.arrayContaining(["platform", "errors"]),
      );
    });

    it("should use all sections when include has no valid values", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
      });

      await GET(createRequest({ include: "invalid1,invalid2" }));

      // Should fall back to all sections
      expect(generateSystemReport).toHaveBeenCalledWith(
        "30d",
        expect.arrayContaining([
          "platform",
          "users",
          "tokens",
          "health",
          "marketing",
          "errors",
          "vercel",
          "meta",
        ]),
      );
    });

    it("should call summary generator when format=summary", async () => {
      vi.mocked(generateSystemReportSummary).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
        highlights: {
          totalUsers: 100,
          activeUsersLast7Days: 50,
          totalEnhancements: 500,
          pendingJobs: 10,
          failedJobs: 5,
          tokensInCirculation: 10000,
          errorsLast24Hours: 25,
          conversionRate: 5,
        },
      });

      await GET(createRequest({ format: "summary" }));

      expect(generateSystemReportSummary).toHaveBeenCalledWith("30d");
      expect(generateSystemReport).not.toHaveBeenCalled();
    });
  });

  describe("Response", () => {
    beforeEach(() => {
      vi.mocked(authenticateMcpOrSession).mockResolvedValue({
        success: true,
        userId: "admin_123",
      });
      vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    });

    it("should return JSON report", async () => {
      const mockReport = {
        generatedAt: "2024-01-31T12:00:00.000Z",
        period: { start: "2024-01-01", end: "2024-01-31" },
        platform: {
          totalUsers: 100,
          adminCount: 5,
          totalEnhancements: 500,
          jobStatus: {
            pending: 10,
            processing: 5,
            completed: 480,
            failed: 5,
            active: 15,
          },
          tokensInCirculation: 10000,
          tokensSpent: 5000,
          activeVouchers: 3,
        },
      };

      vi.mocked(generateSystemReport).mockResolvedValue(mockReport);

      const response = await GET(createRequest());
      const body = await response.json();

      expect(body.generatedAt).toBe("2024-01-31T12:00:00.000Z");
      expect(body.platform.totalUsers).toBe(100);
    });

    it("should set cache headers", async () => {
      vi.mocked(generateSystemReport).mockResolvedValue({
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
      });

      const response = await GET(createRequest());

      expect(response.headers.get("Cache-Control")).toBe("private, max-age=300");
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return 500 on report generation error", async () => {
      vi.mocked(generateSystemReport).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET(createRequest());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to generate report");
      expect(body.details).toBe("Database connection failed");
    });
  });
});
