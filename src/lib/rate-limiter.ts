/**
 * Rate limiter with Upstash Redis backend and in-memory fallback.
 * Uses Upstash Redis for persistent, serverless-compatible rate limiting.
 * Falls back to in-memory storage if Redis is unavailable (development/testing).
 */

import { tryCatch } from "@/lib/try-catch";
import { redis } from "@/lib/upstash";

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory store for fallback (when Redis is unavailable)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Track Redis availability
let kvAvailable: boolean | null = null;

// Cleanup interval for in-memory store
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Checks if Upstash Redis is available.
 * Caches the result to avoid repeated checks.
 */
async function isKVAvailable(): Promise<boolean> {
  if (kvAvailable !== null) {
    return kvAvailable;
  }

  // Check for required environment variables first (sync check)
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    console.warn(
      "Upstash Redis environment variables not set, using in-memory storage",
    );
    kvAvailable = false;
    return false;
  }

  // Test Redis connection with a simple ping
  const { error } = await tryCatch(redis.ping());

  if (error) {
    console.warn(
      "Upstash Redis unavailable, falling back to in-memory storage:",
      error,
    );
    kvAvailable = false;
    return false;
  }

  kvAvailable = true;
  return true;
}

/**
 * Resets the Redis availability cache.
 * Used for testing or after configuration changes.
 */
export function resetKVAvailability(): void {
  kvAvailable = null;
}

/**
 * Starts the cleanup interval for in-memory store if not already running.
 * Only needed when using in-memory fallback.
 */
function ensureCleanupInterval(windowMs: number): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.firstRequest > windowMs * 2) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Checks rate limit using Upstash Redis.
 * Uses atomic operations with TTL for automatic cleanup.
 */
async function checkRateLimitKV(
  identifier: string,
  config: RateLimitConfig,
): Promise<{
  isLimited: boolean;
  remaining: number;
  resetAt: number;
}> {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Try to get existing entry
  const entry = await redis.get<RateLimitEntry>(key);

  // No previous requests or window has expired
  if (!entry || now - entry.firstRequest > config.windowMs) {
    const newEntry: RateLimitEntry = { count: 1, firstRequest: now };

    // Store with TTL (window + 1 minute for cleanup margin)
    const ttlSeconds = Math.ceil((config.windowMs + 60000) / 1000);
    await redis.set(key, newEntry, { ex: ttlSeconds });

    return {
      isLimited: false,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Within the window
  if (entry.count >= config.maxRequests) {
    return {
      isLimited: true,
      remaining: 0,
      resetAt: entry.firstRequest + config.windowMs,
    };
  }

  // Increment the count using atomic operation
  const updatedEntry: RateLimitEntry = {
    ...entry,
    count: entry.count + 1,
  };

  // Update with same TTL
  const ttlSeconds = Math.ceil((config.windowMs + 60000) / 1000);
  await redis.set(key, updatedEntry, { ex: ttlSeconds });

  return {
    isLimited: false,
    remaining: config.maxRequests - updatedEntry.count,
    resetAt: entry.firstRequest + config.windowMs,
  };
}

/**
 * Checks rate limit using in-memory storage (fallback).
 * Same logic as Redis version but uses local Map.
 */
function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig,
): {
  isLimited: boolean;
  remaining: number;
  resetAt: number;
} {
  ensureCleanupInterval(config.windowMs);

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous requests or window has expired
  if (!entry || now - entry.firstRequest > config.windowMs) {
    rateLimitStore.set(identifier, { count: 1, firstRequest: now });
    return {
      isLimited: false,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Within the window
  if (entry.count >= config.maxRequests) {
    return {
      isLimited: true,
      remaining: 0,
      resetAt: entry.firstRequest + config.windowMs,
    };
  }

  // Increment the count
  entry.count += 1;
  return {
    isLimited: false,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.firstRequest + config.windowMs,
  };
}

/**
 * Checks if a request is rate limited.
 * Automatically uses Upstash Redis or falls back to in-memory storage.
 *
 * @param identifier - Unique identifier for the rate limit (e.g., userId, IP)
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and remaining requests
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<{
  isLimited: boolean;
  remaining: number;
  resetAt: number;
}> {
  const useKV = await isKVAvailable();

  if (useKV) {
    const { data, error } = await tryCatch(
      checkRateLimitKV(identifier, config),
    );

    if (error) {
      console.error(
        "Redis rate limit check failed, falling back to memory:",
        error,
      );
      kvAvailable = false; // Mark as unavailable for subsequent requests
      return checkRateLimitMemory(identifier, config);
    }

    return data;
  }

  return checkRateLimitMemory(identifier, config);
}

/**
 * Resets the rate limit for a specific identifier.
 * Useful for testing or administrative purposes.
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const useKV = await isKVAvailable();

  if (useKV) {
    const { error } = await tryCatch(redis.del(`ratelimit:${identifier}`));

    if (error) {
      console.error("Redis rate limit reset failed:", error);
    }
  }

  rateLimitStore.delete(identifier);
}

/**
 * Clears all rate limit entries.
 * Useful for testing or administrative purposes.
 * Note: For Redis, this only clears entries with known identifiers.
 */
export async function clearAllRateLimits(
  identifiers?: string[],
): Promise<void> {
  const useKV = await isKVAvailable();

  if (useKV && identifiers) {
    const keys = identifiers.map((id) => `ratelimit:${id}`);
    if (keys.length > 0) {
      const { error } = await tryCatch(redis.del(...keys));

      if (error) {
        console.error("Redis rate limit clear failed:", error);
      }
    }
  }

  rateLimitStore.clear();
}

/**
 * Stops the cleanup interval for in-memory store.
 * Should be called when shutting down the application or during testing.
 */
export function stopCleanupInterval(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Gets the current in-memory store size (for testing/monitoring).
 * Note: This only reflects the in-memory fallback, not Redis entries.
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Forces the rate limiter to use in-memory storage.
 * Used for testing purposes.
 */
export function forceMemoryStorage(): void {
  kvAvailable = false;
}

/**
 * Forces the rate limiter to attempt using Redis storage.
 * Used for testing purposes.
 */
export function forceKVStorage(): void {
  kvAvailable = true;
}

// Pre-configured rate limiters for common use cases
export const rateLimitConfigs = {
  /** Image enhancement: 10 requests per minute per user */
  imageEnhancement: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Album batch enhancement: 5 requests per minute per user (more restrictive for batch operations) */
  albumBatchEnhancement: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Image upload: 30 requests per minute per user */
  imageUpload: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Voucher redemption: 5 attempts per hour per user */
  voucherRedemption: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  /** General API: 100 requests per minute per user */
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  /** MCP Generate: 10 requests per minute per user */
  mcpGenerate: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** MCP Modify: 10 requests per minute per user */
  mcpModify: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** MCP Job Status: 60 requests per minute (for polling) */
  mcpJobStatus: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Anonymous image upload: 5 requests per minute per IP (more restrictive) */
  anonymousUpload: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Anonymous mix creation: 3 requests per minute per IP (more restrictive) */
  anonymousMix: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Anonymous job stream: 10 connections per minute per IP */
  anonymousStream: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Anonymous download: 20 requests per minute per IP */
  anonymousDownload: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;
