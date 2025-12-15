import { describe, expect, it } from "vitest";
import { FALLBACK_GALLERY_ITEMS, type GalleryItem } from "./gallery-fallback-data";

describe("gallery-fallback-data", () => {
  describe("FALLBACK_GALLERY_ITEMS", () => {
    it("should export an array of gallery items", () => {
      expect(Array.isArray(FALLBACK_GALLERY_ITEMS)).toBe(true);
      expect(FALLBACK_GALLERY_ITEMS.length).toBeGreaterThan(0);
    });

    it("should have 6 items in the fallback data", () => {
      expect(FALLBACK_GALLERY_ITEMS.length).toBe(6);
    });

    it("should have items with required properties", () => {
      FALLBACK_GALLERY_ITEMS.forEach((item: GalleryItem) => {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("description");
        expect(item).toHaveProperty("category");
        expect(item).toHaveProperty("originalUrl");
        expect(item).toHaveProperty("enhancedUrl");
      });
    });

    it("should have valid categories", () => {
      const validCategories = [
        "portrait",
        "landscape",
        "product",
        "architecture",
      ];
      FALLBACK_GALLERY_ITEMS.forEach((item: GalleryItem) => {
        expect(validCategories).toContain(item.category);
      });
    });

    it("should have valid URLs", () => {
      FALLBACK_GALLERY_ITEMS.forEach((item: GalleryItem) => {
        expect(item.originalUrl).toMatch(/^https:\/\//);
        expect(item.enhancedUrl).toMatch(/^https:\/\//);
      });
    });

    it("should have optional width and height as numbers", () => {
      FALLBACK_GALLERY_ITEMS.forEach((item: GalleryItem) => {
        if (item.width !== undefined) {
          expect(typeof item.width).toBe("number");
        }
        if (item.height !== undefined) {
          expect(typeof item.height).toBe("number");
        }
      });
    });

    it("should have unique ids", () => {
      const ids = FALLBACK_GALLERY_ITEMS.map((item: GalleryItem) => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should include portrait items", () => {
      const portraits = FALLBACK_GALLERY_ITEMS.filter(
        (item: GalleryItem) => item.category === "portrait",
      );
      expect(portraits.length).toBe(2);
    });

    it("should include landscape items", () => {
      const landscapes = FALLBACK_GALLERY_ITEMS.filter(
        (item: GalleryItem) => item.category === "landscape",
      );
      expect(landscapes.length).toBe(2);
    });

    it("should include product items", () => {
      const products = FALLBACK_GALLERY_ITEMS.filter(
        (item: GalleryItem) => item.category === "product",
      );
      expect(products.length).toBe(1);
    });

    it("should include architecture items", () => {
      const architecture = FALLBACK_GALLERY_ITEMS.filter(
        (item: GalleryItem) => item.category === "architecture",
      );
      expect(architecture.length).toBe(1);
    });
  });

  describe("GalleryItem type", () => {
    it("should accept valid gallery item", () => {
      const item: GalleryItem = {
        id: "test-1",
        title: "Test Title",
        description: "Test Description",
        category: "portrait",
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
      };
      expect(item.id).toBe("test-1");
    });

    it("should accept optional width and height", () => {
      const item: GalleryItem = {
        id: "test-2",
        title: "Test Title",
        description: "Test Description",
        category: "landscape",
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 16,
        height: 9,
      };
      expect(item.width).toBe(16);
      expect(item.height).toBe(9);
    });
  });
});
