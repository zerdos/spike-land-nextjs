import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  clearAllRateLimits,
  forceMemoryStorage,
  getRateLimitStoreSize,
  rateLimitConfigs,
  resetKVAvailability,
  resetRateLimit,
  stopCleanupInterval,
} from "./rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    // Force memory storage for tests (don't attempt KV connection)
    forceMemoryStorage();
    resetKVAvailability();
    clearAllRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopCleanupInterval();
    clearAllRateLimits();
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    const config = { maxRequests: 3, windowMs: 1000 };

    it("should allow first request", async () => {
      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2); // 3 - 1 = 2
    });

    it("should track remaining requests correctly", async () => {
      const result1 = await checkRateLimit("user1", config);
      const result2 = await checkRateLimit("user1", config);
      const result3 = await checkRateLimit("user1", config);

      expect(result1.remaining).toBe(2);
      expect(result2.remaining).toBe(1);
      expect(result3.remaining).toBe(0);
    });

    it("should limit after max requests reached", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("should track different users independently", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);

      const user1Result = await checkRateLimit("user1", config);
      const user2Result = await checkRateLimit("user2", config);

      expect(user1Result.remaining).toBe(0); // user1 at limit
      expect(user2Result.remaining).toBe(2); // user2 just started
    });

    it("should reset after window expires", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2); // Reset to initial
    });

    it("should return correct resetAt timestamp", async () => {
      const now = Date.now();
      const result = await checkRateLimit("user1", config);

      expect(result.resetAt).toBe(now + config.windowMs);
    });

    it("should return consistent resetAt for subsequent requests", async () => {
      const result1 = await checkRateLimit("user1", config);
      vi.advanceTimersByTime(100);
      const result2 = await checkRateLimit("user1", config);

      // resetAt should be the same (based on first request)
      expect(result1.resetAt).toBe(result2.resetAt);
    });
  });

  describe("resetRateLimit", () => {
    const config = { maxRequests: 2, windowMs: 1000 };

    it("should reset rate limit for specific user", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);

      // User1 is at limit
      expect((await checkRateLimit("user1", config)).isLimited).toBe(true);

      await resetRateLimit("user1");

      // User1 should be reset
      const result = await checkRateLimit("user1", config);
      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(1);
    });

    it("should not affect other users", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);
      await checkRateLimit("user2", config);

      await resetRateLimit("user1");

      // User2 should still be at limit
      expect((await checkRateLimit("user2", config)).isLimited).toBe(true);
    });
  });

  describe("clearAllRateLimits", () => {
    const config = { maxRequests: 2, windowMs: 1000 };

    it("should clear all rate limits", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);
      await checkRateLimit("user2", config);

      await clearAllRateLimits();

      expect((await checkRateLimit("user1", config)).remaining).toBe(1);
      expect((await checkRateLimit("user2", config)).remaining).toBe(1);
    });

    it("should reset store size to zero", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);

      expect(getRateLimitStoreSize()).toBe(2);

      await clearAllRateLimits();

      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe("getRateLimitStoreSize", () => {
    const config = { maxRequests: 5, windowMs: 1000 };

    it("should return correct store size", async () => {
      expect(getRateLimitStoreSize()).toBe(0);

      await checkRateLimit("user1", config);
      expect(getRateLimitStoreSize()).toBe(1);

      await checkRateLimit("user2", config);
      expect(getRateLimitStoreSize()).toBe(2);

      await checkRateLimit("user1", config); // Same user, shouldn't increase
      expect(getRateLimitStoreSize()).toBe(2);
    });
  });

  describe("cleanup interval", () => {
    const config = { maxRequests: 5, windowMs: 1000 };

    it("should clean up stale entries", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);

      expect(getRateLimitStoreSize()).toBe(2);

      // Advance past 2x window to trigger cleanup
      vi.advanceTimersByTime(2001);

      // Trigger cleanup by making another request
      // (cleanup runs on interval, advance timers again)
      vi.advanceTimersByTime(1000);

      // The entries should be cleaned up
      // Note: Cleanup removes entries older than windowMs * 2
      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe("rateLimitConfigs", () => {
    it("should have imageEnhancement config", () => {
      expect(rateLimitConfigs.imageEnhancement).toEqual({
        maxRequests: 10,
        windowMs: 60000,
      });
    });

    it("should have albumBatchEnhancement config", () => {
      expect(rateLimitConfigs.albumBatchEnhancement).toEqual({
        maxRequests: 5,
        windowMs: 60000,
      });
    });

    it("should have albumBatchEnhancement more restrictive than imageEnhancement", () => {
      expect(rateLimitConfigs.albumBatchEnhancement.maxRequests).toBeLessThan(
        rateLimitConfigs.imageEnhancement.maxRequests,
      );
      expect(rateLimitConfigs.albumBatchEnhancement.windowMs).toBe(
        rateLimitConfigs.imageEnhancement.windowMs,
      );
    });

    it("should have imageUpload config", () => {
      expect(rateLimitConfigs.imageUpload).toEqual({
        maxRequests: 30,
        windowMs: 60000,
      });
    });

    it("should have general config", () => {
      expect(rateLimitConfigs.general).toEqual({
        maxRequests: 100,
        windowMs: 60000,
      });
    });
  });
});
