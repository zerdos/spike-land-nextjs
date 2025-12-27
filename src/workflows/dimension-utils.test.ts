import { describe, expect, it } from "vitest";
import {
  calculateAspectRatio,
  calculatePaddingDimensions,
  getImageOrientation,
  MAX_IMAGE_DIMENSION,
  MIN_IMAGE_DIMENSION,
  validateCropRegion,
  validatePaddingDimensions,
  validatePixelDimensions,
} from "./dimension-utils";

describe("dimension-utils", () => {
  describe("validatePixelDimensions", () => {
    it("should return valid for dimensions within bounds", () => {
      expect(validatePixelDimensions(100, 200)).toEqual({ valid: true });
      expect(validatePixelDimensions(1024, 768)).toEqual({ valid: true });
      expect(validatePixelDimensions(4096, 4096)).toEqual({ valid: true });
    });

    it("should return valid for minimum dimensions", () => {
      expect(
        validatePixelDimensions(MIN_IMAGE_DIMENSION, MIN_IMAGE_DIMENSION),
      ).toEqual({ valid: true });
    });

    it("should return valid for maximum dimensions", () => {
      expect(
        validatePixelDimensions(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
      ).toEqual({ valid: true });
    });

    it("should return invalid for non-finite width", () => {
      const result = validatePixelDimensions(Infinity, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("finite numbers");
    });

    it("should return invalid for non-finite height", () => {
      const result = validatePixelDimensions(100, NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("finite numbers");
    });

    it("should return invalid for non-integer width", () => {
      const result = validatePixelDimensions(100.5, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("integers");
    });

    it("should return invalid for non-integer height", () => {
      const result = validatePixelDimensions(100, 100.5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("integers");
    });

    it("should return invalid for width below minimum", () => {
      const result = validatePixelDimensions(0, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least");
    });

    it("should return invalid for height below minimum", () => {
      const result = validatePixelDimensions(100, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least");
    });

    it("should return invalid for width above maximum", () => {
      const result = validatePixelDimensions(MAX_IMAGE_DIMENSION + 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must not exceed");
    });

    it("should return invalid for height above maximum", () => {
      const result = validatePixelDimensions(100, MAX_IMAGE_DIMENSION + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must not exceed");
    });

    it("should include context in error messages", () => {
      const result = validatePixelDimensions(0, 100, "output image");
      expect(result.error).toContain("output image");
    });
  });

  describe("validateCropRegion", () => {
    it("should return valid for crop region within source bounds", () => {
      const result = validateCropRegion(
        { left: 10, top: 20, width: 100, height: 200 },
        500,
        500,
      );
      expect(result.valid).toBe(true);
    });

    it("should return valid for crop region at origin", () => {
      const result = validateCropRegion(
        { left: 0, top: 0, width: 100, height: 100 },
        100,
        100,
      );
      expect(result.valid).toBe(true);
    });

    it("should return valid for crop region filling entire source", () => {
      const result = validateCropRegion(
        { left: 0, top: 0, width: 500, height: 300 },
        500,
        300,
      );
      expect(result.valid).toBe(true);
    });

    it("should return invalid for non-finite left", () => {
      const result = validateCropRegion(
        { left: Infinity, top: 0, width: 100, height: 100 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("finite numbers");
    });

    it("should return invalid for negative left", () => {
      const result = validateCropRegion(
        { left: -10, top: 0, width: 100, height: 100 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-negative");
    });

    it("should return invalid for negative top", () => {
      const result = validateCropRegion(
        { left: 0, top: -10, width: 100, height: 100 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-negative");
    });

    it("should return invalid for zero width", () => {
      const result = validateCropRegion(
        { left: 0, top: 0, width: 0, height: 100 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("should return invalid for zero height", () => {
      const result = validateCropRegion(
        { left: 0, top: 0, width: 100, height: 0 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("should return invalid when crop exceeds source width", () => {
      const result = validateCropRegion(
        { left: 400, top: 0, width: 200, height: 100 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds source width");
    });

    it("should return invalid when crop exceeds source height", () => {
      const result = validateCropRegion(
        { left: 0, top: 400, width: 100, height: 200 },
        500,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds source height");
    });

    it("should return invalid for invalid source dimensions", () => {
      const result = validateCropRegion(
        { left: 0, top: 0, width: 100, height: 100 },
        0, // Invalid source width
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("source image");
    });
  });

  describe("calculatePaddingDimensions", () => {
    it("should return no padding for square images", () => {
      const result = calculatePaddingDimensions(500, 500);
      expect(result.targetSize).toBe(500);
      expect(result.paddingLeft).toBe(0);
      expect(result.paddingRight).toBe(0);
      expect(result.paddingTop).toBe(0);
      expect(result.paddingBottom).toBe(0);
    });

    it("should add horizontal padding for portrait images", () => {
      const result = calculatePaddingDimensions(300, 500);
      expect(result.targetSize).toBe(500);
      expect(result.paddingTop).toBe(0);
      expect(result.paddingBottom).toBe(0);
      expect(result.paddingLeft + result.paddingRight).toBe(200);
    });

    it("should add vertical padding for landscape images", () => {
      const result = calculatePaddingDimensions(500, 300);
      expect(result.targetSize).toBe(500);
      expect(result.paddingLeft).toBe(0);
      expect(result.paddingRight).toBe(0);
      expect(result.paddingTop + result.paddingBottom).toBe(200);
    });

    it("should center padding evenly", () => {
      const result = calculatePaddingDimensions(300, 500);
      // Total horizontal padding is 200, should be split 100/100
      expect(result.paddingLeft).toBe(100);
      expect(result.paddingRight).toBe(100);
    });

    it("should handle odd padding differences", () => {
      const result = calculatePaddingDimensions(301, 500);
      // Total horizontal padding is 199, should be split 99/100
      expect(result.paddingLeft).toBe(99);
      expect(result.paddingRight).toBe(100);
    });
  });

  describe("validatePaddingDimensions", () => {
    it("should return valid for correct padding", () => {
      const padding = calculatePaddingDimensions(300, 500);
      const result = validatePaddingDimensions(padding, 300, 500);
      expect(result.valid).toBe(true);
    });

    it("should return invalid when target size is too small for width", () => {
      const result = validatePaddingDimensions(
        {
          targetSize: 400,
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 50,
          paddingBottom: 50,
        },
        500, // Source is larger than target
        300,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least as large");
    });

    it("should return invalid when target size is too small for height", () => {
      const result = validatePaddingDimensions(
        {
          targetSize: 400,
          paddingLeft: 50,
          paddingRight: 50,
          paddingTop: 0,
          paddingBottom: 0,
        },
        300,
        500, // Source is larger than target
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least as large");
    });

    it("should return invalid for negative padding", () => {
      const result = validatePaddingDimensions(
        {
          targetSize: 500,
          paddingLeft: -10,
          paddingRight: 110,
          paddingTop: 0,
          paddingBottom: 0,
        },
        400,
        500,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-negative");
    });

    it("should return invalid when horizontal padding is incorrect", () => {
      const result = validatePaddingDimensions(
        {
          targetSize: 500,
          paddingLeft: 50,
          paddingRight: 60, // Should be 50, not 60 (total 110 instead of 100)
          paddingTop: 100,
          paddingBottom: 100,
        },
        400,
        300,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("horizontal padding");
    });

    it("should return invalid when vertical padding is incorrect", () => {
      const result = validatePaddingDimensions(
        {
          targetSize: 500,
          paddingLeft: 50,
          paddingRight: 50,
          paddingTop: 50,
          paddingBottom: 60, // Should be 50, not 60 (total 110 instead of 100)
        },
        400,
        400,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("vertical padding");
    });
  });

  describe("calculateAspectRatio", () => {
    it("should calculate aspect ratio for landscape images", () => {
      expect(calculateAspectRatio(1920, 1080)).toBeCloseTo(16 / 9, 5);
    });

    it("should calculate aspect ratio for portrait images", () => {
      expect(calculateAspectRatio(1080, 1920)).toBeCloseTo(9 / 16, 5);
    });

    it("should return 1 for square images", () => {
      expect(calculateAspectRatio(1000, 1000)).toBe(1);
    });

    it("should throw for zero height", () => {
      expect(() => calculateAspectRatio(100, 0)).toThrow("height is zero");
    });
  });

  describe("getImageOrientation", () => {
    it("should return landscape for wider images", () => {
      expect(getImageOrientation(1920, 1080)).toBe("landscape");
    });

    it("should return portrait for taller images", () => {
      expect(getImageOrientation(1080, 1920)).toBe("portrait");
    });

    it("should return square for equal dimensions", () => {
      expect(getImageOrientation(1000, 1000)).toBe("square");
    });

    it("should handle small differences", () => {
      expect(getImageOrientation(101, 100)).toBe("landscape");
      expect(getImageOrientation(100, 101)).toBe("portrait");
    });
  });
});
