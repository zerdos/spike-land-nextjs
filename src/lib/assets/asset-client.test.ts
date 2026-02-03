import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAsset } from "./asset-client";

describe("asset-client", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAsset", () => {
    it("should return the unwrapped asset object", async () => {
      const mockAsset = {
        id: "asset-123",
        filename: "test-image.jpg",
        fileType: "image/jpeg",
        url: "https://example.com/image.jpg",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockResponse = {
        asset: mockAsset,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getAsset("asset-123");

      expect(global.fetch).toHaveBeenCalledWith("/api/orbit/assets/asset-123");
      expect(result).toEqual(mockAsset);
    });

    it("should throw an error if fetch fails", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      await expect(getAsset("invalid-id")).rejects.toThrow("Not found");
    });
  });
});
