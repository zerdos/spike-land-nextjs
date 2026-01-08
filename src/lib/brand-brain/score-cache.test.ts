import type { ContentScoreResponse } from "@/lib/validations/brand-score";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Redis - must be defined before vi.mock to work with hoisting
vi.mock("@/lib/upstash", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import after mock setup
import { redis } from "@/lib/upstash";
import {
  buildScoreCacheKey,
  deleteCachedScore,
  getCachedScore,
  setCachedScore,
} from "./score-cache";

// Get the mocked redis for assertions
const mockRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

describe("score-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("buildScoreCacheKey", () => {
    it("should build consistent cache key for same inputs", () => {
      const key1 = buildScoreCacheKey("workspace-123", 1, "test content");
      const key2 = buildScoreCacheKey("workspace-123", 1, "test content");

      expect(key1).toBe(key2);
    });

    it("should include workspace ID in key", () => {
      const key = buildScoreCacheKey("workspace-abc", 1, "content");

      expect(key).toContain("workspace-abc");
    });

    it("should include profile version in key", () => {
      const key = buildScoreCacheKey("workspace-123", 5, "content");

      expect(key).toContain("v5");
    });

    it("should produce different keys for different content", () => {
      const key1 = buildScoreCacheKey("workspace-123", 1, "content A");
      const key2 = buildScoreCacheKey("workspace-123", 1, "content B");

      expect(key1).not.toBe(key2);
    });

    it("should produce different keys for different versions", () => {
      const key1 = buildScoreCacheKey("workspace-123", 1, "same content");
      const key2 = buildScoreCacheKey("workspace-123", 2, "same content");

      expect(key1).not.toBe(key2);
    });

    it("should produce different keys for different workspaces", () => {
      const key1 = buildScoreCacheKey("workspace-A", 1, "same content");
      const key2 = buildScoreCacheKey("workspace-B", 1, "same content");

      expect(key1).not.toBe(key2);
    });

    it("should use brand-score prefix", () => {
      const key = buildScoreCacheKey("ws", 1, "content");

      expect(key.startsWith("brand-score:")).toBe(true);
    });

    it("should use 16-character content hash", () => {
      const key = buildScoreCacheKey("ws", 1, "content");
      const parts = key.split(":");

      // Format: brand-score:workspaceId:vN:hash
      expect(parts.length).toBe(4);
      expect(parts[3]!.length).toBe(16);
    });
  });

  describe("getCachedScore", () => {
    const mockScore: ContentScoreResponse = {
      score: 85,
      overallAssessment: "GOOD",
      violations: [],
      suggestions: [],
      toneAnalysis: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
        alignment: 85,
      },
      cached: true,
      cachedAt: "2024-01-01T00:00:00.000Z",
    };

    it("should return cached score when found", async () => {
      mockRedis.get.mockResolvedValue(mockScore);

      const result = await getCachedScore("test-key");

      expect(result).toEqual(mockScore);
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null when cache miss", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getCachedScore("test-key");

      expect(result).toBeNull();
    });

    it("should return null on Redis error", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis error"));

      const result = await getCachedScore("test-key");

      expect(result).toBeNull();
    });
  });

  describe("setCachedScore", () => {
    const mockScore: ContentScoreResponse = {
      score: 75,
      overallAssessment: "GOOD",
      violations: [],
      suggestions: [],
      toneAnalysis: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
        alignment: 75,
      },
      cached: false,
    };

    it("should cache score with default TTL", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await setCachedScore("test-key", mockScore);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", mockScore, {
        ex: 3600, // 1 hour default
      });
    });

    it("should cache score with custom TTL", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await setCachedScore("test-key", mockScore, 1800);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", mockScore, {
        ex: 1800,
      });
    });

    it("should not throw on Redis error", async () => {
      mockRedis.set.mockRejectedValue(new Error("Redis error"));

      // Should not throw
      await expect(setCachedScore("test-key", mockScore)).resolves
        .toBeUndefined();
    });
  });

  describe("deleteCachedScore", () => {
    it("should delete cached score", async () => {
      mockRedis.del.mockResolvedValue(1);

      await deleteCachedScore("test-key");

      expect(mockRedis.del).toHaveBeenCalledWith("test-key");
    });

    it("should not throw on Redis error", async () => {
      mockRedis.del.mockRejectedValue(new Error("Redis error"));

      // Should not throw
      await expect(deleteCachedScore("test-key")).resolves.toBeUndefined();
    });
  });
});
