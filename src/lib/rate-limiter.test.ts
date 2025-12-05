import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  clearAllRateLimits,
  getRateLimitStoreSize,
  rateLimitConfigs,
  resetRateLimit,
  stopCleanupInterval,
} from "./rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
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

    it("should allow first request", () => {
      const result = checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2); // 3 - 1 = 2
    });

    it("should track remaining requests correctly", () => {
      const result1 = checkRateLimit("user1", config);
      const result2 = checkRateLimit("user1", config);
      const result3 = checkRateLimit("user1", config);

      expect(result1.remaining).toBe(2);
      expect(result2.remaining).toBe(1);
      expect(result3.remaining).toBe(0);
    });

    it("should limit after max requests reached", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user1", config);
      checkRateLimit("user1", config);

      const result = checkRateLimit("user1", config);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("should track different users independently", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user1", config);

      const user1Result = checkRateLimit("user1", config);
      const user2Result = checkRateLimit("user2", config);

      expect(user1Result.remaining).toBe(0); // user1 at limit
      expect(user2Result.remaining).toBe(2); // user2 just started
    });

    it("should reset after window expires", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user1", config);
      checkRateLimit("user1", config);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      const result = checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2); // Reset to initial
    });

    it("should return correct resetAt timestamp", () => {
      const now = Date.now();
      const result = checkRateLimit("user1", config);

      expect(result.resetAt).toBe(now + config.windowMs);
    });

    it("should return consistent resetAt for subsequent requests", () => {
      const result1 = checkRateLimit("user1", config);
      vi.advanceTimersByTime(100);
      const result2 = checkRateLimit("user1", config);

      // resetAt should be the same (based on first request)
      expect(result1.resetAt).toBe(result2.resetAt);
    });
  });

  describe("resetRateLimit", () => {
    const config = { maxRequests: 2, windowMs: 1000 };

    it("should reset rate limit for specific user", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user1", config);

      // User1 is at limit
      expect(checkRateLimit("user1", config).isLimited).toBe(true);

      resetRateLimit("user1");

      // User1 should be reset
      const result = checkRateLimit("user1", config);
      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(1);
    });

    it("should not affect other users", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user2", config);
      checkRateLimit("user2", config);

      resetRateLimit("user1");

      // User2 should still be at limit
      expect(checkRateLimit("user2", config).isLimited).toBe(true);
    });
  });

  describe("clearAllRateLimits", () => {
    const config = { maxRequests: 2, windowMs: 1000 };

    it("should clear all rate limits", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user2", config);
      checkRateLimit("user2", config);

      clearAllRateLimits();

      expect(checkRateLimit("user1", config).remaining).toBe(1);
      expect(checkRateLimit("user2", config).remaining).toBe(1);
    });

    it("should reset store size to zero", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user2", config);

      expect(getRateLimitStoreSize()).toBe(2);

      clearAllRateLimits();

      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe("getRateLimitStoreSize", () => {
    const config = { maxRequests: 5, windowMs: 1000 };

    it("should return correct store size", () => {
      expect(getRateLimitStoreSize()).toBe(0);

      checkRateLimit("user1", config);
      expect(getRateLimitStoreSize()).toBe(1);

      checkRateLimit("user2", config);
      expect(getRateLimitStoreSize()).toBe(2);

      checkRateLimit("user1", config); // Same user, shouldn't increase
      expect(getRateLimitStoreSize()).toBe(2);
    });
  });

  describe("cleanup interval", () => {
    const config = { maxRequests: 5, windowMs: 1000 };

    it("should clean up stale entries", () => {
      checkRateLimit("user1", config);
      checkRateLimit("user2", config);

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
