/**
 * Tests for image constants
 * Ensures all image URLs and comparison pairs are correctly defined
 */

import {
  type ComparisonImagePair,
  DEFAULT_COMPARISON,
  PLACEHOLDER_IMAGE_URL,
  SAMPLE_COMPARISON_IMAGES,
} from "./images";

describe("image constants", () => {
  describe("SAMPLE_COMPARISON_IMAGES", () => {
    it("contains landscape comparison images", () => {
      expect(SAMPLE_COMPARISON_IMAGES.landscape).toBeDefined();
      expect(SAMPLE_COMPARISON_IMAGES.landscape.beforeUrl).toBeTruthy();
      expect(SAMPLE_COMPARISON_IMAGES.landscape.afterUrl).toBeTruthy();
    });

    it("contains portrait comparison images", () => {
      expect(SAMPLE_COMPARISON_IMAGES.portrait).toBeDefined();
      expect(SAMPLE_COMPARISON_IMAGES.portrait.beforeUrl).toBeTruthy();
      expect(SAMPLE_COMPARISON_IMAGES.portrait.afterUrl).toBeTruthy();
    });

    it("contains vintage comparison images", () => {
      expect(SAMPLE_COMPARISON_IMAGES.vintage).toBeDefined();
      expect(SAMPLE_COMPARISON_IMAGES.vintage.beforeUrl).toBeTruthy();
      expect(SAMPLE_COMPARISON_IMAGES.vintage.afterUrl).toBeTruthy();
    });

    it("contains nature comparison images", () => {
      expect(SAMPLE_COMPARISON_IMAGES.nature).toBeDefined();
      expect(SAMPLE_COMPARISON_IMAGES.nature.beforeUrl).toBeTruthy();
      expect(SAMPLE_COMPARISON_IMAGES.nature.afterUrl).toBeTruthy();
    });

    it("all URLs are valid https URLs", () => {
      Object.values(SAMPLE_COMPARISON_IMAGES).forEach((pair) => {
        expect(pair.beforeUrl).toMatch(/^https:\/\//);
        expect(pair.afterUrl).toMatch(/^https:\/\//);
      });
    });

    it("before images have lower quality parameter", () => {
      Object.values(SAMPLE_COMPARISON_IMAGES).forEach((pair) => {
        expect(pair.beforeUrl).toContain("w=400");
        expect(pair.beforeUrl).toContain("q=60");
      });
    });

    it("after images have higher quality parameter", () => {
      Object.values(SAMPLE_COMPARISON_IMAGES).forEach((pair) => {
        expect(pair.afterUrl).toContain("w=800");
        expect(pair.afterUrl).toContain("q=95");
      });
    });
  });

  describe("DEFAULT_COMPARISON", () => {
    it("is defined", () => {
      expect(DEFAULT_COMPARISON).toBeDefined();
    });

    it("has beforeUrl", () => {
      expect(DEFAULT_COMPARISON.beforeUrl).toBeTruthy();
    });

    it("has afterUrl", () => {
      expect(DEFAULT_COMPARISON.afterUrl).toBeTruthy();
    });

    it("matches landscape comparison images", () => {
      expect(DEFAULT_COMPARISON).toBe(SAMPLE_COMPARISON_IMAGES.landscape);
    });
  });

  describe("PLACEHOLDER_IMAGE_URL", () => {
    it("is defined", () => {
      expect(PLACEHOLDER_IMAGE_URL).toBeDefined();
    });

    it("is a valid URL", () => {
      expect(PLACEHOLDER_IMAGE_URL).toMatch(/^https?:\/\//);
    });

    it("contains placeholder text", () => {
      expect(PLACEHOLDER_IMAGE_URL).toContain("placeholder");
    });
  });

  describe("ComparisonImagePair type", () => {
    it("can be used to type an object correctly", () => {
      const pair: ComparisonImagePair = {
        beforeUrl: "https://example.com/before.jpg",
        afterUrl: "https://example.com/after.jpg",
      };

      expect(pair.beforeUrl).toBe("https://example.com/before.jpg");
      expect(pair.afterUrl).toBe("https://example.com/after.jpg");
    });
  });
});
