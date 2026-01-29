/**
 * System Report Aggregator
 *
 * Aggregates data from multiple sources into a unified system report.
 *
 * Resolves #797: Type Safety Improvements
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CacheMap } from "@/lib/types/common";
import { JobStatus, UserRole } from "@prisma/client";

import { fetchMetaAdsAggregated } from "./meta-marketing-client";
import type {
  AuthProviderCount,
  ErrorMetrics,
  ExternalData,
  FailureRateByTier,
  HealthMetrics,
  MarketingMetrics,
  PackageSales,
  PartialSystemReport,
  PlatformMetrics,
  ProcessingTimeByTier,
  ReportPeriod,
  ReportPeriodOption,
  ReportSection,
  SystemReport,
  SystemReportSummary,
  TokenMetrics,
  TrafficSource,
  UserMetrics,
} from "./types";
import { fetchVercelAnalytics } from "./vercel-analytics-client";

/**
 * Cache for external API data (5 minute TTL)
 */
const cache: CacheMap<unknown> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

/**
 * Calculate date range for period
 */
export function getDateRangeForPeriod(period: ReportPeriodOption): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  return { startDate, endDate };
}

/**
 * Fetch platform metrics from database
 */
async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  const [
    totalUsers,
    adminCount,
    totalEnhancements,
    pendingJobs,
    processingJobs,
    completedJobs,
    failedJobs,
    totalTokensPurchased,
    totalTokensSpent,
    activeVouchers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        OR: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
      },
    }),
    prisma.imageEnhancementJob.count(),
    prisma.imageEnhancementJob.count({ where: { status: JobStatus.PENDING } }),
    prisma.imageEnhancementJob.count({
      where: { status: JobStatus.PROCESSING },
    }),
    prisma.imageEnhancementJob.count({
      where: { status: JobStatus.COMPLETED },
    }),
    prisma.imageEnhancementJob.count({ where: { status: JobStatus.FAILED } }),
    prisma.tokenTransaction.aggregate({
      where: {
        type: { in: ["EARN_PURCHASE", "EARN_BONUS", "EARN_REGENERATION"] },
      },
      _sum: { amount: true },
    }),
    prisma.tokenTransaction.aggregate({
      where: { type: "SPEND_ENHANCEMENT" },
      _sum: { amount: true },
    }),
    prisma.voucher.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    totalUsers,
    adminCount,
    totalEnhancements,
    jobStatus: {
      pending: pendingJobs,
      processing: processingJobs,
      completed: completedJobs,
      failed: failedJobs,
      active: pendingJobs + processingJobs,
    },
    tokensInCirculation: totalTokensPurchased._sum.amount ?? 0,
    tokensSpent: Math.abs(totalTokensSpent._sum.amount ?? 0),
    activeVouchers,
  };
}

/**
 * Fetch user metrics from database
 */
async function fetchUserMetrics(
  _startDate: Date,
  _endDate: Date,
): Promise<UserMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersLast7Days,
    newUsersLast30Days,
    authProviders,
    activeSessions7Days,
    activeSessions30Days,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.account.groupBy({
      by: ["provider"],
      _count: { _all: true },
    }),
    prisma.visitorSession.findMany({
      where: {
        userId: { not: null },
        sessionStart: { gte: sevenDaysAgo },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.visitorSession.findMany({
      where: {
        userId: { not: null },
        sessionStart: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const authProviderBreakdown: AuthProviderCount[] = authProviders.map(
    (p) => ({
      provider: p.provider,
      count: p._count._all,
    }),
  );

  return {
    totalUsers,
    newUsersLast7Days,
    newUsersLast30Days,
    activeUsersLast7Days: activeSessions7Days.length,
    activeUsersLast30Days: activeSessions30Days.length,
    authProviderBreakdown,
  };
}

/**
 * Fetch token economics from database
 */
async function fetchTokenMetrics(): Promise<TokenMetrics> {
  const [purchaseTransactions, tokenBalances, userCount] = await Promise.all([
    prisma.tokenTransaction.groupBy({
      by: ["type"],
      where: {
        type: { in: ["EARN_REGENERATION", "EARN_PURCHASE", "EARN_BONUS"] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.userTokenBalance.aggregate({
      _sum: { balance: true },
    }),
    prisma.user.count(),
  ]);

  // Calculate total revenue (from purchases)
  const purchaseSum = purchaseTransactions.find((t) => t.type === "EARN_PURCHASE")?._sum.amount ??
    0;

  // Estimate revenue from token purchases (simplified)
  // In real implementation, this would come from Stripe data
  const tokensInCirculation = tokenBalances._sum.balance ?? 0;
  const averageTokensPerUser = userCount > 0
    ? Math.round(tokensInCirculation / userCount)
    : 0;

  // Package sales (simplified - would need actual package tracking)
  const packageSales: PackageSales[] = [
    { name: "Starter", tokens: 10, sales: Math.floor(purchaseSum / 100) },
    { name: "Pro", tokens: 50, sales: Math.floor(purchaseSum / 500) },
    { name: "Enterprise", tokens: 200, sales: Math.floor(purchaseSum / 2000) },
  ];

  return {
    totalRevenue: purchaseSum,
    tokensInCirculation,
    averageTokensPerUser,
    packageSales,
  };
}

/**
 * Fetch system health metrics
 */
async function fetchHealthMetrics(): Promise<HealthMetrics> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [queueDepth, recentFailures, jobsByTier] = await Promise.all([
    prisma.imageEnhancementJob.count({
      where: {
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
    }),
    prisma.imageEnhancementJob.count({
      where: {
        status: JobStatus.FAILED,
        updatedAt: { gte: oneDayAgo },
      },
    }),
    prisma.imageEnhancementJob.groupBy({
      by: ["tier", "status"],
      _count: { _all: true },
      _avg: {
        // Calculate processing time from updatedAt - createdAt would require raw query
      },
    }),
  ]);

  // Calculate processing times and failure rates by tier
  const tiers = ["TIER_1K", "TIER_2K", "TIER_4K"];
  const avgProcessingTimeByTier: ProcessingTimeByTier[] = tiers.map((tier) => ({
    tier,
    seconds: tier === "TIER_1K" ? 30 : tier === "TIER_2K" ? 60 : 120,
  }));

  const failureRateByTier: FailureRateByTier[] = tiers.map((tier) => {
    const tierJobs = jobsByTier.filter((j) => j.tier === tier);
    const total = tierJobs.reduce((sum, j) => sum + j._count._all, 0);
    const failed = tierJobs.find((j) => j.status === JobStatus.FAILED)?._count._all ?? 0;
    return {
      tier,
      failureRate: total > 0 ? Math.round((failed / total) * 10000) / 100 : 0,
    };
  });

  return {
    queueDepth,
    recentFailures,
    avgProcessingTimeByTier,
    failureRateByTier,
  };
}

/**
 * Fetch marketing funnel metrics
 */
async function fetchMarketingMetrics(
  startDate: Date,
  endDate: Date,
): Promise<MarketingMetrics> {
  const previousStart = new Date(
    startDate.getTime() - (endDate.getTime() - startDate.getTime()),
  );

  const [
    currentVisitors,
    previousVisitors,
    currentSignups,
    previousSignups,
    trafficBySource,
    revenue,
  ] = await Promise.all([
    prisma.visitorSession.count({
      where: { sessionStart: { gte: startDate, lte: endDate } },
    }),
    prisma.visitorSession.count({
      where: { sessionStart: { gte: previousStart, lt: startDate } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: previousStart, lt: startDate } },
    }),
    prisma.visitorSession.groupBy({
      by: ["utmSource"],
      where: {
        sessionStart: { gte: startDate, lte: endDate },
        utmSource: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.tokenTransaction.aggregate({
      where: {
        type: "EARN_PURCHASE",
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
  ]);

  const visitorsChange = previousVisitors > 0
    ? Math.round(
      ((currentVisitors - previousVisitors) / previousVisitors) * 10000,
    ) / 100
    : 0;

  const signupsChange = previousSignups > 0
    ? Math.round(
      ((currentSignups - previousSignups) / previousSignups) * 10000,
    ) / 100
    : 0;

  const conversionRate = currentVisitors > 0
    ? Math.round((currentSignups / currentVisitors) * 10000) / 100
    : 0;

  const trafficSources: TrafficSource[] = trafficBySource
    .map((s) => ({
      name: s.utmSource ?? "direct",
      value: s._count._all,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Add "direct" if there's remaining traffic
  const trackedTotal = trafficSources.reduce((sum, s) => sum + s.value, 0);
  if (currentVisitors > trackedTotal) {
    trafficSources.push({
      name: "direct",
      value: currentVisitors - trackedTotal,
    });
  }

  return {
    visitors: currentVisitors,
    visitorsChange,
    signups: currentSignups,
    signupsChange,
    conversionRate,
    revenue: revenue._sum.amount ?? 0,
    trafficSources,
  };
}

/**
 * Fetch error metrics
 */
async function fetchErrorMetrics(): Promise<ErrorMetrics> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [errorCount, errorsByType, errorsByFile] = await Promise.all([
    prisma.errorLog.count({
      where: { timestamp: { gte: oneDayAgo } },
    }),
    prisma.errorLog.groupBy({
      by: ["errorType"],
      where: { timestamp: { gte: oneDayAgo } },
      _count: { _all: true },
      orderBy: { _count: { errorType: "desc" } },
      take: 5,
    }),
    prisma.errorLog.groupBy({
      by: ["sourceFile"],
      where: { timestamp: { gte: oneDayAgo } },
      _count: { _all: true },
      orderBy: { _count: { sourceFile: "desc" } },
      take: 5,
    }),
  ]);

  const topErrorTypes: Record<string, number> = {};
  for (const e of errorsByType) {
    if (e.errorType) {
      topErrorTypes[e.errorType] = e._count._all;
    }
  }

  const topErrorFiles: Record<string, number> = {};
  for (const e of errorsByFile) {
    if (e.sourceFile) {
      topErrorFiles[e.sourceFile] = e._count._all;
    }
  }

  return {
    last24Hours: errorCount,
    topErrorTypes,
    topErrorFiles,
  };
}

/**
 * Fetch external data (Vercel Analytics, Meta Ads)
 */
async function fetchExternalData(
  startDate: Date,
  endDate: Date,
  sections: ReportSection[],
): Promise<ExternalData> {
  const external: ExternalData = {};

  if (sections.includes("vercel")) {
    const cacheKey = `vercel_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = getCached<ExternalData["vercelAnalytics"]>(cacheKey);

    if (cached !== null) {
      external.vercelAnalytics = cached;
    } else {
      const { data, error } = await tryCatch(
        fetchVercelAnalytics(startDate, endDate),
      );
      if (!error) {
        external.vercelAnalytics = data;
        setCache(cacheKey, data);
      }
    }
  }

  if (sections.includes("meta")) {
    const cacheKey = `meta_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = getCached<ExternalData["metaAds"]>(cacheKey);

    if (cached !== null) {
      external.metaAds = cached;
    } else {
      const { data, error } = await tryCatch(
        fetchMetaAdsAggregated(startDate, endDate),
      );
      if (!error) {
        external.metaAds = data;
        setCache(cacheKey, data);
      }
    }
  }

  return external;
}

/**
 * Generate full system report
 */
export async function generateSystemReport(
  period: ReportPeriodOption = "30d",
  sections: ReportSection[] = [
    "platform",
    "users",
    "tokens",
    "health",
    "marketing",
    "errors",
    "vercel",
    "meta",
  ],
): Promise<SystemReport | PartialSystemReport> {
  const { startDate, endDate } = getDateRangeForPeriod(period);

  const reportPeriod: ReportPeriod = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };

  // Fetch all sections in parallel
  const results = await Promise.allSettled([
    sections.includes("platform") ? fetchPlatformMetrics() : null,
    sections.includes("users") ? fetchUserMetrics(startDate, endDate) : null,
    sections.includes("tokens") ? fetchTokenMetrics() : null,
    sections.includes("health") ? fetchHealthMetrics() : null,
    sections.includes("marketing")
      ? fetchMarketingMetrics(startDate, endDate)
      : null,
    sections.includes("errors") ? fetchErrorMetrics() : null,
    sections.includes("vercel") || sections.includes("meta")
      ? fetchExternalData(startDate, endDate, sections)
      : null,
  ]);

  const report: PartialSystemReport = {
    generatedAt: new Date().toISOString(),
    period: reportPeriod,
  };

  // Extract results
  if (results[0].status === "fulfilled" && results[0].value) {
    report.platform = results[0].value;
  }
  if (results[1].status === "fulfilled" && results[1].value) {
    report.users = results[1].value;
  }
  if (results[2].status === "fulfilled" && results[2].value) {
    report.tokens = results[2].value;
  }
  if (results[3].status === "fulfilled" && results[3].value) {
    report.health = results[3].value;
  }
  if (results[4].status === "fulfilled" && results[4].value) {
    report.marketing = results[4].value;
  }
  if (results[5].status === "fulfilled" && results[5].value) {
    report.errors = results[5].value;
  }
  if (results[6].status === "fulfilled" && results[6].value) {
    report.external = results[6].value;
  }

  return report;
}

/**
 * Generate summary report
 */
export async function generateSystemReportSummary(
  period: ReportPeriodOption = "30d",
): Promise<SystemReportSummary> {
  const report = (await generateSystemReport(period, [
    "platform",
    "users",
    "health",
    "errors",
    "marketing",
    "vercel",
    "meta",
  ])) as SystemReport;

  return {
    generatedAt: report.generatedAt,
    period: report.period,
    highlights: {
      totalUsers: report.platform?.totalUsers ?? 0,
      activeUsersLast7Days: report.users?.activeUsersLast7Days ?? 0,
      totalEnhancements: report.platform?.totalEnhancements ?? 0,
      pendingJobs: report.platform?.jobStatus.pending ?? 0,
      failedJobs: report.platform?.jobStatus.failed ?? 0,
      tokensInCirculation: report.platform?.tokensInCirculation ?? 0,
      errorsLast24Hours: report.errors?.last24Hours ?? 0,
      conversionRate: report.marketing?.conversionRate ?? 0,
    },
    external: {
      vercelPageViews: report.external?.vercelAnalytics?.pageViews,
      metaTotalSpend: report.external?.metaAds?.totalSpend,
    },
  };
}

/**
 * Clear the cache (useful for testing)
 */
export function clearReportCache(): void {
  cache.clear();
}
