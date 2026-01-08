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
} as const;

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
