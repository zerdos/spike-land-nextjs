import type { ContentRewriteResponse } from "@/lib/validations/brand-rewrite";
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
  buildRewriteCacheKey,
  deleteCachedRewrite,
  getCachedRewrite,
  setCachedRewrite,
} from "./rewrite-cache";

// Get the mocked redis for assertions
const mockRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

describe("rewrite-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("buildRewriteCacheKey", () => {
    it("should build consistent cache key for same inputs", () => {
      const key1 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "test content",
        "GENERAL",
      );
      const key2 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "test content",
        "GENERAL",
      );

      expect(key1).toBe(key2);
    });

    it("should include workspace ID in key", () => {
      const key = buildRewriteCacheKey(
        "workspace-abc",
        1,
        "content",
        "GENERAL",
      );

      expect(key).toContain("workspace-abc");
    });

    it("should include profile version in key", () => {
      const key = buildRewriteCacheKey(
        "workspace-123",
        5,
        "content",
        "GENERAL",
      );

      expect(key).toContain("v5");
    });

    it("should include platform in key", () => {
      const key = buildRewriteCacheKey(
        "workspace-123",
        1,
        "content",
        "TWITTER",
      );

      expect(key).toContain("TWITTER");
    });

    it("should produce different keys for different content", () => {
      const key1 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "content A",
        "GENERAL",
      );
      const key2 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "content B",
        "GENERAL",
      );

      expect(key1).not.toBe(key2);
    });

    it("should produce different keys for different versions", () => {
      const key1 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "same content",
        "GENERAL",
      );
      const key2 = buildRewriteCacheKey(
        "workspace-123",
        2,
        "same content",
        "GENERAL",
      );

      expect(key1).not.toBe(key2);
    });

    it("should produce different keys for different workspaces", () => {
      const key1 = buildRewriteCacheKey(
        "workspace-A",
        1,
        "same content",
        "GENERAL",
      );
      const key2 = buildRewriteCacheKey(
        "workspace-B",
        1,
        "same content",
        "GENERAL",
      );

      expect(key1).not.toBe(key2);
    });

    it("should produce different keys for different platforms", () => {
      const key1 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "same content",
        "TWITTER",
      );
      const key2 = buildRewriteCacheKey(
        "workspace-123",
        1,
        "same content",
        "LINKEDIN",
      );

      expect(key1).not.toBe(key2);
    });

    it("should use brand-rewrite prefix", () => {
      const key = buildRewriteCacheKey("ws", 1, "content", "GENERAL");

      expect(key.startsWith("brand-rewrite:")).toBe(true);
    });

    it("should use 16-character content hash", () => {
      const key = buildRewriteCacheKey("ws", 1, "content", "GENERAL");
      const parts = key.split(":");

      // Format: brand-rewrite:workspaceId:vN:platform:hash
      expect(parts.length).toBe(5);
      expect(parts[4]!.length).toBe(16);
    });

    it("should handle empty content", () => {
      const key = buildRewriteCacheKey("ws", 1, "", "GENERAL");

      expect(key).toBeDefined();
      expect(key.startsWith("brand-rewrite:")).toBe(true);
    });

    it("should handle unicode content", () => {
      const key = buildRewriteCacheKey(
        "ws",
        1,
        "Hello \u{1F600} World",
        "GENERAL",
      );

      expect(key).toBeDefined();
      expect(key.split(":")[4]!.length).toBe(16);
    });
  });

  describe("getCachedRewrite", () => {
    const mockRewrite: ContentRewriteResponse = {
      id: "rewrite-123",
      original: "Original content",
      rewritten: "Rewritten content",
      platform: "GENERAL",
      changes: [
        { id: "hunk-0", type: "unchanged", value: "Original", selected: true },
        { id: "hunk-1", type: "removed", value: " content", selected: true },
        {
          id: "hunk-2",
          type: "added",
          value: "Rewritten content",
          selected: true,
        },
      ],
      characterCount: {
        original: 16,
        rewritten: 17,
        limit: 50000,
      },
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

    it("should return cached rewrite when found", async () => {
      mockRedis.get.mockResolvedValue(mockRewrite);

      const result = await getCachedRewrite("test-key");

      expect(result).toEqual(mockRewrite);
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null when cache miss", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getCachedRewrite("test-key");

      expect(result).toBeNull();
    });

    it("should return null on Redis error", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis error"));

      const result = await getCachedRewrite("test-key");

      expect(result).toBeNull();
    });

    it("should call redis.get with correct key", async () => {
      mockRedis.get.mockResolvedValue(null);

      await getCachedRewrite("my-cache-key");

      expect(mockRedis.get).toHaveBeenCalledWith("my-cache-key");
      expect(mockRedis.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("setCachedRewrite", () => {
    const mockRewrite: ContentRewriteResponse = {
      id: "rewrite-456",
      original: "Original text",
      rewritten: "Brand-aligned text",
      platform: "TWITTER",
      changes: [],
      characterCount: {
        original: 13,
        rewritten: 18,
        limit: 280,
      },
      toneAnalysis: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
        alignment: 75,
      },
      cached: false,
    };

    it("should cache rewrite with default TTL", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await setCachedRewrite("test-key", mockRewrite);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", mockRewrite, {
        ex: 3600, // 1 hour default
      });
    });

    it("should cache rewrite with custom TTL", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await setCachedRewrite("test-key", mockRewrite, 1800);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", mockRewrite, {
        ex: 1800,
      });
    });

    it("should not throw on Redis error", async () => {
      mockRedis.set.mockRejectedValue(new Error("Redis error"));

      // Should not throw
      await expect(setCachedRewrite("test-key", mockRewrite)).resolves
        .toBeUndefined();
    });

    it("should call redis.set with correct parameters", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await setCachedRewrite("my-key", mockRewrite, 7200);

      expect(mockRedis.set).toHaveBeenCalledWith("my-key", mockRewrite, {
        ex: 7200,
      });
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteCachedRewrite", () => {
    it("should delete cached rewrite", async () => {
      mockRedis.del.mockResolvedValue(1);

      await deleteCachedRewrite("test-key");

      expect(mockRedis.del).toHaveBeenCalledWith("test-key");
    });

    it("should not throw on Redis error", async () => {
      mockRedis.del.mockRejectedValue(new Error("Redis error"));

      // Should not throw
      await expect(deleteCachedRewrite("test-key")).resolves.toBeUndefined();
    });

    it("should handle key not found (del returns 0)", async () => {
      mockRedis.del.mockResolvedValue(0);

      // Should not throw even when key doesn't exist
      await expect(deleteCachedRewrite("non-existent-key")).resolves
        .toBeUndefined();
      expect(mockRedis.del).toHaveBeenCalledWith("non-existent-key");
    });

    it("should call redis.del with correct key", async () => {
      mockRedis.del.mockResolvedValue(1);

      await deleteCachedRewrite("cache-key-to-delete");

      expect(mockRedis.del).toHaveBeenCalledWith("cache-key-to-delete");
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
    });
  });
});
