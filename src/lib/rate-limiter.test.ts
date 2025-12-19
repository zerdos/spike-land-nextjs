import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  clearAllRateLimits,
  forceKVStorage,
  forceMemoryStorage,
  getRateLimitStoreSize,
  rateLimitConfigs,
  resetKVAvailability,
  resetRateLimit,
  stopCleanupInterval,
} from "./rate-limiter";

// Mock the @vercel/kv module
vi.mock("@vercel/kv", () => ({
  kv: {
    ping: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import the mocked kv after mocking
import { kv } from "@vercel/kv";

const mockedKV = vi.mocked(kv);

describe("rate-limiter", () => {
  beforeEach(async () => {
    // Reset state first, then force memory storage
    vi.useFakeTimers();
    vi.clearAllMocks();
    stopCleanupInterval();
    await clearAllRateLimits();
    // Force memory storage for tests (don't attempt KV connection)
    forceMemoryStorage();
  });

  afterEach(() => {
    stopCleanupInterval();
    clearAllRateLimits();
    vi.useRealTimers();
  });

  describe("checkRateLimit with memory storage", () => {
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

    it("should handle single max request config", async () => {
      const singleRequestConfig = { maxRequests: 1, windowMs: 1000 };

      const result1 = await checkRateLimit("user1", singleRequestConfig);
      const result2 = await checkRateLimit("user1", singleRequestConfig);

      expect(result1.isLimited).toBe(false);
      expect(result1.remaining).toBe(0);
      expect(result2.isLimited).toBe(true);
      expect(result2.remaining).toBe(0);
    });

    it("should handle very short window", async () => {
      const shortWindowConfig = { maxRequests: 2, windowMs: 10 };

      await checkRateLimit("user1", shortWindowConfig);
      await checkRateLimit("user1", shortWindowConfig);

      const limitedResult = await checkRateLimit("user1", shortWindowConfig);
      expect(limitedResult.isLimited).toBe(true);

      vi.advanceTimersByTime(11);

      const resetResult = await checkRateLimit("user1", shortWindowConfig);
      expect(resetResult.isLimited).toBe(false);
    });

    it("should handle various identifier formats", async () => {
      const identifiers = [
        "simple-user",
        "user@example.com",
        "192.168.1.1",
        "user:action:resource",
        "uuid-12345-67890",
      ];

      for (const id of identifiers) {
        const result = await checkRateLimit(id, config);
        expect(result.isLimited).toBe(false);
        expect(result.remaining).toBe(2);
      }

      expect(getRateLimitStoreSize()).toBe(identifiers.length);
    });
  });

  describe("checkRateLimit with KV storage", () => {
    const config = { maxRequests: 3, windowMs: 1000 };

    beforeEach(() => {
      resetKVAvailability();
      forceKVStorage();
      vi.clearAllMocks();
    });

    it("should use KV storage when available", async () => {
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2);
      expect(mockedKV.get).toHaveBeenCalledWith("ratelimit:user1");
      expect(mockedKV.set).toHaveBeenCalled();
    });

    it("should create new entry when no previous request exists in KV", async () => {
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      const now = Date.now();
      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2);
      expect(result.resetAt).toBe(now + config.windowMs);

      // Verify set was called with correct TTL
      expect(mockedKV.set).toHaveBeenCalledWith(
        "ratelimit:user1",
        expect.objectContaining({ count: 1 }),
        expect.objectContaining({ ex: expect.any(Number) }),
      );
    });

    it("should increment count for existing entry within window", async () => {
      const now = Date.now();
      mockedKV.get.mockResolvedValue({ count: 1, firstRequest: now });
      mockedKV.set.mockResolvedValue("OK");

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(1); // 3 - 2 = 1

      expect(mockedKV.set).toHaveBeenCalledWith(
        "ratelimit:user1",
        expect.objectContaining({ count: 2 }),
        expect.objectContaining({ ex: expect.any(Number) }),
      );
    });

    it("should return limited when max requests reached in KV", async () => {
      const now = Date.now();
      mockedKV.get.mockResolvedValue({ count: 3, firstRequest: now });

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.resetAt).toBe(now + config.windowMs);

      // Should not call set when already limited
      expect(mockedKV.set).not.toHaveBeenCalled();
    });

    it("should reset window when entry has expired in KV", async () => {
      const oldTime = Date.now() - 2000; // 2 seconds ago (past 1 second window)
      mockedKV.get.mockResolvedValue({ count: 3, firstRequest: oldTime });
      mockedKV.set.mockResolvedValue("OK");

      const now = Date.now();
      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2);
      expect(result.resetAt).toBe(now + config.windowMs);

      // Should create new entry
      expect(mockedKV.set).toHaveBeenCalledWith(
        "ratelimit:user1",
        expect.objectContaining({ count: 1 }),
        expect.objectContaining({ ex: expect.any(Number) }),
      );
    });

    it("should fall back to memory storage when KV operations fail", async () => {
      mockedKV.get.mockRejectedValue(new Error("KV connection failed"));

      // Should fall back to memory and work
      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(2);
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it("should use memory storage for subsequent requests after KV failure", async () => {
      // First request fails on KV
      mockedKV.get.mockRejectedValueOnce(new Error("KV connection failed"));

      await checkRateLimit("user1", config);

      // Clear mocks to verify no more KV calls
      vi.clearAllMocks();

      // Second request should use memory directly (kvAvailable set to false)
      const result = await checkRateLimit("user1", config);

      expect(result.remaining).toBe(1);
      expect(mockedKV.get).not.toHaveBeenCalled();
    });

    it("should calculate correct TTL for KV entries", async () => {
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      const windowMs = 60000; // 1 minute
      await checkRateLimit("user1", { maxRequests: 10, windowMs });

      // TTL should be (windowMs + 60000) / 1000 = 120 seconds
      expect(mockedKV.set).toHaveBeenCalledWith(
        "ratelimit:user1",
        expect.any(Object),
        { ex: 120 },
      );
    });
  });

  describe("KV availability detection", () => {
    beforeEach(() => {
      resetKVAvailability();
      vi.clearAllMocks();
    });

    it("should detect KV availability via ping", async () => {
      // Set env vars to enable KV check
      process.env.KV_REST_API_URL = "https://test.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";

      mockedKV.ping.mockResolvedValue("PONG");
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      // Reset to trigger ping check
      resetKVAvailability();

      await checkRateLimit("user1", { maxRequests: 5, windowMs: 1000 });

      expect(mockedKV.ping).toHaveBeenCalled();
      expect(mockedKV.get).toHaveBeenCalled();

      // Clean up
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it("should fall back to memory when ping fails", async () => {
      // Set env vars to enable KV check
      process.env.KV_REST_API_URL = "https://test.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";

      mockedKV.ping.mockRejectedValue(new Error("KV not available"));

      resetKVAvailability();

      const result = await checkRateLimit("user1", {
        maxRequests: 5,
        windowMs: 1000,
      });

      expect(mockedKV.ping).toHaveBeenCalled();
      expect(mockedKV.get).not.toHaveBeenCalled(); // Should not try to use KV
      expect(result.isLimited).toBe(false);

      // Clean up
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it("should cache KV availability status", async () => {
      // Set env vars to enable KV check
      process.env.KV_REST_API_URL = "https://test.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";

      mockedKV.ping.mockResolvedValue("PONG");
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      resetKVAvailability();

      await checkRateLimit("user1", { maxRequests: 5, windowMs: 1000 });
      await checkRateLimit("user2", { maxRequests: 5, windowMs: 1000 });
      await checkRateLimit("user3", { maxRequests: 5, windowMs: 1000 });

      // Ping should only be called once due to caching
      expect(mockedKV.ping).toHaveBeenCalledTimes(1);

      // Clean up
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it("should reset availability cache with resetKVAvailability", async () => {
      // Set env vars to enable KV check
      process.env.KV_REST_API_URL = "https://test.kv.vercel.com";
      process.env.KV_REST_API_TOKEN = "test-token";

      mockedKV.ping.mockResolvedValue("PONG");
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      resetKVAvailability();
      await checkRateLimit("user1", { maxRequests: 5, windowMs: 1000 });

      resetKVAvailability();
      await checkRateLimit("user2", { maxRequests: 5, windowMs: 1000 });

      // Should ping twice due to reset
      expect(mockedKV.ping).toHaveBeenCalledTimes(2);

      // Clean up
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    });

    it("should skip KV ping when env vars are not set", async () => {
      // Ensure env vars are not set
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      resetKVAvailability();

      const result = await checkRateLimit("user1", {
        maxRequests: 5,
        windowMs: 1000,
      });

      // Should not attempt to ping KV when env vars are missing
      expect(mockedKV.ping).not.toHaveBeenCalled();
      expect(result.isLimited).toBe(false);
    });
  });

  describe("resetRateLimit", () => {
    const config = { maxRequests: 2, windowMs: 1000 };

    it("should reset rate limit for specific user in memory", async () => {
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

    it("should reset rate limit in KV storage", async () => {
      forceKVStorage();
      mockedKV.del.mockResolvedValue(1);

      await resetRateLimit("user1");

      expect(mockedKV.del).toHaveBeenCalledWith("ratelimit:user1");
    });

    it("should handle KV deletion errors gracefully", async () => {
      forceKVStorage();
      mockedKV.del.mockRejectedValue(new Error("KV deletion failed"));

      // Should not throw
      await expect(resetRateLimit("user1")).resolves.not.toThrow();

      // Should still clear from memory
      expect(getRateLimitStoreSize()).toBe(0);
    });

    it("should reset non-existent user without error", async () => {
      await expect(resetRateLimit("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("clearAllRateLimits", () => {
    const config = { maxRequests: 2, windowMs: 1000 };

    it("should clear all rate limits in memory", async () => {
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

    it("should clear specific identifiers from KV when provided", async () => {
      forceKVStorage();
      mockedKV.del.mockResolvedValue(2);

      await clearAllRateLimits(["user1", "user2"]);

      expect(mockedKV.del).toHaveBeenCalledWith(
        "ratelimit:user1",
        "ratelimit:user2",
      );
    });

    it("should not call KV del when identifiers array is empty", async () => {
      forceKVStorage();

      await clearAllRateLimits([]);

      expect(mockedKV.del).not.toHaveBeenCalled();
    });

    it("should handle KV clear errors gracefully", async () => {
      forceKVStorage();
      mockedKV.del.mockRejectedValue(new Error("KV clear failed"));

      await expect(clearAllRateLimits(["user1"])).resolves.not.toThrow();

      // Should still clear memory store
      expect(getRateLimitStoreSize()).toBe(0);
    });

    it("should clear memory store even when no identifiers provided for KV", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);

      expect(getRateLimitStoreSize()).toBe(2);

      forceKVStorage();
      await clearAllRateLimits(); // No identifiers

      // Memory should still be cleared
      expect(getRateLimitStoreSize()).toBe(0);
      // KV del should not be called without identifiers
      expect(mockedKV.del).not.toHaveBeenCalled();
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

    it("should reflect cleared store", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);

      await clearAllRateLimits();

      expect(getRateLimitStoreSize()).toBe(0);
    });

    it("should reflect reset individual user", async () => {
      await checkRateLimit("user1", config);
      await checkRateLimit("user2", config);

      expect(getRateLimitStoreSize()).toBe(2);

      await resetRateLimit("user1");

      expect(getRateLimitStoreSize()).toBe(1);
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

    it("should not clean up recent entries", async () => {
      await checkRateLimit("user1", config);

      // Advance time but not past 2x window (windowMs * 2 = 2000)
      vi.advanceTimersByTime(1000);

      // Add another user
      await checkRateLimit("user2", config);

      expect(getRateLimitStoreSize()).toBe(2);

      // Advance past user1's 2x window threshold but not user2's
      // user1 was at t=0, user2 at t=1000
      // At t=2500, user1 is 2500ms old (> 2000 threshold), user2 is 1500ms old (< 2000 threshold)
      vi.advanceTimersByTime(1500);

      // Trigger cleanup (runs on windowMs interval = 1000ms)
      vi.advanceTimersByTime(1000);

      // User1 should be cleaned (over 2x window), user2 should remain
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it("should stop cleanup interval when stopCleanupInterval called", async () => {
      await checkRateLimit("user1", config);

      stopCleanupInterval();

      // Advance time significantly
      vi.advanceTimersByTime(10000);

      // Entry should still exist (no cleanup running)
      // New request would start cleanup again, so we just verify no error
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it("should handle calling stopCleanupInterval multiple times", () => {
      stopCleanupInterval();
      stopCleanupInterval();
      stopCleanupInterval();

      // Should not throw
      expect(true).toBe(true);
    });

    it("should restart cleanup interval after being stopped", async () => {
      await checkRateLimit("user1", config);
      stopCleanupInterval();

      // Make new request to restart cleanup
      await checkRateLimit("user2", config);

      // Advance time past cleanup threshold
      vi.advanceTimersByTime(3000);

      // Entries should be cleaned
      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe("forceMemoryStorage and forceKVStorage", () => {
    it("forceMemoryStorage should bypass KV", async () => {
      resetKVAvailability();
      forceMemoryStorage();

      await checkRateLimit("user1", { maxRequests: 5, windowMs: 1000 });

      expect(mockedKV.ping).not.toHaveBeenCalled();
      expect(mockedKV.get).not.toHaveBeenCalled();
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it("forceKVStorage should use KV", async () => {
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      resetKVAvailability();
      forceKVStorage();

      await checkRateLimit("user1", { maxRequests: 5, windowMs: 1000 });

      // Should skip ping and go directly to KV operations
      expect(mockedKV.get).toHaveBeenCalled();
    });

    it("should toggle between storage modes", async () => {
      mockedKV.get.mockResolvedValue(null);
      mockedKV.set.mockResolvedValue("OK");

      // Start with memory
      forceMemoryStorage();
      await checkRateLimit("user1", { maxRequests: 5, windowMs: 1000 });
      expect(mockedKV.get).not.toHaveBeenCalled();

      // Switch to KV
      forceKVStorage();
      await checkRateLimit("user2", { maxRequests: 5, windowMs: 1000 });
      expect(mockedKV.get).toHaveBeenCalled();

      // Switch back to memory
      forceMemoryStorage();
      vi.clearAllMocks();
      await checkRateLimit("user3", { maxRequests: 5, windowMs: 1000 });
      expect(mockedKV.get).not.toHaveBeenCalled();
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

    it("should have voucherRedemption config with 1 hour window", () => {
      expect(rateLimitConfigs.voucherRedemption).toEqual({
        maxRequests: 5,
        windowMs: 60 * 60 * 1000, // 1 hour
      });
    });

    it("should have mcpGenerate config", () => {
      expect(rateLimitConfigs.mcpGenerate).toEqual({
        maxRequests: 10,
        windowMs: 60000,
      });
    });

    it("should have mcpModify config", () => {
      expect(rateLimitConfigs.mcpModify).toEqual({
        maxRequests: 10,
        windowMs: 60000,
      });
    });

    it("should have mcpJobStatus config with higher limit for polling", () => {
      expect(rateLimitConfigs.mcpJobStatus).toEqual({
        maxRequests: 60,
        windowMs: 60000,
      });
      expect(rateLimitConfigs.mcpJobStatus.maxRequests).toBeGreaterThan(
        rateLimitConfigs.mcpGenerate.maxRequests,
      );
    });

    it("should have all configs with positive maxRequests", () => {
      for (const config of Object.values(rateLimitConfigs)) {
        expect(config.maxRequests).toBeGreaterThan(0);
        expect(config.windowMs).toBeGreaterThan(0);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle concurrent requests to same user", async () => {
      const config = { maxRequests: 10, windowMs: 1000 };

      // Simulate concurrent requests
      const promises = Array.from(
        { length: 5 },
        () => checkRateLimit("user1", config),
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.isLimited).toBe(false);
      });

      // Remaining should decrease
      expect(results[results.length - 1].remaining).toBe(5);
    });

    it("should handle empty identifier", async () => {
      const config = { maxRequests: 3, windowMs: 1000 };

      const result = await checkRateLimit("", config);

      expect(result.isLimited).toBe(false);
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it("should handle very large maxRequests", async () => {
      const config = { maxRequests: 1000000, windowMs: 1000 };

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(999999);
    });

    it("should handle very long window", async () => {
      const config = { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 }; // 24 hours

      const result = await checkRateLimit("user1", config);

      expect(result.isLimited).toBe(false);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("should handle special characters in identifier", async () => {
      const config = { maxRequests: 3, windowMs: 1000 };
      const specialIds = [
        "user/with/slashes",
        "user?with=query",
        "user#with#hash",
        "user with spaces",
        "user\twith\ttabs",
      ];

      for (const id of specialIds) {
        const result = await checkRateLimit(id, config);
        expect(result.isLimited).toBe(false);
      }

      expect(getRateLimitStoreSize()).toBe(specialIds.length);
    });

    it("should handle exactly at limit boundary", async () => {
      const config = { maxRequests: 3, windowMs: 1000 };

      // Make exactly maxRequests calls
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);
      const lastAllowed = await checkRateLimit("user1", config);

      expect(lastAllowed.isLimited).toBe(false);
      expect(lastAllowed.remaining).toBe(0);

      // Next should be limited
      const firstLimited = await checkRateLimit("user1", config);
      expect(firstLimited.isLimited).toBe(true);
      expect(firstLimited.remaining).toBe(0);
    });

    it("should handle window expiry exactly at boundary", async () => {
      const config = { maxRequests: 2, windowMs: 1000 };

      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);

      // Advance exactly to window boundary
      vi.advanceTimersByTime(1000);

      // Should still be limited at exactly the boundary
      const atBoundary = await checkRateLimit("user1", config);
      expect(atBoundary.isLimited).toBe(true);

      // One ms later should reset
      vi.advanceTimersByTime(1);
      const pastBoundary = await checkRateLimit("user1", config);
      expect(pastBoundary.isLimited).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical API usage pattern", async () => {
      const config = rateLimitConfigs.imageEnhancement;

      // Simulate burst of requests
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit("user1", config);
        expect(result.isLimited).toBe(false);
      }

      // 11th should be limited
      const limited = await checkRateLimit("user1", config);
      expect(limited.isLimited).toBe(true);

      // Wait for window to pass
      vi.advanceTimersByTime(60001);

      // Should be able to make requests again
      const afterWindow = await checkRateLimit("user1", config);
      expect(afterWindow.isLimited).toBe(false);
    });

    it("should handle multiple users with different usage patterns", async () => {
      const config = { maxRequests: 5, windowMs: 1000 };

      // User1: Heavy usage
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("heavy-user", config);
      }

      // User2: Light usage
      await checkRateLimit("light-user", config);

      // User3: No usage yet

      // Check states
      expect((await checkRateLimit("heavy-user", config)).isLimited).toBe(true);
      expect((await checkRateLimit("light-user", config)).isLimited).toBe(
        false,
      );
      expect((await checkRateLimit("new-user", config)).isLimited).toBe(false);
    });

    it("should handle rate limit with admin reset", async () => {
      const config = { maxRequests: 3, windowMs: 10000 };

      // User gets rate limited
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);
      await checkRateLimit("user1", config);

      expect((await checkRateLimit("user1", config)).isLimited).toBe(true);

      // Admin resets the user
      await resetRateLimit("user1");

      // User can make requests again
      expect((await checkRateLimit("user1", config)).isLimited).toBe(false);
    });
  });
});
