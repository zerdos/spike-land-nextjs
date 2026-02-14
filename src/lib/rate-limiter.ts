/**
 * Rate limiter with Upstash Redis backend and in-memory fallback.
 * Uses Upstash Redis for persistent, serverless-compatible rate limiting.
 * Falls back to in-memory storage if Redis is unavailable (development/testing).
 */

import { tryCatch } from "@/lib/try-catch";
import { redis } from "@/lib/upstash/client";

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  expiry?: number;
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
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Checks if Upstash Redis is available.
 * Caches the result to avoid repeated checks.
 */
async function isKVAvailable(): Promise<boolean> {
  if (kvAvailable !== null) {
    return kvAvailable;
  }

  // Check for required environment variables first (sync check)
  // Support both UPSTASH_REDIS_REST_* (standard) and KV_REST_API_* (Vercel integration)
  const hasUpstashEnv = process.env['UPSTASH_REDIS_REST_URL'] &&
    process.env['UPSTASH_REDIS_REST_TOKEN'];
  const hasKvEnv = process.env['KV_REST_API_URL'] && process.env['KV_REST_API_TOKEN'];

  if (!hasUpstashEnv && !hasKvEnv) {
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
function ensureCleanupInterval(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Use expiry if available (preferred), otherwise fall back to 2x global interval
      // This fallback is only relevant for old entries if any, or if expiry wasn't set (shouldn't happen)
      const isExpired = entry.expiry
        ? now > entry.expiry
        : now - entry.firstRequest > CLEANUP_INTERVAL_MS * 2;

      if (isExpired) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Lua script for atomic rate limiting.
 * Returns: [isLimited (0/1), remaining, resetAt]
 */
const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local windowMs = tonumber(ARGV[1])
  local maxRequests = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])

  -- Get the current entry
  local entryJson = redis.call("GET", key)
  local entry = nil

  if entryJson then
      entry = cjson.decode(entryJson)
  end

  -- If no entry or window expired
  if not entry or (now - entry.firstRequest > windowMs) then
      local newEntry = {
          count = 1,
          firstRequest = now,
          expiry = now + windowMs
      }
      local ttlSeconds = math.ceil((windowMs + 60000) / 1000)
      redis.call("SET", key, cjson.encode(newEntry), "EX", ttlSeconds)

      return {0, maxRequests - 1, newEntry.expiry}
  end

  -- Within window
  if entry.count >= maxRequests then
      return {1, 0, entry.firstRequest + windowMs}
  end

  -- Increment count
  entry.count = entry.count + 1
  -- Ensure expiry is preserved
  if not entry.expiry then
      entry.expiry = entry.firstRequest + windowMs
  end

  local ttlSeconds = math.ceil((windowMs + 60000) / 1000)
  redis.call("SET", key, cjson.encode(entry), "EX", ttlSeconds)

  return {0, maxRequests - entry.count, entry.firstRequest + windowMs}
`;

/**
 * Checks rate limit using Upstash Redis.
 * Uses atomic operations (Lua script) with TTL for automatic cleanup.
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

  // Execute Lua script atomically
  const result = (await redis.eval(
    RATE_LIMIT_SCRIPT,
    [key],
    [config.windowMs, config.maxRequests, now],
  )) as [number, number, number];

  const [isLimited, remaining, resetAt] = result;

  return {
    isLimited: isLimited === 1,
    remaining,
    resetAt,
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
  ensureCleanupInterval();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous requests or window has expired
  // Note: We check both expiry (if present) and time diff for robustness
  const isExpired = entry?.expiry
    ? now > entry.expiry
    : entry && now - entry.firstRequest > config.windowMs;

  if (!entry || isExpired) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstRequest: now,
      expiry: now + config.windowMs,
    });
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
  // Preserve expiry if set, otherwise calculate it
  if (!entry.expiry) {
    entry.expiry = entry.firstRequest + config.windowMs;
  }
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
  // Bypass rate limiting in E2E tests or if explicitly enabled
  if (process.env['E2E_BYPASS_AUTH'] || process.env['SKIP_RATE_LIMIT']) {
    return {
      isLimited: false,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }

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
  /** Brand content scoring: 20 requests per minute per user */
  brandScoring: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Brand content rewriting: 15 requests per minute per user (slightly lower due to higher LLM cost) */
  brandRewriting: {
    maxRequests: 15,
    windowMs: 60 * 1000, // 1 minute
  },
  /** App creation: 20 apps per day per user */
  appCreation: {
    maxRequests: 20,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  /** Slug classification: 30 requests per minute per user/IP */
  slugClassify: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Newsletter subscription: 5 attempts per hour per IP */
  newsletterSubscribe: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  /** Text-to-speech: 20 requests per minute per IP */
  tts: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Box messages: 20 requests per minute per user */
  boxMessage: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  /** OAuth Token endpoint: 20 requests per minute per IP */
  oauthToken: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  /** OAuth Authorize endpoint: 30 requests per minute per IP */
  oauthAuthorize: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** MCP JSON-RPC endpoint: 60 requests per minute per user */
  mcpJsonRpc: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;
