import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock redis
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
vi.mock("@/lib/upstash/client", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));

import {
  deleteBundleCache,
  deleteBundleFallbackCache,
  getBundleCache,
  getBundleFallbackCache,
  getPackageCache,
  setBundleCache,
  setBundleFallbackCache,
  setPackageCache,
} from "./bundle-cache";

describe("bundle-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue("OK");
    mockDel.mockResolvedValue(1);
  });

  describe("getBundleCache", () => {
    it("returns cached HTML on hit", async () => {
      mockGet.mockResolvedValue("<html>cached</html>");
      const result = await getBundleCache("test-cs", "hash123");
      expect(result).toBe("<html>cached</html>");
      expect(mockGet).toHaveBeenCalledWith("codespace:bundle:test-cs:hash123");
    });

    it("returns null on miss", async () => {
      mockGet.mockResolvedValue(null);
      const result = await getBundleCache("test-cs", "hash123");
      expect(result).toBeNull();
    });
  });

  describe("setBundleCache", () => {
    it("sets with correct key and 1h TTL", async () => {
      await setBundleCache("test-cs", "hash123", "<html>bundle</html>");
      expect(mockSet).toHaveBeenCalledWith(
        "codespace:bundle:test-cs:hash123",
        "<html>bundle</html>",
        { ex: 3600 },
      );
    });
  });

  describe("deleteBundleCache", () => {
    it("deletes with correct key", async () => {
      await deleteBundleCache("test-cs", "hash123");
      expect(mockDel).toHaveBeenCalledWith("codespace:bundle:test-cs:hash123");
    });
  });

  describe("getBundleFallbackCache", () => {
    it("returns cached fallback HTML on hit", async () => {
      mockGet.mockResolvedValue("<html>fallback</html>");
      const result = await getBundleFallbackCache("test-cs", "hash123");
      expect(result).toBe("<html>fallback</html>");
      expect(mockGet).toHaveBeenCalledWith("codespace:bundle:test-cs:hash123:fallback");
    });

    it("returns null on miss", async () => {
      mockGet.mockResolvedValue(null);
      const result = await getBundleFallbackCache("test-cs", "hash123");
      expect(result).toBeNull();
    });
  });

  describe("setBundleFallbackCache", () => {
    it("sets with correct key and 10min TTL", async () => {
      await setBundleFallbackCache("test-cs", "hash123", "<html>fallback</html>");
      expect(mockSet).toHaveBeenCalledWith(
        "codespace:bundle:test-cs:hash123:fallback",
        "<html>fallback</html>",
        { ex: 600 },
      );
    });
  });

  describe("deleteBundleFallbackCache", () => {
    it("deletes with correct key", async () => {
      await deleteBundleFallbackCache("test-cs", "hash123");
      expect(mockDel).toHaveBeenCalledWith("codespace:bundle:test-cs:hash123:fallback");
    });
  });

  describe("getPackageCache", () => {
    it("returns cached package content", async () => {
      mockGet.mockResolvedValue("package-content");
      const result = await getPackageCache("urlhash");
      expect(result).toBe("package-content");
      expect(mockGet).toHaveBeenCalledWith("esm:pkg:urlhash");
    });

    it("returns null on miss", async () => {
      mockGet.mockResolvedValue(null);
      const result = await getPackageCache("urlhash");
      expect(result).toBeNull();
    });
  });

  describe("setPackageCache", () => {
    it("sets with correct key and 7d TTL", async () => {
      await setPackageCache("urlhash", "package-content");
      expect(mockSet).toHaveBeenCalledWith(
        "esm:pkg:urlhash",
        "package-content",
        { ex: 604800 },
      );
    });
  });
});
