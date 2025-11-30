/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window approach to limit requests per user.
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

// In-memory store for rate limit entries (keyed by identifier)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval to remove stale entries
let cleanupInterval: ReturnType<typeof setInterval> | null = null

/**
 * Starts the cleanup interval if not already running.
 * Removes entries older than the maximum window size.
 */
function ensureCleanupInterval(windowMs: number): void {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.firstRequest > windowMs * 2) {
        rateLimitStore.delete(key)
      }
    }
  }, windowMs)

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

/**
 * Checks if a request is rate limited.
 *
 * @param identifier - Unique identifier for the rate limit (e.g., userId, IP)
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  isLimited: boolean
  remaining: number
  resetAt: number
} {
  ensureCleanupInterval(config.windowMs)

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // No previous requests or window has expired
  if (!entry || now - entry.firstRequest > config.windowMs) {
    rateLimitStore.set(identifier, { count: 1, firstRequest: now })
    return {
      isLimited: false,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  // Within the window
  if (entry.count >= config.maxRequests) {
    return {
      isLimited: true,
      remaining: 0,
      resetAt: entry.firstRequest + config.windowMs,
    }
  }

  // Increment the count
  entry.count += 1
  return {
    isLimited: false,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.firstRequest + config.windowMs,
  }
}

/**
 * Resets the rate limit for a specific identifier.
 * Useful for testing or administrative purposes.
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Clears all rate limit entries.
 * Useful for testing or administrative purposes.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear()
}

/**
 * Stops the cleanup interval.
 * Should be called when shutting down the application or during testing.
 */
export function stopCleanupInterval(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

/**
 * Gets the current store size (for testing/monitoring).
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size
}

// Pre-configured rate limiters for common use cases
export const rateLimitConfigs = {
  /** Image enhancement: 10 requests per minute per user */
  imageEnhancement: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Image upload: 30 requests per minute per user */
  imageUpload: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** General API: 100 requests per minute per user */
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
} as const
