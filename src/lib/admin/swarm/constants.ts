export const POLLING_INTERVALS = {
  dashboard: 30_000,
  agents: 10_000,
  environments: 60_000,
  notifications: 15_000,
  analytics: 120_000,
} as const;

export const ENVIRONMENT_NAMES: readonly string[] = ["dev", "preview", "prod"];

export const AGENT_STATUS_MAP = {
  active: { label: "Active", color: "text-green-500" },
  idle: { label: "Idle", color: "text-yellow-500" },
  error: { label: "Error", color: "text-red-500" },
  stopped: { label: "Stopped", color: "text-gray-500" },
} as const;

export const SSE_KEEPALIVE_INTERVAL = 15_000;

export const SSE_MAX_CONNECTION_MS = 280_000;

export const CACHE_TTL = {
  inProcess: 30,
  redis: 300,
} as const;
