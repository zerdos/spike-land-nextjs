/**
 * Base Collector Tests
 *
 * Tests for the base collector with rate limiting and backoff.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CollectionOptions, CollectionResult } from "./collector-types";

import { BaseCollector, calculateBackoffDelay, DEFAULT_BACKOFF_CONFIG } from "./base-collector";

// Concrete implementation for testing
class TestCollector extends BaseCollector {
  readonly platform = "TWITTER" as const;

  async canCollect(_accessToken: string): Promise<boolean> {
    return true;
  }

  async collectMentions(
    _accessToken: string,
    accountId: string,
    _options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.createEmptyResult(accountId);
  }

  async collectDirectMessages(
    _accessToken: string,
    accountId: string,
    _options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.createEmptyResult(accountId);
  }

  async collectComments(
    _accessToken: string,
    accountId: string,
    _options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.createEmptyResult(accountId);
  }

  // Expose protected methods for testing
  public testUpdateRateLimitStatus(
    remaining: number,
    limit: number,
    resetTimestamp: number,
  ): void {
    this.updateRateLimitStatus(remaining, limit, resetTimestamp);
  }

  public testIsRateLimited(): boolean {
    return this.isRateLimited();
  }

  public testGetTimeUntilReset(): number {
    return this.getTimeUntilReset();
  }

  public async testExecuteWithRetry<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.executeWithRetry(operation);
  }

  public testIsRateLimitError(error: unknown): boolean {
    return this.isRateLimitError(error);
  }

  public testIsRetryableError(error: unknown): boolean {
    return this.isRetryableError(error);
  }
}

describe("Base Collector", () => {
  let collector: TestCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new TestCollector();
  });

  describe("calculateBackoffDelay", () => {
    it("should calculate exponential delay", () => {
      const delay0 = calculateBackoffDelay(0);
      const delay1 = calculateBackoffDelay(1);
      const delay2 = calculateBackoffDelay(2);

      // First attempt should be around initial delay (1000ms +/- 10% jitter)
      expect(delay0).toBeGreaterThanOrEqual(900);
      expect(delay0).toBeLessThanOrEqual(1100);

      // Second attempt should be around 2x initial
      expect(delay1).toBeGreaterThanOrEqual(1800);
      expect(delay1).toBeLessThanOrEqual(2200);

      // Third attempt should be around 4x initial
      expect(delay2).toBeGreaterThanOrEqual(3600);
      expect(delay2).toBeLessThanOrEqual(4400);
    });

    it("should cap delay at maxDelayMs", () => {
      const delay10 = calculateBackoffDelay(10); // Would be 1024000ms without cap

      expect(delay10).toBeLessThanOrEqual(
        DEFAULT_BACKOFF_CONFIG.maxDelayMs * 1.1,
      );
    });

    it("should use custom config", () => {
      const customConfig = {
        initialDelayMs: 500,
        maxDelayMs: 5000,
        multiplier: 3,
        maxRetries: 3,
      };

      const delay = calculateBackoffDelay(1, customConfig);

      // Should be around 500 * 3 = 1500ms
      expect(delay).toBeGreaterThanOrEqual(1350);
      expect(delay).toBeLessThanOrEqual(1650);
    });
  });

  describe("Rate Limit Status", () => {
    it("should update rate limit status", () => {
      const futureReset = Math.floor(Date.now() / 1000) + 3600;
      collector.testUpdateRateLimitStatus(50, 100, futureReset);

      const status = collector.getRateLimitStatus();
      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(50);
      expect(status?.limit).toBe(100);
      expect(status?.isLimited).toBe(false);
    });

    it("should detect rate limited state", () => {
      const futureReset = Math.floor(Date.now() / 1000) + 3600;
      collector.testUpdateRateLimitStatus(0, 100, futureReset);

      expect(collector.testIsRateLimited()).toBe(true);
    });

    it("should not be rate limited when remaining > 0", () => {
      const futureReset = Math.floor(Date.now() / 1000) + 3600;
      collector.testUpdateRateLimitStatus(10, 100, futureReset);

      expect(collector.testIsRateLimited()).toBe(false);
    });

    it("should not be rate limited when reset time has passed", () => {
      const pastReset = Math.floor(Date.now() / 1000) - 60;
      collector.testUpdateRateLimitStatus(0, 100, pastReset);

      expect(collector.testIsRateLimited()).toBe(false);
    });

    it("should calculate time until reset", () => {
      const futureReset = Math.floor(Date.now() / 1000) + 60; // 60 seconds in future
      collector.testUpdateRateLimitStatus(0, 100, futureReset);

      const timeUntilReset = collector.testGetTimeUntilReset();
      expect(timeUntilReset).toBeGreaterThan(55000);
      expect(timeUntilReset).toBeLessThanOrEqual(60000);
    });

    it("should return 0 for past reset time", () => {
      const pastReset = Math.floor(Date.now() / 1000) - 60;
      collector.testUpdateRateLimitStatus(0, 100, pastReset);

      expect(collector.testGetTimeUntilReset()).toBe(0);
    });
  });

  describe("Error Detection", () => {
    it("should detect rate limit errors", () => {
      expect(collector.testIsRateLimitError(new Error("Rate limit exceeded")))
        .toBe(true);
      expect(collector.testIsRateLimitError(new Error("Too many requests")))
        .toBe(true);
      expect(collector.testIsRateLimitError(new Error("Error 429")))
        .toBe(true);
      expect(collector.testIsRateLimitError(new Error("Normal error")))
        .toBe(false);
    });

    it("should detect retryable errors", () => {
      expect(collector.testIsRetryableError(new Error("Request timeout")))
        .toBe(true);
      expect(collector.testIsRetryableError(new Error("Network error")))
        .toBe(true);
      expect(collector.testIsRetryableError(new Error("Error 503")))
        .toBe(true);
      expect(collector.testIsRetryableError(new Error("Error 502")))
        .toBe(true);
      expect(collector.testIsRetryableError(new Error("Error 500")))
        .toBe(true);
      expect(collector.testIsRetryableError(new Error("Bad request")))
        .toBe(false);
    });

    it("should handle non-Error types", () => {
      expect(collector.testIsRateLimitError("string error")).toBe(false);
      expect(collector.testIsRetryableError({ message: "object error" }))
        .toBe(false);
    });
  });

  describe("Execute with Retry", () => {
    it("should execute successful operation without retry", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await collector.testExecuteWithRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable error", async () => {
      vi.useFakeTimers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const promise = collector.testExecuteWithRetry(operation);

      // Advance past the backoff delay
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("should not retry on non-retryable error", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Bad request 400"));

      await expect(collector.testExecuteWithRetry(operation)).rejects.toThrow(
        "Bad request 400",
      );
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should give up after max retries", async () => {
      vi.useFakeTimers();
      const operation = vi.fn().mockRejectedValue(new Error("Network error"));

      // Start the operation but don't await yet
      let error: Error | undefined;
      const promise = collector.testExecuteWithRetry(operation).catch((e) => {
        error = e;
      });

      // Run all timers to complete the retries quickly
      for (let i = 0; i <= DEFAULT_BACKOFF_CONFIG.maxRetries; i++) {
        await vi.runAllTimersAsync();
      }

      await promise;

      expect(error).toBeDefined();
      expect(error?.message).toBe("Network error");
      expect(operation).toHaveBeenCalledTimes(
        DEFAULT_BACKOFF_CONFIG.maxRetries + 1,
      );
      vi.useRealTimers();
    });
  });

  describe("Create Empty Result", () => {
    it("should create empty result with correct structure", async () => {
      const result = await collector.collectMentions("token", "account-1");

      expect(result.platform).toBe("TWITTER");
      expect(result.accountId).toBe("account-1");
      expect(result.messages).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("Abstract Methods", () => {
    it("should implement canCollect", async () => {
      const canCollect = await collector.canCollect("token");
      expect(canCollect).toBe(true);
    });

    it("should implement collectMentions", async () => {
      const result = await collector.collectMentions("token", "account-1");
      expect(result.platform).toBe("TWITTER");
    });

    it("should implement collectDirectMessages", async () => {
      const result = await collector.collectDirectMessages(
        "token",
        "account-1",
      );
      expect(result.platform).toBe("TWITTER");
    });

    it("should implement collectComments", async () => {
      const result = await collector.collectComments("token", "account-1");
      expect(result.platform).toBe("TWITTER");
    });
  });
});
