/**
 * Social Media API Rate Limiter
 *
 * Provides rate limit tracking and retry logic with exponential backoff
 * for social media platform API calls.
 *
 * Features:
 * - Per-platform rate limit tracking
 * - Exponential backoff with jitter
 * - Automatic retry on rate limit errors
 * - In-memory rate limit state storage
 */

import type { SocialPlatform } from "@prisma/client";
import { SocialRateLimitError } from "./errors";

/**
 * Rate limit state for a platform
 */
interface RateLimitState {
  /** When the current rate limit window resets */
  resetAt?: Date;
  /** Number of requests remaining in current window */
  remaining?: number;
  /** Total requests allowed per window */
  limit?: number;
  /** When we last hit a rate limit */
  lastRateLimitAt?: Date;
}

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000ms = 1s) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 60000ms = 1 minute) */
  maxDelayMs?: number;
  /** Whether to add random jitter to delays (default: true) */
  jitter?: boolean;
}

/**
 * In-memory storage for rate limit state per platform
 */
const rateLimitState = new Map<SocialPlatform, RateLimitState>();

/**
 * Get current rate limit state for a platform
 */
export function getRateLimitState(
  platform: SocialPlatform,
): RateLimitState | undefined {
  return rateLimitState.get(platform);
}

/**
 * Update rate limit state for a platform
 */
export function updateRateLimitState(
  platform: SocialPlatform,
  state: Partial<RateLimitState>,
): void {
  const current = rateLimitState.get(platform) || {};
  rateLimitState.set(platform, { ...current, ...state });
}

/**
 * Clear rate limit state for a platform (e.g., after successful request)
 */
export function clearRateLimitState(platform: SocialPlatform): void {
  rateLimitState.delete(platform);
}

/**
 * Check if a platform is currently rate limited
 */
export function isRateLimited(platform: SocialPlatform): boolean {
  const state = rateLimitState.get(platform);
  if (!state?.resetAt) return false;

  // Check if reset time has passed
  if (Date.now() >= state.resetAt.getTime()) {
    // Rate limit window has reset
    clearRateLimitState(platform);
    return false;
  }

  // Check if we have remaining quota
  if (state.remaining !== undefined && state.remaining > 0) {
    return false;
  }

  return true;
}

/**
 * Get the number of seconds until rate limit resets
 */
export function getSecondsUntilReset(platform: SocialPlatform): number | null {
  const state = rateLimitState.get(platform);
  if (!state?.resetAt) return null;

  const secondsUntil = Math.max(
    0,
    Math.ceil((state.resetAt.getTime() - Date.now()) / 1000),
  );

  return secondsUntil;
}

/**
 * Calculate exponential backoff delay with optional jitter
 *
 * Formula: delay = min(initialDelay * 2^attempt, maxDelay) + jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = {},
): number {
  const {
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    jitter = true,
  } = config;

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped)
  const exponentialDelay = Math.min(
    initialDelayMs * Math.pow(2, attempt),
    maxDelayMs,
  );

  // Add jitter to prevent thundering herd (±25% random variation)
  if (jitter) {
    const jitterAmount = exponentialDelay * 0.25;
    const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
    return Math.round(exponentialDelay + jitterOffset);
  }

  return exponentialDelay;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on rate limit errors
 *
 * This wrapper function will:
 * 1. Check if platform is currently rate limited
 * 2. Execute the provided function
 * 3. Catch rate limit errors and retry with exponential backoff
 * 4. Update rate limit state based on response
 *
 * @param platform - The social media platform
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the function
 * @throws The original error if max retries exceeded or error is not rate limit
 *
 * @example
 * ```ts
 * const posts = await withRateLimitRetry(
 *   "TWITTER",
 *   async () => twitterClient.getPosts(),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function withRateLimitRetry<T>(
  platform: SocialPlatform,
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const { maxRetries = 3 } = config;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if we're currently rate limited
    if (attempt > 0 && isRateLimited(platform)) {
      const secondsUntilReset = getSecondsUntilReset(platform);
      if (secondsUntilReset !== null && secondsUntilReset > 0) {
        // Wait until rate limit resets (capped at max delay)
        const delayMs = Math.min(secondsUntilReset * 1000, config.maxDelayMs || 60000);
        console.info(
          `[RateLimiter] ${platform}: Waiting ${delayMs}ms for rate limit to reset`,
        );
        await sleep(delayMs);
      }
    }

    try {
      // Execute the function
      const result = await fn();

      // Success! Clear any previous rate limit state
      if (attempt > 0) {
        console.info(
          `[RateLimiter] ${platform}: Request succeeded after ${attempt} retries`,
        );
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if this is a rate limit error
      if (error instanceof SocialRateLimitError) {
        // Update rate limit state
        updateRateLimitState(platform, {
          resetAt: error.resetAt,
          remaining: error.remaining,
          limit: error.limit,
          lastRateLimitAt: new Date(),
        });

        // Check if we should retry
        if (attempt < maxRetries) {
          // Calculate backoff delay
          let delayMs: number;

          if (error.retryAfter) {
            // Use retry-after from error
            delayMs = error.retryAfter * 1000;
          } else if (error.resetAt) {
            // Use resetAt from error
            delayMs = Math.max(
              0,
              error.resetAt.getTime() - Date.now(),
            );
          } else {
            // Use exponential backoff
            delayMs = calculateBackoffDelay(attempt, config);
          }

          // Cap delay at max
          delayMs = Math.min(delayMs, config.maxDelayMs || 60000);

          console.warn(
            `[RateLimiter] ${platform}: Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs}ms...`,
          );

          await sleep(delayMs);
          continue; // Retry
        }

        // Max retries exceeded
        console.error(
          `[RateLimiter] ${platform}: Max retries (${maxRetries}) exceeded for rate limit`,
        );
        throw error;
      }

      // Not a rate limit error - throw immediately
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error("Unexpected error in rate limit retry logic");
}

/**
 * Decorator to add rate limit tracking to API response headers
 *
 * Call this after each API request to track rate limit state from response headers.
 *
 * @param platform - The social media platform
 * @param headers - Response headers from API call
 *
 * @example
 * ```ts
 * const response = await fetch(url, options);
 * trackRateLimitHeaders("TWITTER", response.headers);
 * ```
 */
export function trackRateLimitHeaders(
  platform: SocialPlatform,
  headers: Headers,
): void {
  // Common header patterns across platforms
  const remaining = headers.get("x-ratelimit-remaining") ||
    headers.get("x-rate-limit-remaining");
  const limit = headers.get("x-ratelimit-limit") ||
    headers.get("x-rate-limit-limit");
  const resetHeader = headers.get("x-ratelimit-reset") ||
    headers.get("x-rate-limit-reset");

  if (remaining || limit || resetHeader) {
    const state: Partial<RateLimitState> = {};

    if (remaining) {
      state.remaining = parseInt(remaining, 10);
    }

    if (limit) {
      state.limit = parseInt(limit, 10);
    }

    if (resetHeader) {
      // Reset header is usually Unix timestamp
      const resetTimestamp = parseInt(resetHeader, 10);
      if (!isNaN(resetTimestamp)) {
        state.resetAt = new Date(resetTimestamp * 1000);
      }
    }

    updateRateLimitState(platform, state);
  }
}
