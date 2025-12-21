/**
 * Try-Catch Stats Collector
 *
 * Collects statistics for all tryCatch and tryCatchSync calls.
 * Uses Vercel KV for persistent storage with in-memory buffering
 * and throttled writes for performance.
 */

// Lazy-loaded KV client to prevent bundler from including in workflow bundles
// where @vercel/kv is not available (uses EventTarget which workflows don't have)
type KVClient = typeof import("@vercel/kv")["kv"];
let kvClient: KVClient | null = null;

async function getKV(): Promise<KVClient> {
  if (!kvClient) {
    // Use variable to prevent bundler static analysis from including @vercel/kv
    const kvModulePath = "@vercel/kv";
    const kvModule = await import(kvModulePath);
    kvClient = kvModule.kv;
  }
  return kvClient!;
}

// Types
export interface UserTryCatchStats {
  email: string;
  allCalls: number;
  frontendSuccess: number;
  frontendFail: number;
  backendSuccess: number;
  backendFail: number;
  lastSeen: string;
}

export interface TryCatchStats {
  version: number;
  lastUpdated: string;
  users: Record<string, UserTryCatchStats>;
}

interface PendingStatUpdate {
  userId: string;
  environment: "FRONTEND" | "BACKEND";
  success: boolean;
}

// Detect environment
const isServer = typeof window === "undefined";

// Allow forcing server mode for testing
let forceServerModeEnabled = false;

// In-memory buffer for pending updates
let pendingUpdates: PendingStatUpdate[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

// Throttle interval for backend flushes (2 seconds)
const BACKEND_FLUSH_INTERVAL = 2000;

// KV availability tracking
let kvAvailable: boolean | null = null;

// KV key for stats
const STATS_KEY = "try-catch-stats";

// In-memory fallback store (used when KV is unavailable)
let inMemoryStats: TryCatchStats = {
  version: 0,
  lastUpdated: new Date().toISOString(),
  users: {},
};

// Max retries for optimistic locking
const MAX_RETRIES = 3;

/**
 * Checks if Vercel KV is available.
 * Caches the result to avoid repeated checks.
 */
async function isKVAvailable(): Promise<boolean> {
  if (kvAvailable !== null) {
    return kvAvailable;
  }

  // Check for required environment variables first
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    kvAvailable = false;
    return false;
  }

  try {
    const kv = await getKV();
    await kv.ping();
    kvAvailable = true;
    return true;
  } catch {
    console.warn(
      "[TryCatchStats] Vercel KV unavailable, stats will not be persisted",
    );
    kvAvailable = false;
    return false;
  }
}

/**
 * Resets the KV availability cache.
 * Used for testing.
 */
export function resetKVAvailability(): void {
  kvAvailable = null;
}

/**
 * Creates an empty stats object.
 */
export function createEmptyStats(): TryCatchStats {
  return {
    version: 0,
    lastUpdated: new Date().toISOString(),
    users: {},
  };
}

/**
 * Aggregates pending updates by user.
 */
function aggregateUpdates(
  updates: PendingStatUpdate[],
): Map<
  string,
  {
    frontendSuccess: number;
    frontendFail: number;
    backendSuccess: number;
    backendFail: number;
  }
> {
  const aggregated = new Map<
    string,
    {
      frontendSuccess: number;
      frontendFail: number;
      backendSuccess: number;
      backendFail: number;
    }
  >();

  for (const update of updates) {
    const existing = aggregated.get(update.userId) || {
      frontendSuccess: 0,
      frontendFail: 0,
      backendSuccess: 0,
      backendFail: 0,
    };

    if (update.environment === "FRONTEND") {
      if (update.success) {
        existing.frontendSuccess++;
      } else {
        existing.frontendFail++;
      }
    } else {
      if (update.success) {
        existing.backendSuccess++;
      } else {
        existing.backendFail++;
      }
    }

    aggregated.set(update.userId, existing);
  }

  return aggregated;
}

/**
 * Merges aggregated updates into existing stats.
 */
function mergeAggregatedUpdates(
  stats: TryCatchStats,
  aggregated: Map<
    string,
    {
      frontendSuccess: number;
      frontendFail: number;
      backendSuccess: number;
      backendFail: number;
    }
  >,
): TryCatchStats {
  const now = new Date().toISOString();
  const updatedUsers = { ...stats.users };

  for (const [userId, counts] of aggregated) {
    const existing = updatedUsers[userId] || {
      email: userId,
      allCalls: 0,
      frontendSuccess: 0,
      frontendFail: 0,
      backendSuccess: 0,
      backendFail: 0,
      lastSeen: now,
    };

    updatedUsers[userId] = {
      ...existing,
      allCalls: existing.allCalls +
        counts.frontendSuccess +
        counts.frontendFail +
        counts.backendSuccess +
        counts.backendFail,
      frontendSuccess: existing.frontendSuccess + counts.frontendSuccess,
      frontendFail: existing.frontendFail + counts.frontendFail,
      backendSuccess: existing.backendSuccess + counts.backendSuccess,
      backendFail: existing.backendFail + counts.backendFail,
      lastSeen: now,
    };
  }

  return {
    version: stats.version + 1,
    lastUpdated: now,
    users: updatedUsers,
  };
}

/**
 * Flushes pending updates to KV (or in-memory fallback).
 */
async function flushUpdatesToKV(): Promise<void> {
  if (pendingUpdates.length === 0) return;

  const updates = [...pendingUpdates];
  pendingUpdates = [];

  // Aggregate updates by user
  const aggregated = aggregateUpdates(updates);

  const useKV = await isKVAvailable();
  if (!useKV) {
    // Use in-memory fallback
    inMemoryStats = mergeAggregatedUpdates(inMemoryStats, aggregated);
    return;
  }

  // Retry loop with optimistic locking for KV
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const kv = await getKV();
      const current = await kv.get<TryCatchStats>(STATS_KEY);
      const stats = current || createEmptyStats();
      const updated = mergeAggregatedUpdates(stats, aggregated);

      await kv.set(STATS_KEY, updated);
      return; // Success
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        console.error(
          "[TryCatchStats] Failed to flush stats after retries:",
          error,
        );
        // Fall back to in-memory on final failure
        inMemoryStats = mergeAggregatedUpdates(inMemoryStats, aggregated);
      }
      // Brief delay before retry
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

/**
 * Records a try-catch event.
 * This function is non-blocking and returns immediately.
 *
 * @param userId - User email or "anonymous" if not authenticated
 * @param environment - "FRONTEND" or "BACKEND"
 * @param success - Whether the operation succeeded or failed
 */
export function recordTryCatchEvent(
  userId: string | null,
  environment: "FRONTEND" | "BACKEND",
  success: boolean,
): void {
  // Only collect on server side (backend events are recorded here directly,
  // frontend events come via API)
  if (!isServer && !forceServerModeEnabled) {
    return;
  }

  pendingUpdates.push({
    userId: userId || "anonymous",
    environment,
    success,
  });

  // Throttled flush
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      void flushUpdatesToKV();
      flushTimeout = null;
    }, BACKEND_FLUSH_INTERVAL);

    // Don't block process exit
    if (flushTimeout.unref) {
      flushTimeout.unref();
    }
  }
}

/**
 * Records multiple frontend events (called from sync API).
 */
export function recordFrontendEvents(
  userId: string,
  events: Array<{ success: boolean; }>,
): void {
  for (const event of events) {
    pendingUpdates.push({
      userId: userId || "anonymous",
      environment: "FRONTEND",
      success: event.success,
    });
  }

  // Trigger flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      void flushUpdatesToKV();
      flushTimeout = null;
    }, BACKEND_FLUSH_INTERVAL);

    if (flushTimeout.unref) {
      flushTimeout.unref();
    }
  }
}

/**
 * Gets the current stats from KV (or in-memory fallback).
 */
export async function getStats(): Promise<TryCatchStats> {
  const useKV = await isKVAvailable();
  if (!useKV) {
    // Return in-memory stats
    return inMemoryStats;
  }

  try {
    const kv = await getKV();
    const stats = await kv.get<TryCatchStats>(STATS_KEY);
    return stats || createEmptyStats();
  } catch (error) {
    console.error("[TryCatchStats] Failed to get stats:", error);
    // Fall back to in-memory on error
    return inMemoryStats;
  }
}

/**
 * Resets all stats.
 */
export async function resetStats(): Promise<void> {
  // Always clear pending updates first
  pendingUpdates = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  // Reset in-memory stats
  inMemoryStats = {
    version: 0,
    lastUpdated: new Date().toISOString(),
    users: {},
  };

  // Then try to clear KV if available
  const useKV = await isKVAvailable();
  if (!useKV) {
    return;
  }

  try {
    const kv = await getKV();
    await kv.del(STATS_KEY);
  } catch (error) {
    console.error("[TryCatchStats] Failed to reset stats:", error);
  }
}

/**
 * Forces an immediate flush of pending updates.
 * Useful for testing or before shutdown.
 */
export async function flushStats(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushUpdatesToKV();
}

/**
 * Gets the number of pending updates (for testing/monitoring).
 */
export function getPendingUpdatesCount(): number {
  return pendingUpdates.length;
}

/**
 * Forces memory-only mode (for testing).
 */
export function forceMemoryMode(): void {
  kvAvailable = false;
}

/**
 * Forces KV mode (for testing).
 */
export function forceKVMode(): void {
  kvAvailable = true;
}

/**
 * Forces server mode for testing.
 * Allows recordTryCatchEvent to work even in browser-like test environments.
 */
export function forceServerMode(): void {
  forceServerModeEnabled = true;
}

/**
 * Resets server mode forcing (for testing).
 */
export function resetServerMode(): void {
  forceServerModeEnabled = false;
}
