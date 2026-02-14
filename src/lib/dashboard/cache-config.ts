/**
 * Per-data-type cache TTL configuration for the dashboard.
 * inProcessTtlMs: in-memory Map TTL in milliseconds
 * redisTtlS: Upstash Redis TTL in seconds
 */

export interface CacheTtlConfig {
  inProcessTtlMs: number;
  redisTtlS: number;
}

export const CACHE_CONFIG = {
  /** Dashboard overview metrics (agent count, deployments today, etc.) */
  dashboardMetrics: {
    inProcessTtlMs: 15_000,
    redisTtlS: 60,
  },

  /** Service health checks (DB, Redis, Sentry, Vercel, GitHub) */
  dashboardHealth: {
    inProcessTtlMs: 30_000,
    redisTtlS: 120,
  },

  /** Agent list and status */
  agentList: {
    inProcessTtlMs: 5_000,
    redisTtlS: 30,
  },

  /** Individual agent timeline */
  agentTimeline: {
    inProcessTtlMs: 10_000,
    redisTtlS: 60,
  },

  /** Environment status (dev/preview/prod) */
  environmentStatus: {
    inProcessTtlMs: 30_000,
    redisTtlS: 120,
  },

  /** Deployment list */
  deployments: {
    inProcessTtlMs: 15_000,
    redisTtlS: 60,
  },

  /** Activity feed items */
  activityFeed: {
    inProcessTtlMs: 10_000,
    redisTtlS: 60,
  },

  /** Roadmap items from GitHub project board */
  roadmap: {
    inProcessTtlMs: 60_000,
    redisTtlS: 300,
  },

  /** Notifications */
  notifications: {
    inProcessTtlMs: 5_000,
    redisTtlS: 30,
  },

  /** Analytics data (expensive aggregations) */
  analytics: {
    inProcessTtlMs: 60_000,
    redisTtlS: 600,
  },
} as const satisfies Record<string, CacheTtlConfig>;

export type CacheDataType = keyof typeof CACHE_CONFIG;

/** Build a namespaced cache key */
export function cacheKey(dataType: CacheDataType, ...parts: string[]): string {
  const suffix = parts.length > 0 ? `:${parts.join(":")}` : "";
  return `dashboard:${dataType}${suffix}`;
}
