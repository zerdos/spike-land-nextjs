import { describe, expect, it } from "vitest";
import {
  calculateCropRegion,
  calculateTargetDimensions,
  ENHANCED_JPEG_QUALITY,
  generateEnhancedR2Key,
  TIER_RESOLUTIONS,
  validateEnhanceImageInput,
} from "./enhance-image.shared";

describe("enhance-image.shared", () => {
  describe("constants", () => {
    it("should have correct tier resolutions", () => {
      expect(TIER_RESOLUTIONS.TIER_1K).toBe(1024);
      expect(TIER_RESOLUTIONS.TIER_2K).toBe(2048);
      expect(TIER_RESOLUTIONS.TIER_4K).toBe(4096);
    });

    it("should have correct JPEG quality", () => {
      expect(ENHANCED_JPEG_QUALITY).toBe(95);
    });
  });

  describe("validateEnhanceImageInput", () => {
    const validInput = {
      jobId: "job-123",
      imageId: "img-456",
      userId: "user-789",
      originalR2Key: "users/user-789/originals/image.jpg",
      tier: "TIER_1K" as const,
      tokensCost: 10,
    };

    it("should not throw for valid input", () => {
      expect(() => validateEnhanceImageInput(validInput)).not.toThrow();
    });

    it("should throw for empty jobId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, jobId: "" })).toThrow(
        "Invalid jobId",
      );
    });

    it("should throw for non-string jobId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, jobId: 123 as any })).toThrow(
        "Invalid jobId",
      );
    });

    it("should throw for empty imageId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, imageId: "" })).toThrow(
        "Invalid imageId",
      );
    });

    it("should throw for non-string imageId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, imageId: null as any })).toThrow(
        "Invalid imageId",
      );
    });

    it("should throw for empty userId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, userId: "" })).toThrow(
        "Invalid userId",
      );
    });

    it("should throw for non-string userId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, userId: undefined as any })).toThrow(
        "Invalid userId",
      );
    });

    it("should throw for empty originalR2Key", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, originalR2Key: "" })).toThrow(
        "Invalid originalR2Key",
      );
    });

    it("should throw for non-string originalR2Key", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, originalR2Key: [] as any })).toThrow(
        "Invalid originalR2Key",
      );
    });

    it("should throw for invalid tier", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tier: "INVALID" as any })).toThrow(
        "Invalid tier",
      );
    });

    it("should accept all valid tiers", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tier: "TIER_1K" })).not.toThrow();
      expect(() => validateEnhanceImageInput({ ...validInput, tier: "TIER_2K" })).not.toThrow();
      expect(() => validateEnhanceImageInput({ ...validInput, tier: "TIER_4K" })).not.toThrow();
    });

    it("should throw for negative tokensCost", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tokensCost: -1 })).toThrow(
        "Invalid tokensCost",
      );
    });

    it("should throw for non-number tokensCost", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tokensCost: "10" as any })).toThrow(
        "Invalid tokensCost",
      );
    });

    it("should accept zero tokensCost", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tokensCost: 0 })).not.toThrow();
    });
  });

  describe("calculateCropRegion", () => {
    it("should handle square images (aspect ratio = 1)", () => {
      const result = calculateCropRegion(1024, 512, 512);
      expect(result).toEqual({
        extractLeft: 0,
        extractTop: 0,
        extractWidth: 1024,
        extractHeight: 1024,
      });
    });

    it("should handle landscape images (aspect ratio > 1)", () => {
      // 2:1 aspect ratio
      const result = calculateCropRegion(1024, 1000, 500);
      expect(result.extractLeft).toBe(0);
      expect(result.extractTop).toBeGreaterThan(0);
      expect(result.extractWidth).toBe(1024);
      expect(result.extractHeight).toBeLessThan(1024);
    });

    it("should handle portrait images (aspect ratio < 1)", () => {
      // 1:2 aspect ratio
      const result = calculateCropRegion(1024, 500, 1000);
      expect(result.extractLeft).toBeGreaterThan(0);
      expect(result.extractTop).toBe(0);
      expect(result.extractWidth).toBeLessThan(1024);
      expect(result.extractHeight).toBe(1024);
    });

    it("should center crop for landscape images", () => {
      const geminiSize = 2048;
      const result = calculateCropRegion(geminiSize, 2000, 1000);

      // For 2:1 aspect ratio, height should be halved
      const expectedHeight = Math.round(geminiSize / 2);
      expect(result.extractHeight).toBe(expectedHeight);

      // Should be centered vertically
      const expectedTop = Math.round((geminiSize - expectedHeight) / 2);
      expect(result.extractTop).toBe(expectedTop);
    });

    it("should center crop for portrait images", () => {
      const geminiSize = 2048;
      const result = calculateCropRegion(geminiSize, 1000, 2000);

      // For 1:2 aspect ratio, width should be halved
      const expectedWidth = Math.round(geminiSize / 2);
      expect(result.extractWidth).toBe(expectedWidth);

      // Should be centered horizontally
      const expectedLeft = Math.round((geminiSize - expectedWidth) / 2);
      expect(result.extractLeft).toBe(expectedLeft);
    });
  });

  describe("calculateTargetDimensions", () => {
    it("should calculate dimensions for TIER_1K landscape image", () => {
      const result = calculateTargetDimensions("TIER_1K", 1600, 900);
      expect(result.targetWidth).toBe(1024);
      expect(result.targetHeight).toBe(Math.round(1024 / (1600 / 900)));
    });

    it("should calculate dimensions for TIER_1K portrait image", () => {
      const result = calculateTargetDimensions("TIER_1K", 900, 1600);
      expect(result.targetHeight).toBe(1024);
      expect(result.targetWidth).toBe(Math.round(1024 * (900 / 1600)));
    });

    it("should calculate dimensions for TIER_2K landscape image", () => {
      const result = calculateTargetDimensions("TIER_2K", 1920, 1080);
      expect(result.targetWidth).toBe(2048);
      expect(result.targetHeight).toBe(Math.round(2048 / (1920 / 1080)));
    });

    it("should calculate dimensions for TIER_4K landscape image", () => {
      const result = calculateTargetDimensions("TIER_4K", 3840, 2160);
      expect(result.targetWidth).toBe(4096);
      expect(result.targetHeight).toBe(Math.round(4096 / (3840 / 2160)));
    });

    it("should handle square images", () => {
      const result = calculateTargetDimensions("TIER_1K", 1000, 1000);
      expect(result.targetHeight).toBe(1024);
      expect(result.targetWidth).toBe(1024);
    });

    it("should preserve aspect ratio for all tiers", () => {
      const originalWidth = 1920;
      const originalHeight = 1080;
      const originalAspect = originalWidth / originalHeight;

      const tier1k = calculateTargetDimensions("TIER_1K", originalWidth, originalHeight);
      const calculatedAspect1k = tier1k.targetWidth / tier1k.targetHeight;
      expect(Math.abs(calculatedAspect1k - originalAspect)).toBeLessThan(0.01);

      const tier2k = calculateTargetDimensions("TIER_2K", originalWidth, originalHeight);
      const calculatedAspect2k = tier2k.targetWidth / tier2k.targetHeight;
      expect(Math.abs(calculatedAspect2k - originalAspect)).toBeLessThan(0.01);

      const tier4k = calculateTargetDimensions("TIER_4K", originalWidth, originalHeight);
      const calculatedAspect4k = tier4k.targetWidth / tier4k.targetHeight;
      expect(Math.abs(calculatedAspect4k - originalAspect)).toBeLessThan(0.01);
    });
  });

  describe("generateEnhancedR2Key", () => {
    it("should replace /originals/ with /enhanced/", () => {
      const result = generateEnhancedR2Key(
        "users/user-123/originals/image.jpg",
        "job-456",
      );
      expect(result).toContain("/enhanced/");
      expect(result).not.toContain("/originals/");
    });

    it("should replace file extension with /jobId.jpg", () => {
      const result = generateEnhancedR2Key(
        "users/user-123/originals/image.png",
        "job-789",
      );
      expect(result).toMatch(/\/job-789\.jpg$/);
    });

    it("should handle various file extensions", () => {
      const extensions = ["jpg", "jpeg", "png", "webp"];

      for (const ext of extensions) {
        const result = generateEnhancedR2Key(
          `users/user-123/originals/image.${ext}`,
          "job-999",
        );
        expect(result).toBe("users/user-123/enhanced/image/job-999.jpg");
      }
    });

    it("should handle paths without extension", () => {
      const result = generateEnhancedR2Key(
        "users/user-123/originals/image",
        "job-111",
      );
      expect(result).toBe("users/user-123/enhanced/image/job-111.jpg");
    });

    it("should preserve user path structure", () => {
      const result = generateEnhancedR2Key(
        "users/user-abc/originals/subfolder/image.jpg",
        "job-222",
      );
      expect(result).toBe("users/user-abc/enhanced/subfolder/image/job-222.jpg");
    });
  });
});
