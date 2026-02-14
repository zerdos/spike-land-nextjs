import { getCached, invalidateCache } from "@/lib/dashboard/cache";
import { CACHE_CONFIG, cacheKey } from "@/lib/dashboard/cache-config";
import { checkAllEnvironments } from "@/lib/dashboard/environments";
import type {
  AnalyticsData,
  DashboardHealth,
  DashboardMetrics,
  ServiceHealth,
} from "@/lib/admin/swarm/types";
import { redis } from "@/lib/upstash/client";

/**
 * Precompute dashboard metrics from various data sources.
 * This runs on a schedule (or on-demand) to keep expensive
 * aggregations cached in Redis.
 */
export async function precomputeDashboardMetrics(): Promise<DashboardMetrics> {
  const key = cacheKey("dashboardMetrics");
  const config = CACHE_CONFIG.dashboardMetrics;

  return getCached<DashboardMetrics>(
    key,
    async () => {
      // Placeholder: in production these would query the DB / external APIs
      return {
        activeAgents: 0,
        deploymentsToday: 0,
        openIssues: 0,
        errorRate: 0,
        totalUsers: 0,
        totalCreditsUsed: 0,
      };
    },
    { inProcessTtlMs: config.inProcessTtlMs, redisTtlS: config.redisTtlS },
  );
}

/** Precompute service health by pinging each dependency */
export async function precomputeHealth(): Promise<DashboardHealth> {
  const key = cacheKey("dashboardHealth");
  const config = CACHE_CONFIG.dashboardHealth;

  return getCached<DashboardHealth>(
    key,
    async () => {
      const [redisHealth] = await Promise.all([checkRedisHealth()]);

      return {
        database: { name: "Database", status: "unconfigured", latencyMs: null, message: null },
        redis: redisHealth,
        sentry: { name: "Sentry", status: "unconfigured", latencyMs: null, message: null },
        vercel: { name: "Vercel", status: "unconfigured", latencyMs: null, message: null },
        github: { name: "GitHub", status: "unconfigured", latencyMs: null, message: null },
      };
    },
    { inProcessTtlMs: config.inProcessTtlMs, redisTtlS: config.redisTtlS },
  );
}

async function checkRedisHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      name: "Redis",
      status: "healthy",
      latencyMs: Date.now() - start,
      message: null,
    };
  } catch {
    return {
      name: "Redis",
      status: "down",
      latencyMs: Date.now() - start,
      message: "Redis ping failed",
    };
  }
}

/** Precompute environment statuses */
export async function precomputeEnvironments() {
  const key = cacheKey("environmentStatus");
  const config = CACHE_CONFIG.environmentStatus;

  return getCached(key, () => checkAllEnvironments(), {
    inProcessTtlMs: config.inProcessTtlMs,
    redisTtlS: config.redisTtlS,
  });
}

/** Precompute analytics data for the given time range */
export async function precomputeAnalytics(
  periodDays = 30,
): Promise<AnalyticsData> {
  const key = cacheKey("analytics", String(periodDays));
  const config = CACHE_CONFIG.analytics;

  return getCached<AnalyticsData>(
    key,
    async () => {
      const end = new Date();
      const start = new Date(end.getTime() - periodDays * 86_400_000);

      // Placeholder: in production these would be DB queries
      return {
        period: { start, end },
        userGrowth: [],
        mcpUsage: [],
        errorRate: [],
      };
    },
    { inProcessTtlMs: config.inProcessTtlMs, redisTtlS: config.redisTtlS },
  );
}

/** Invalidate all dashboard caches (useful after deployments or manual refresh) */
export function invalidateAllDashboardCaches(): void {
  const keys = [
    cacheKey("dashboardMetrics"),
    cacheKey("dashboardHealth"),
    cacheKey("environmentStatus"),
    cacheKey("agentList"),
    cacheKey("activityFeed"),
    cacheKey("roadmap"),
    cacheKey("notifications"),
  ];
  for (const k of keys) {
    invalidateCache(k);
  }
}
