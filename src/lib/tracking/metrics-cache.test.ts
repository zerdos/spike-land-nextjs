/**
 * Metrics Cache Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions - declared first at module scope
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    campaignMetricsCache: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
    },
  },
}));

const {
  buildCacheKey,
  cleanupExpiredCache,
  getCachedMetrics,
  getOrComputeMetrics,
  invalidateCache,
  setCachedMetrics,
} = await import("./metrics-cache");

describe("Metrics Cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedMetrics", () => {
    it("should return null if cache key not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await getCachedMetrics("nonexistent-key");

      expect(result).toBeNull();
    });

    it("should return null and delete if cache has expired", async () => {
      const expiredCache = {
        cacheKey: "test-key",
        metrics: { value: 42 },
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        computedAt: new Date(Date.now() - 60000),
      };
      mockFindUnique.mockResolvedValueOnce(expiredCache);
      mockDelete.mockResolvedValueOnce({});

      const result = await getCachedMetrics("test-key");

      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalledWith({
        where: { cacheKey: "test-key" },
      });
    });

    it("should return cached metrics if valid", async () => {
      const validCache = {
        cacheKey: "test-key",
        metrics: { visitors: 100, revenue: 500 },
        expiresAt: new Date(Date.now() + 60000), // Expires in 1 minute
        computedAt: new Date(),
      };
      mockFindUnique.mockResolvedValueOnce(validCache);

      const result = await getCachedMetrics<
        { visitors: number; revenue: number; }
      >("test-key");

      expect(result).toEqual({ visitors: 100, revenue: 500 });
    });

    it("should return null on database error", async () => {
      mockFindUnique.mockRejectedValueOnce(new Error("Database error"));

      const result = await getCachedMetrics("test-key");

      expect(result).toBeNull();
    });
  });

  describe("setCachedMetrics", () => {
    it("should upsert cache entry with default TTL", async () => {
      mockUpsert.mockResolvedValueOnce({});

      await setCachedMetrics("test-key", { value: 42 });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cacheKey: "test-key" },
          update: expect.objectContaining({
            metrics: { value: 42 },
          }),
          create: expect.objectContaining({
            cacheKey: "test-key",
            metrics: { value: 42 },
          }),
        }),
      );
    });

    it("should upsert cache entry with custom TTL", async () => {
      mockUpsert.mockResolvedValueOnce({});
      const beforeCall = Date.now();

      await setCachedMetrics("test-key", { value: 42 }, 600); // 10 minutes

      const call = mockUpsert.mock.calls[0]![0];
      const expiresAt = call.create.expiresAt as Date;

      // Should expire approximately 600 seconds from now
      const expectedMinExpiry = beforeCall + 600 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry - 1000,
      );
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMinExpiry + 1000);
    });

    it("should not throw on database error", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("Database error"));

      // Should not throw
      await expect(setCachedMetrics("test-key", { value: 42 })).resolves.not
        .toThrow();
    });
  });

  describe("invalidateCache", () => {
    it("should delete all cache entries when no pattern provided", async () => {
      mockDeleteMany.mockResolvedValueOnce({ count: 5 });

      const result = await invalidateCache();

      expect(result).toBe(5);
      expect(mockDeleteMany).toHaveBeenCalledWith({});
    });

    it("should delete matching cache entries when pattern provided", async () => {
      mockDeleteMany.mockResolvedValueOnce({ count: 3 });

      const result = await invalidateCache("overview");

      expect(result).toBe(3);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          cacheKey: {
            contains: "overview",
          },
        },
      });
    });

    it("should return 0 on database error", async () => {
      mockDeleteMany.mockRejectedValueOnce(new Error("Database error"));

      const result = await invalidateCache();

      expect(result).toBe(0);
    });
  });

  describe("cleanupExpiredCache", () => {
    it("should delete expired cache entries", async () => {
      mockDeleteMany.mockResolvedValueOnce({ count: 10 });

      const result = await cleanupExpiredCache();

      expect(result).toBe(10);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it("should return 0 on database error", async () => {
      mockDeleteMany.mockRejectedValueOnce(new Error("Database error"));

      const result = await cleanupExpiredCache();

      expect(result).toBe(0);
    });
  });

  describe("buildCacheKey", () => {
    it("should build cache key with prefix only", () => {
      const key = buildCacheKey("overview", {});

      expect(key).toBe("overview");
    });

    it("should build cache key with sorted parameters", () => {
      const key = buildCacheKey("campaigns", {
        endDate: "2024-01-31",
        startDate: "2024-01-01",
        model: "FIRST_TOUCH",
      });

      expect(key).toBe(
        "campaigns:endDate:2024-01-31:model:FIRST_TOUCH:startDate:2024-01-01",
      );
    });

    it("should exclude undefined parameters", () => {
      const key = buildCacheKey("overview", {
        startDate: "2024-01-01",
        platform: undefined,
        model: "LAST_TOUCH",
      });

      expect(key).toBe("overview:model:LAST_TOUCH:startDate:2024-01-01");
    });

    it("should handle numeric values", () => {
      const key = buildCacheKey("campaigns", {
        limit: 50,
        offset: 0,
      });

      expect(key).toBe("campaigns:limit:50:offset:0");
    });
  });

  describe("getOrComputeMetrics", () => {
    it("should return cached value if available", async () => {
      const cachedData = { visitors: 100 };
      mockFindUnique.mockResolvedValueOnce({
        cacheKey: "test-key",
        metrics: cachedData,
        expiresAt: new Date(Date.now() + 60000),
        computedAt: new Date(),
      });

      const computeFn = vi.fn().mockResolvedValue({ visitors: 200 });
      const result = await getOrComputeMetrics("test-key", computeFn);

      expect(result).toEqual(cachedData);
      expect(computeFn).not.toHaveBeenCalled();
    });

    it("should compute and cache value if not cached", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockUpsert.mockResolvedValueOnce({});

      const computedData = { visitors: 200 };
      const computeFn = vi.fn().mockResolvedValue(computedData);
      const result = await getOrComputeMetrics("test-key", computeFn);

      expect(result).toEqual(computedData);
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("should compute if cache expired", async () => {
      mockFindUnique.mockResolvedValueOnce({
        cacheKey: "test-key",
        metrics: { visitors: 100 },
        expiresAt: new Date(Date.now() - 1000), // Expired
        computedAt: new Date(Date.now() - 60000),
      });
      mockDelete.mockResolvedValueOnce({});
      mockUpsert.mockResolvedValueOnce({});

      const computedData = { visitors: 200 };
      const computeFn = vi.fn().mockResolvedValue(computedData);
      const result = await getOrComputeMetrics("test-key", computeFn);

      expect(result).toEqual(computedData);
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it("should use custom TTL when provided", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockUpsert.mockResolvedValueOnce({});

      const computeFn = vi.fn().mockResolvedValue({ visitors: 200 });
      await getOrComputeMetrics("test-key", computeFn, 1800); // 30 minutes

      // Verify TTL is passed to upsert
      const call = mockUpsert.mock.calls[0]![0];
      const expiresAt = call.create.expiresAt as Date;
      const expectedMinExpiry = Date.now() + 1800 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry - 1000,
      );
    });
  });
});
