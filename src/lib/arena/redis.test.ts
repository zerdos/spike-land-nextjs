import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ARENA_KEYS,
  setSubmissionState,
  getSubmissionState,
  setSubmissionWorking,
  isSubmissionWorking,
  cacheLeaderboard,
  getCachedLeaderboard,
  cacheChallengeList,
  getCachedChallengeList,
} from "./redis";

// Mock upstash
vi.mock("@/lib/upstash", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
  publishSSEEvent: vi.fn().mockResolvedValue(undefined),
  getSSEEvents: vi.fn().mockResolvedValue([]),
}));

import { redis } from "@/lib/upstash";

const mockRedis = vi.mocked(redis);

describe("Arena Redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ARENA_KEYS", () => {
    it("generates correct submission state key", () => {
      expect(ARENA_KEYS.SUBMISSION_STATE("abc123")).toBe(
        "arena:submission:abc123:state",
      );
    });

    it("generates correct submission working key", () => {
      expect(ARENA_KEYS.SUBMISSION_WORKING("abc123")).toBe(
        "arena:submission:abc123:working",
      );
    });

    it("generates correct SSE events key", () => {
      expect(ARENA_KEYS.SSE_EVENTS("abc123")).toBe(
        "arena:sse:abc123:events",
      );
    });

    it("has static leaderboard cache key", () => {
      expect(ARENA_KEYS.LEADERBOARD_CACHE).toBe("arena:leaderboard:top50");
    });

    it("has static challenge list cache key", () => {
      expect(ARENA_KEYS.CHALLENGE_LIST_CACHE).toBe("arena:challenges:open");
    });
  });

  describe("setSubmissionState / getSubmissionState", () => {
    it("sets state with 5min TTL", async () => {
      await setSubmissionState("sub1", "GENERATING");
      expect(mockRedis.set).toHaveBeenCalledWith(
        "arena:submission:sub1:state",
        "GENERATING",
        { ex: 300 },
      );
    });

    it("gets state from Redis", async () => {
      mockRedis.get.mockResolvedValue("TRANSPILING");
      const state = await getSubmissionState("sub1");
      expect(state).toBe("TRANSPILING");
    });

    it("returns null when no state", async () => {
      mockRedis.get.mockResolvedValue(null);
      const state = await getSubmissionState("sub1");
      expect(state).toBeNull();
    });
  });

  describe("setSubmissionWorking / isSubmissionWorking", () => {
    it("sets working flag with TTL", async () => {
      await setSubmissionWorking("sub1", true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "arena:submission:sub1:working",
        "1",
        { ex: 300 },
      );
    });

    it("deletes working flag when false", async () => {
      await setSubmissionWorking("sub1", false);
      expect(mockRedis.del).toHaveBeenCalledWith(
        "arena:submission:sub1:working",
      );
    });

    it("returns true when working", async () => {
      mockRedis.get.mockResolvedValue("1");
      expect(await isSubmissionWorking("sub1")).toBe(true);
    });

    it("returns false when not working", async () => {
      mockRedis.get.mockResolvedValue(null);
      expect(await isSubmissionWorking("sub1")).toBe(false);
    });
  });

  describe("cacheLeaderboard / getCachedLeaderboard", () => {
    it("caches with 60s TTL", async () => {
      const data = [{ rank: 1, elo: 1400 }];
      await cacheLeaderboard(data);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "arena:leaderboard:top50",
        JSON.stringify(data),
        { ex: 60 },
      );
    });

    it("returns null when no cache", async () => {
      mockRedis.get.mockResolvedValue(null);
      expect(await getCachedLeaderboard()).toBeNull();
    });

    it("returns parsed data from cache", async () => {
      const data = [{ rank: 1, elo: 1400 }];
      mockRedis.get.mockResolvedValue(JSON.stringify(data));
      const result = await getCachedLeaderboard();
      expect(result).toEqual(data);
    });
  });

  describe("cacheChallengeList / getCachedChallengeList", () => {
    it("caches with 30s TTL", async () => {
      const data = [{ id: "ch1", title: "Test" }];
      await cacheChallengeList(data);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "arena:challenges:open",
        JSON.stringify(data),
        { ex: 30 },
      );
    });

    it("returns null when no cache", async () => {
      mockRedis.get.mockResolvedValue(null);
      expect(await getCachedChallengeList()).toBeNull();
    });
  });
});
