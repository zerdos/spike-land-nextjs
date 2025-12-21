/**
 * System Report Types Tests
 *
 * Type validation tests for the system report interfaces.
 */

import { describe, expect, it } from "vitest";

import type {
  ErrorMetrics,
  ExternalData,
  HealthMetrics,
  MarketingMetrics,
  MetaAdsData,
  PartialSystemReport,
  PlatformMetrics,
  ReportFormat,
  ReportPeriod,
  ReportPeriodOption,
  ReportSection,
  SystemReport,
  SystemReportRequest,
  SystemReportSummary,
  TokenMetrics,
  UserMetrics,
  VercelAnalyticsData,
} from "./types";

describe("System Report Types", () => {
  describe("PlatformMetrics", () => {
    it("should define platform metrics structure", () => {
      const metrics: PlatformMetrics = {
        totalUsers: 1000,
        adminCount: 5,
        totalEnhancements: 5000,
        jobStatus: {
          pending: 10,
          processing: 5,
          completed: 4900,
          failed: 85,
          active: 15,
        },
        tokensInCirculation: 50000,
        tokensSpent: 25000,
        activeVouchers: 3,
      };

      expect(metrics.totalUsers).toBe(1000);
      expect(metrics.jobStatus.active).toBe(15);
    });
  });

  describe("UserMetrics", () => {
    it("should define user metrics structure", () => {
      const metrics: UserMetrics = {
        totalUsers: 1000,
        newUsersLast7Days: 50,
        newUsersLast30Days: 200,
        activeUsersLast7Days: 300,
        activeUsersLast30Days: 600,
        authProviderBreakdown: [
          { provider: "google", count: 600 },
          { provider: "github", count: 300 },
          { provider: "email", count: 100 },
        ],
      };

      expect(metrics.authProviderBreakdown).toHaveLength(3);
      expect(metrics.newUsersLast7Days).toBe(50);
    });
  });

  describe("TokenMetrics", () => {
    it("should define token metrics structure", () => {
      const metrics: TokenMetrics = {
        totalRevenue: 10000,
        tokensInCirculation: 50000,
        averageTokensPerUser: 50,
        packageSales: [
          { name: "Starter", tokens: 10, sales: 100 },
          { name: "Pro", tokens: 50, sales: 50 },
        ],
      };

      expect(metrics.packageSales).toHaveLength(2);
      expect(metrics.totalRevenue).toBe(10000);
    });
  });

  describe("HealthMetrics", () => {
    it("should define health metrics structure", () => {
      const metrics: HealthMetrics = {
        queueDepth: 15,
        recentFailures: 5,
        avgProcessingTimeByTier: [
          { tier: "TIER_1K", seconds: 30 },
          { tier: "TIER_2K", seconds: 60 },
          { tier: "TIER_4K", seconds: 120 },
        ],
        failureRateByTier: [
          { tier: "TIER_1K", failureRate: 0.01 },
          { tier: "TIER_2K", failureRate: 0.02 },
          { tier: "TIER_4K", failureRate: 0.03 },
        ],
      };

      expect(metrics.queueDepth).toBe(15);
      expect(metrics.avgProcessingTimeByTier).toHaveLength(3);
    });
  });

  describe("MarketingMetrics", () => {
    it("should define marketing metrics structure", () => {
      const metrics: MarketingMetrics = {
        visitors: 5000,
        visitorsChange: 10.5,
        signups: 100,
        signupsChange: 5.2,
        conversionRate: 2.0,
        revenue: 5000,
        trafficSources: [
          { name: "organic", value: 3000 },
          { name: "paid", value: 1500 },
          { name: "referral", value: 500 },
        ],
      };

      expect(metrics.conversionRate).toBe(2.0);
      expect(metrics.trafficSources).toHaveLength(3);
    });
  });

  describe("ErrorMetrics", () => {
    it("should define error metrics structure", () => {
      const metrics: ErrorMetrics = {
        last24Hours: 25,
        topErrorTypes: {
          TypeError: 10,
          NetworkError: 8,
          ValidationError: 7,
        },
        topErrorFiles: {
          "api/enhance.ts": 15,
          "lib/storage.ts": 10,
        },
      };

      expect(metrics.last24Hours).toBe(25);
      expect(Object.keys(metrics.topErrorTypes)).toHaveLength(3);
    });
  });

  describe("VercelAnalyticsData", () => {
    it("should define Vercel analytics structure", () => {
      const data: VercelAnalyticsData = {
        pageViews: 10000,
        uniqueVisitors: 5000,
        topPages: [
          { path: "/", views: 5000 },
          { path: "/enhance", views: 3000 },
        ],
        countries: [
          { country: "US", visitors: 2000 },
          { country: "UK", visitors: 1000 },
        ],
        devices: {
          desktop: 3000,
          mobile: 1800,
          tablet: 200,
        },
      };

      expect(data.pageViews).toBe(10000);
      expect(data.devices.desktop).toBe(3000);
    });
  });

  describe("MetaAdsData", () => {
    it("should define Meta ads structure", () => {
      const data: MetaAdsData = {
        campaigns: [
          {
            id: "camp_123",
            name: "Summer Sale",
            status: "ACTIVE",
            spend: 1000,
            impressions: 50000,
            clicks: 1000,
            conversions: 50,
          },
        ],
        totalSpend: 1000,
        totalImpressions: 50000,
        totalClicks: 1000,
        totalConversions: 50,
        ctr: 2.0,
        cpc: 1.0,
      };

      expect(data.campaigns).toHaveLength(1);
      expect(data.ctr).toBe(2.0);
    });
  });

  describe("SystemReport", () => {
    it("should define complete system report structure", () => {
      const report: SystemReport = {
        generatedAt: new Date().toISOString(),
        period: {
          start: "2024-01-01",
          end: "2024-01-31",
        },
        platform: {
          totalUsers: 1000,
          adminCount: 5,
          totalEnhancements: 5000,
          jobStatus: {
            pending: 10,
            processing: 5,
            completed: 4900,
            failed: 85,
            active: 15,
          },
          tokensInCirculation: 50000,
          tokensSpent: 25000,
          activeVouchers: 3,
        },
        users: {
          totalUsers: 1000,
          newUsersLast7Days: 50,
          newUsersLast30Days: 200,
          activeUsersLast7Days: 300,
          activeUsersLast30Days: 600,
          authProviderBreakdown: [],
        },
        tokens: {
          totalRevenue: 10000,
          tokensInCirculation: 50000,
          averageTokensPerUser: 50,
          packageSales: [],
        },
        health: {
          queueDepth: 15,
          recentFailures: 5,
          avgProcessingTimeByTier: [],
          failureRateByTier: [],
        },
        marketing: {
          visitors: 5000,
          visitorsChange: 10.5,
          signups: 100,
          signupsChange: 5.2,
          conversionRate: 2.0,
          revenue: 5000,
          trafficSources: [],
        },
        errors: {
          last24Hours: 25,
          topErrorTypes: {},
          topErrorFiles: {},
        },
      };

      expect(report.generatedAt).toBeDefined();
      expect(report.period.start).toBe("2024-01-01");
    });

    it("should allow optional external data", () => {
      const external: ExternalData = {
        vercelAnalytics: {
          pageViews: 10000,
          uniqueVisitors: 5000,
          topPages: [],
          countries: [],
          devices: { desktop: 0, mobile: 0, tablet: 0 },
        },
        metaAds: null,
      };

      expect(external.vercelAnalytics?.pageViews).toBe(10000);
      expect(external.metaAds).toBeNull();
    });
  });

  describe("PartialSystemReport", () => {
    it("should allow partial reports with only requested sections", () => {
      const partial: PartialSystemReport = {
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
        platform: {
          totalUsers: 1000,
          adminCount: 5,
          totalEnhancements: 5000,
          jobStatus: {
            pending: 10,
            processing: 5,
            completed: 4900,
            failed: 85,
            active: 15,
          },
          tokensInCirculation: 50000,
          tokensSpent: 25000,
          activeVouchers: 3,
        },
        // Other sections omitted
      };

      expect(partial.platform).toBeDefined();
      expect(partial.users).toBeUndefined();
    });
  });

  describe("SystemReportRequest", () => {
    it("should define request parameters", () => {
      const request: SystemReportRequest = {
        period: "30d",
        include: ["platform", "users", "errors"],
        format: "json",
      };

      expect(request.period).toBe("30d");
      expect(request.include).toContain("platform");
    });

    it("should allow all period options", () => {
      const periods: ReportPeriodOption[] = ["7d", "30d", "90d"];
      expect(periods).toHaveLength(3);
    });

    it("should allow all format options", () => {
      const formats: ReportFormat[] = ["json", "summary"];
      expect(formats).toHaveLength(2);
    });

    it("should allow all section options", () => {
      const sections: ReportSection[] = [
        "platform",
        "users",
        "tokens",
        "health",
        "marketing",
        "errors",
        "vercel",
        "meta",
      ];
      expect(sections).toHaveLength(8);
    });
  });

  describe("SystemReportSummary", () => {
    it("should define summary format structure", () => {
      const summary: SystemReportSummary = {
        generatedAt: new Date().toISOString(),
        period: { start: "2024-01-01", end: "2024-01-31" },
        highlights: {
          totalUsers: 1000,
          activeUsersLast7Days: 300,
          totalEnhancements: 5000,
          pendingJobs: 10,
          failedJobs: 5,
          tokensInCirculation: 50000,
          errorsLast24Hours: 25,
          conversionRate: 2.0,
        },
        external: {
          vercelPageViews: 10000,
          metaTotalSpend: 1000,
        },
      };

      expect(summary.highlights.totalUsers).toBe(1000);
      expect(summary.external?.vercelPageViews).toBe(10000);
    });
  });

  describe("ReportPeriod", () => {
    it("should define period structure", () => {
      const period: ReportPeriod = {
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-01-31T23:59:59.999Z",
      };

      expect(period.start).toBeDefined();
      expect(period.end).toBeDefined();
    });
  });
});
