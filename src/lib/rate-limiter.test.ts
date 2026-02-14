
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  forceKVStorage,
  resetKVAvailability,
} from "./rate-limiter";
import { redis } from "@/lib/upstash/client";

// Mock the Redis client
vi.mock("@/lib/upstash/client", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    ping: vi.fn(),
    del: vi.fn(),
    eval: vi.fn(),
  },
}));

describe("checkRateLimit", () => {
  const identifier = "test-user";
  const config = {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    // Ensure we are using KV storage
    process.env.UPSTASH_REDIS_REST_URL = "https://example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    resetKVAvailability();
    forceKVStorage();

    // Default ping success
    vi.mocked(redis.ping).mockResolvedValue("PONG");
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("should return allow result when Lua script returns success", async () => {
    const now = Date.now();
    // Mock Lua script returning [isLimited=0, remaining=4, resetAt=now+window]
    vi.mocked(redis.eval).mockResolvedValue([0, 4, now + config.windowMs]);

    const result = await checkRateLimit(identifier, config);

    expect(result.isLimited).toBe(false);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBe(now + config.windowMs);

    // Verify eval was called with correct arguments
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("local key = KEYS[1]"), // The script
      [`ratelimit:${identifier}`],
      [config.windowMs, config.maxRequests, now]
    );
  });

  it("should return block result when Lua script returns limited", async () => {
    const now = Date.now();
    // Mock Lua script returning [isLimited=1, remaining=0, resetAt=now+window]
    vi.mocked(redis.eval).mockResolvedValue([1, 0, now + config.windowMs]);

    const result = await checkRateLimit(identifier, config);

    expect(result.isLimited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBe(now + config.windowMs);
  });

  it("should handle error from Lua script by falling back to memory", async () => {
    // Mock Lua script failing
    vi.mocked(redis.eval).mockRejectedValue(new Error("Redis error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkRateLimit(identifier, config);

    // Should fall back to memory
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Redis rate limit check failed"),
      expect.any(Error)
    );
    // Since fallback to memory is a separate path, we can't easily check return value
    // without inspecting internal memory store, but we can check result structure
    expect(result).toHaveProperty("isLimited");
    expect(result).toHaveProperty("remaining");
  });
});
