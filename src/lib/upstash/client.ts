import { Redis } from "@upstash/redis";

// Support both UPSTASH_REDIS_REST_* (standard) and KV_REST_API_* (Vercel integration) naming
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN;

// Create Redis client if credentials are available, otherwise create a mock
// This allows the app to run without Redis (with queue features disabled)
export const redis: Redis = url && token
  ? new Redis({ url, token })
  : (new Proxy({} as Redis, {
    get(_, prop) {
      if (prop === "ping") {
        return () => Promise.reject(new Error("Redis not configured"));
      }
      return () => {
        console.warn(
          `[Upstash Redis] Not configured - ${String(prop)} called but Redis credentials missing`,
        );
        return Promise.resolve(null);
      };
    },
  }) as Redis);

// Key prefixes for organization
const KEYS = {
  APP_PENDING_MESSAGES: (appId: string) => `app:${appId}:pending_messages`,
  APPS_WITH_PENDING: "apps:with_pending",
  APP_STATUS: (appId: string) => `app:${appId}:status`,
  AGENT_WORKING: (appId: string) => `app:${appId}:agent_working`,
  APP_CODE_HASH: (appId: string) => `app:${appId}:code_hash`,
  SSE_EVENTS: (appId: string) => `sse:${appId}:events`,
} as const;

// Generate a unique instance ID for this process
// Used to prevent instances from processing their own events
const INSTANCE_ID = crypto.randomUUID();

/**
 * Add a message to the pending queue for an app
 * Called when a user sends a new message
 */
export async function enqueueMessage(
  appId: string,
  messageId: string,
): Promise<void> {
  // Add message to the app's pending queue (newest first)
  await redis.lpush(KEYS.APP_PENDING_MESSAGES(appId), messageId);
  // Track this app as having pending work
  await redis.sadd(KEYS.APPS_WITH_PENDING, appId);
}

/**
 * Remove a message from the pending queue (mark as processed)
 */
export async function dequeueMessage(appId: string): Promise<string | null> {
  // Pop oldest message from the queue
  const messageId = await redis.rpop<string>(KEYS.APP_PENDING_MESSAGES(appId));

  // Check if queue is now empty
  const remaining = await redis.llen(KEYS.APP_PENDING_MESSAGES(appId));
  if (remaining === 0) {
    // Remove app from pending set
    await redis.srem(KEYS.APPS_WITH_PENDING, appId);
  }

  return messageId;
}

/**
 * Get all message IDs in the pending queue for an app
 */
export async function getPendingMessages(appId: string): Promise<string[]> {
  return redis.lrange(KEYS.APP_PENDING_MESSAGES(appId), 0, -1);
}

/**
 * Get all app IDs that have pending messages
 */
export async function getAppsWithPending(): Promise<string[]> {
  return redis.smembers(KEYS.APPS_WITH_PENDING);
}

/**
 * Check if an app has any pending messages
 */
export async function hasPendingMessages(appId: string): Promise<boolean> {
  const result = await redis.sismember(KEYS.APPS_WITH_PENDING, appId);
  return result === 1;
}

/**
 * Get the count of pending messages for an app
 */
export async function getPendingCount(appId: string): Promise<number> {
  return redis.llen(KEYS.APP_PENDING_MESSAGES(appId));
}

/**
 * Mark an agent as working on an app (for UI indicator)
 * TTL of 5 minutes to auto-expire if agent crashes
 */
export async function setAgentWorking(
  appId: string,
  isWorking: boolean,
): Promise<void> {
  if (isWorking) {
    await redis.set(KEYS.AGENT_WORKING(appId), "1", { ex: 300 }); // 5 min TTL
  } else {
    await redis.del(KEYS.AGENT_WORKING(appId));
  }
}

/**
 * Check if an agent is currently working on an app
 */
export async function isAgentWorking(appId: string): Promise<boolean> {
  const value = await redis.get(KEYS.AGENT_WORKING(appId));
  return value === "1";
}

/**
 * Clear all pending messages for an app (e.g., on app deletion)
 */
export async function clearPendingMessages(appId: string): Promise<void> {
  await redis.del(KEYS.APP_PENDING_MESSAGES(appId));
  await redis.srem(KEYS.APPS_WITH_PENDING, appId);
  await redis.del(KEYS.AGENT_WORKING(appId));
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats(): Promise<{
  appsWithPending: number;
  totalPendingMessages: number;
}> {
  const appIds = await getAppsWithPending();
  let totalPendingMessages = 0;

  for (const appId of appIds) {
    totalPendingMessages += await getPendingCount(appId);
  }

  return {
    appsWithPending: appIds.length,
    totalPendingMessages,
  };
}

/**
 * Get the stored code hash for an app (for token optimization)
 * Returns null if no hash is stored or Redis is not configured
 */
export async function getCodeHash(appId: string): Promise<string | null> {
  return redis.get<string>(KEYS.APP_CODE_HASH(appId));
}

/**
 * Set the code hash for an app (for token optimization)
 * TTL of 1 hour to auto-expire old hashes
 */
export async function setCodeHash(
  appId: string,
  hash: string,
): Promise<void> {
  await redis.set(KEYS.APP_CODE_HASH(appId), hash, { ex: 3600 }); // 1 hour TTL
}

/**
 * SSE Event structure for cross-instance broadcasting
 */
export interface SSEEventWithSource {
  type: string;
  data: unknown;
  timestamp: number;
  sourceInstanceId: string;
}

/**
 * Publish an SSE event to Redis for cross-instance broadcasting
 * Events are stored in a list and expire after 60 seconds
 *
 * This enables multi-instance SSE support by allowing instances to
 * poll for events published by other instances.
 */
export async function publishSSEEvent(
  appId: string,
  event: { type: string; data: unknown; timestamp: number; },
): Promise<void> {
  const eventWithSource: SSEEventWithSource = {
    ...event,
    sourceInstanceId: INSTANCE_ID,
  };

  const key = KEYS.SSE_EVENTS(appId);

  // Add to list (newest first)
  await redis.lpush(key, JSON.stringify(eventWithSource));

  // Set expiration to prevent memory leak
  await redis.expire(key, 60);

  // Trim to last 100 events
  await redis.ltrim(key, 0, 99);
}

/**
 * Get SSE events published after a given timestamp
 * Used by instances to poll for new events from other instances
 *
 * Events from the current instance (matching INSTANCE_ID) are filtered out
 * to prevent duplicate processing.
 */
export async function getSSEEvents(
  appId: string,
  afterTimestamp: number,
): Promise<SSEEventWithSource[]> {
  const key = KEYS.SSE_EVENTS(appId);

  // Get all events from list
  const events = await redis.lrange<string>(key, 0, -1);

  return events
    .map((e) => JSON.parse(e) as SSEEventWithSource)
    .filter(
      (e) => e.timestamp > afterTimestamp && e.sourceInstanceId !== INSTANCE_ID,
    )
    .reverse(); // Oldest first for replay
}

/**
 * Get the current instance ID (for testing/debugging)
 */
export function getInstanceId(): string {
  return INSTANCE_ID;
}
