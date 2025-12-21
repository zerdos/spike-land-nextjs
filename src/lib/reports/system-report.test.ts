/**
 * System Report Aggregator Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearReportCache,
  generateSystemReport,
  generateSystemReportSummary,
  getDateRangeForPeriod,
} from "./system-report";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    account: {
      groupBy: vi.fn(),
    },
    imageEnhancementJob: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    tokenTransaction: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    tokenBalance: {
      aggregate: vi.fn(),
    },
    voucher: {
      count: vi.fn(),
    },
    visitorSession: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    errorLog: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Mock external clients
vi.mock("./vercel-analytics-client", () => ({
  fetchVercelAnalytics: vi.fn(),
}));

vi.mock("./meta-marketing-client", () => ({
  fetchMetaAdsAggregated: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { fetchMetaAdsAggregated } from "./meta-marketing-client";
import { fetchVercelAnalytics } from "./vercel-analytics-client";

describe("System Report Aggregator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearReportCache();
  });

  afterEach(() => {
    clearReportCache();
  });

  describe("getDateRangeForPeriod", () => {
    it("should calculate 7 day range", () => {
      const { startDate, endDate } = getDateRangeForPeriod("7d");

      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(diffDays).toBe(7);
    });

    it("should calculate 30 day range", () => {
      const { startDate, endDate } = getDateRangeForPeriod("30d");

      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(diffDays).toBe(30);
    });

    it("should calculate 90 day range", () => {
      const { startDate, endDate } = getDateRangeForPeriod("90d");

      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(diffDays).toBe(90);
    });
  });

  describe("generateSystemReport", () => {
    beforeEach(() => {
      // Setup default mock responses
      vi.mocked(prisma.user.count).mockResolvedValue(100);
      vi.mocked(prisma.account.groupBy).mockResolvedValue([
        { provider: "google", _count: { _all: 60 } },
        { provider: "github", _count: { _all: 40 } },
      ]);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(500);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.tokenTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 5000 },
        _avg: { amount: null },
        _count: 0,
        _max: { amount: null },
        _min: { amount: null },
      });
      vi.mocked(prisma.tokenTransaction.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.tokenBalance.aggregate).mockResolvedValue({
        _sum: { balance: 10000 },
        _avg: { balance: null },
        _count: 0,
        _max: { balance: null },
        _min: { balance: null },
      });
      vi.mocked(prisma.voucher.count).mockResolvedValue(5);
      vi.mocked(prisma.visitorSession.count).mockResolvedValue(1000);
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(25);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);
      vi.mocked(fetchVercelAnalytics).mockResolvedValue(null);
      vi.mocked(fetchMetaAdsAggregated).mockResolvedValue(null);
    });

    it("should generate a full report with all sections", async () => {
      const report = await generateSystemReport("30d");

      expect(report.generatedAt).toBeDefined();
      expect(report.period.start).toBeDefined();
      expect(report.period.end).toBeDefined();
      expect(report.platform).toBeDefined();
      expect(report.users).toBeDefined();
      expect(report.tokens).toBeDefined();
      expect(report.health).toBeDefined();
      expect(report.marketing).toBeDefined();
      expect(report.errors).toBeDefined();
    });

    it("should only include requested sections", async () => {
      const report = await generateSystemReport("30d", ["platform", "errors"]);

      expect(report.platform).toBeDefined();
      expect(report.errors).toBeDefined();
      expect(report.users).toBeUndefined();
      expect(report.tokens).toBeUndefined();
    });

    it("should fetch platform metrics correctly", async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(5); // admin count

      vi.mocked(prisma.imageEnhancementJob.count)
        .mockResolvedValueOnce(500) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5) // processing
        .mockResolvedValueOnce(480) // completed
        .mockResolvedValueOnce(5); // failed

      const report = await generateSystemReport("30d", ["platform"]);

      expect(report.platform?.totalUsers).toBe(100);
      expect(report.platform?.adminCount).toBe(5);
      expect(report.platform?.totalEnhancements).toBe(500);
      expect(report.platform?.jobStatus.pending).toBe(10);
    });

    it("should fetch user metrics correctly", async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // 7 days
        .mockResolvedValueOnce(30); // 30 days

      vi.mocked(prisma.visitorSession.findMany)
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]) // 7 days active
        .mockResolvedValueOnce([
          { userId: "u1" },
          { userId: "u2" },
          { userId: "u3" },
        ]); // 30 days active

      const report = await generateSystemReport("30d", ["users"]);

      expect(report.users?.totalUsers).toBe(100);
      expect(report.users?.newUsersLast7Days).toBe(10);
      expect(report.users?.activeUsersLast7Days).toBe(2);
      expect(report.users?.activeUsersLast30Days).toBe(3);
    });

    it("should fetch error metrics correctly", async () => {
      vi.mocked(prisma.errorLog.count).mockResolvedValue(50);
      vi.mocked(prisma.errorLog.groupBy)
        .mockResolvedValueOnce([
          { errorType: "TypeError", _count: { _all: 20 } },
          { errorType: "NetworkError", _count: { _all: 15 } },
        ])
        .mockResolvedValueOnce([
          { sourceFile: "api/enhance.ts", _count: { _all: 25 } },
        ]);

      const report = await generateSystemReport("30d", ["errors"]);

      expect(report.errors?.last24Hours).toBe(50);
      expect(report.errors?.topErrorTypes["TypeError"]).toBe(20);
      expect(report.errors?.topErrorFiles["api/enhance.ts"]).toBe(25);
    });

    it("should include external data when requested", async () => {
      vi.mocked(fetchVercelAnalytics).mockResolvedValue({
        pageViews: 10000,
        uniqueVisitors: 5000,
        topPages: [],
        countries: [],
        devices: { desktop: 3000, mobile: 1800, tablet: 200 },
      });

      vi.mocked(fetchMetaAdsAggregated).mockResolvedValue({
        campaigns: [],
        totalSpend: 1000,
        totalImpressions: 50000,
        totalClicks: 1000,
        totalConversions: 50,
        ctr: 2.0,
        cpc: 1.0,
      });

      const report = await generateSystemReport("30d", ["vercel", "meta"]);

      expect(report.external?.vercelAnalytics?.pageViews).toBe(10000);
      expect(report.external?.metaAds?.totalSpend).toBe(1000);
    });

    it("should cache external API results", async () => {
      // Use fake timers to ensure consistent dates for cache key
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));

      // Clear cache before test
      clearReportCache();

      vi.mocked(fetchVercelAnalytics).mockResolvedValue({
        pageViews: 10000,
        uniqueVisitors: 5000,
        topPages: [],
        countries: [],
        devices: { desktop: 0, mobile: 0, tablet: 0 },
      });

      // First call
      await generateSystemReport("30d", ["vercel"]);
      expect(fetchVercelAnalytics).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await generateSystemReport("30d", ["vercel"]);
      expect(fetchVercelAnalytics).toHaveBeenCalledTimes(1);

      // Restore real timers
      vi.useRealTimers();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.user.count).mockRejectedValue(new Error("DB Error"));

      const report = await generateSystemReport("30d", ["platform"]);

      // Should still return a report with period info
      expect(report.generatedAt).toBeDefined();
      expect(report.period).toBeDefined();
      // Platform should be undefined due to error
      expect(report.platform).toBeUndefined();
    });

    it("should handle external API errors gracefully", async () => {
      vi.mocked(fetchVercelAnalytics).mockRejectedValue(
        new Error("API Error"),
      );

      const report = await generateSystemReport("30d", ["vercel"]);

      // Should still complete without throwing
      expect(report.generatedAt).toBeDefined();
      expect(report.external?.vercelAnalytics).toBeUndefined();
    });
  });

  describe("generateSystemReportSummary", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.count).mockResolvedValue(100);
      vi.mocked(prisma.account.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(500);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.tokenTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 5000 },
        _avg: { amount: null },
        _count: 0,
        _max: { amount: null },
        _min: { amount: null },
      });
      vi.mocked(prisma.tokenBalance.aggregate).mockResolvedValue({
        _sum: { balance: 10000 },
        _avg: { balance: null },
        _count: 0,
        _max: { balance: null },
        _min: { balance: null },
      });
      vi.mocked(prisma.voucher.count).mockResolvedValue(5);
      vi.mocked(prisma.visitorSession.count).mockResolvedValue(1000);
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(25);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);
      vi.mocked(fetchVercelAnalytics).mockResolvedValue(null);
      vi.mocked(fetchMetaAdsAggregated).mockResolvedValue(null);
    });

    it("should generate a summary report", async () => {
      const summary = await generateSystemReportSummary("30d");

      expect(summary.generatedAt).toBeDefined();
      expect(summary.period).toBeDefined();
      expect(summary.highlights).toBeDefined();
      expect(summary.highlights.totalUsers).toBe(100);
    });

    it("should include external highlights when available", async () => {
      vi.mocked(fetchVercelAnalytics).mockResolvedValue({
        pageViews: 10000,
        uniqueVisitors: 5000,
        topPages: [],
        countries: [],
        devices: { desktop: 0, mobile: 0, tablet: 0 },
      });

      vi.mocked(fetchMetaAdsAggregated).mockResolvedValue({
        campaigns: [],
        totalSpend: 1000,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        ctr: 0,
        cpc: 0,
      });

      const summary = await generateSystemReportSummary("30d");

      expect(summary.external?.vercelPageViews).toBe(10000);
      expect(summary.external?.metaTotalSpend).toBe(1000);
    });
  });

  describe("clearReportCache", () => {
    it("should clear the cache", async () => {
      vi.mocked(fetchVercelAnalytics).mockResolvedValue({
        pageViews: 10000,
        uniqueVisitors: 5000,
        topPages: [],
        countries: [],
        devices: { desktop: 0, mobile: 0, tablet: 0 },
      });

      // First call
      await generateSystemReport("30d", ["vercel"]);
      expect(fetchVercelAnalytics).toHaveBeenCalledTimes(1);

      // Clear cache
      clearReportCache();

      // Should call again after cache clear
      await generateSystemReport("30d", ["vercel"]);
      expect(fetchVercelAnalytics).toHaveBeenCalledTimes(2);
    });
  });
});
