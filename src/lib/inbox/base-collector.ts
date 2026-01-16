/**
 * Base Collector
 *
 * Abstract base class for platform collectors with rate limiting and backoff.
 */

import type { SocialPlatform } from "@prisma/client";

import type {
  BackoffConfig,
  CollectionOptions,
  CollectionResult,
  IPlatformCollector,
  RateLimitStatus,
} from "./collector-types";

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  multiplier: 2,
  maxRetries: 5,
};

/**
 * Calculate backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG,
): number {
  const exponentialDelay = config.initialDelayMs *
    Math.pow(config.multiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter (±10%)
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Abstract base class for platform collectors
 */
export abstract class BaseCollector implements IPlatformCollector {
  abstract readonly platform: SocialPlatform;

  protected rateLimitStatus: RateLimitStatus | null = null;
  protected backoffConfig: BackoffConfig;

  constructor(backoffConfig: BackoffConfig = DEFAULT_BACKOFF_CONFIG) {
    this.backoffConfig = backoffConfig;
  }

  /**
   * Update rate limit status from API response headers
   */
  protected updateRateLimitStatus(
    remaining: number,
    limit: number,
    resetTimestamp: number,
  ): void {
    const resetAt = new Date(resetTimestamp * 1000);
    this.rateLimitStatus = {
      remaining,
      limit,
      resetAt,
      isLimited: remaining === 0,
    };
  }

  /**
   * Check if we're currently rate limited
   */
  protected isRateLimited(): boolean {
    if (!this.rateLimitStatus) return false;
    if (!this.rateLimitStatus.isLimited) return false;
    // Check if the reset time has passed
    return new Date() < this.rateLimitStatus.resetAt;
  }

  /**
   * Get time until rate limit resets
   */
  protected getTimeUntilReset(): number {
    if (!this.rateLimitStatus) return 0;
    const now = new Date().getTime();
    const reset = this.rateLimitStatus.resetAt.getTime();
    return Math.max(0, reset - now);
  }

  /**
   * Wait for rate limit to reset
   */
  protected async waitForRateLimitReset(): Promise<void> {
    const waitTime = this.getTimeUntilReset();
    if (waitTime > 0) {
      await sleep(waitTime + 1000); // Add 1 second buffer
    }
  }

  /**
   * Execute a request with retry logic and exponential backoff
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      // Wait for rate limit if needed
      if (this.isRateLimited()) {
        await this.waitForRateLimitReset();
      }

      return await operation();
    } catch (error) {
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        if (retryCount < this.backoffConfig.maxRetries) {
          await this.waitForRateLimitReset();
          return this.executeWithRetry(operation, retryCount + 1);
        }
        throw new Error(`Rate limit exceeded after ${retryCount} retries`);
      }

      // Check if it's a retryable error
      if (
        this.isRetryableError(error) &&
        retryCount < this.backoffConfig.maxRetries
      ) {
        const delay = calculateBackoffDelay(retryCount, this.backoffConfig);
        await sleep(delay);
        return this.executeWithRetry(operation, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if an error is a rate limit error
   */
  protected isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("429")
      );
    }
    return false;
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("timeout") ||
        message.includes("network") ||
        message.includes("503") ||
        message.includes("502") ||
        message.includes("500")
      );
    }
    return false;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus | null {
    return this.rateLimitStatus;
  }

  /**
   * Check if the collector can collect for this account
   */
  abstract canCollect(accessToken: string): Promise<boolean>;

  /**
   * Collect mentions for an account
   */
  abstract collectMentions(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult>;

  /**
   * Collect direct messages for an account
   */
  abstract collectDirectMessages(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult>;

  /**
   * Collect comments on posts for an account
   */
  abstract collectComments(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult>;

  /**
   * Create an empty collection result
   */
  protected createEmptyResult(accountId: string): CollectionResult {
    return {
      platform: this.platform,
      accountId,
      messages: [],
      hasMore: false,
      rateLimitRemaining: this.rateLimitStatus?.remaining,
      rateLimitReset: this.rateLimitStatus?.resetAt,
    };
  }
}
