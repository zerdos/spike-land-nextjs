import { describe, expect, it } from "vitest";
import {
  calculateCropDimensions,
  calculateFinalDimensions,
  FALLBACK_FORMAT,
  FALLBACK_QUALITY,
  MAX_DIMENSION,
  WEBP_QUALITY,
} from "./browser-image-processor";

describe("browser-image-processor", () => {
  describe("constants", () => {
    it("should have correct MAX_DIMENSION", () => {
      expect(MAX_DIMENSION).toBe(1024);
    });

    it("should have correct WEBP_QUALITY", () => {
      expect(WEBP_QUALITY).toBe(0.8);
    });

    it("should have correct FALLBACK_FORMAT", () => {
      expect(FALLBACK_FORMAT).toBe("image/jpeg");
    });

    it("should have correct FALLBACK_QUALITY", () => {
      expect(FALLBACK_QUALITY).toBe(0.85);
    });
  });

  describe("calculateCropDimensions", () => {
    it("should return original dimensions for image already at target ratio", () => {
      const result = calculateCropDimensions(1920, 1080, "16:9");
      expect(result).toEqual({
        cropX: 0,
        cropY: 0,
        cropWidth: 1920,
        cropHeight: 1080,
      });
    });

    it("should return original dimensions for square image at 1:1", () => {
      const result = calculateCropDimensions(1000, 1000, "1:1");
      expect(result).toEqual({
        cropX: 0,
        cropY: 0,
        cropWidth: 1000,
        cropHeight: 1000,
      });
    });

    it("should crop horizontally when image is too wide for 1:1", () => {
      // 2000x1000 image, target 1:1
      // Should crop to 1000x1000, removing 500px from each side
      const result = calculateCropDimensions(2000, 1000, "1:1");
      expect(result).toEqual({
        cropX: 500,
        cropY: 0,
        cropWidth: 1000,
        cropHeight: 1000,
      });
    });

    it("should crop vertically when image is too tall for 1:1", () => {
      // 1000x2000 image, target 1:1
      // Should crop to 1000x1000, removing 500px from each side
      const result = calculateCropDimensions(1000, 2000, "1:1");
      expect(result).toEqual({
        cropX: 0,
        cropY: 500,
        cropWidth: 1000,
        cropHeight: 1000,
      });
    });

    it("should crop horizontally for 16:9 target when image is wider", () => {
      // 2400x1000 image (2.4:1), target 16:9 (1.78:1)
      // Should crop to ~1778x1000
      const result = calculateCropDimensions(2400, 1000, "16:9");
      expect(result.cropY).toBe(0);
      expect(result.cropHeight).toBe(1000);
      expect(result.cropWidth).toBe(Math.round(1000 * (16 / 9)));
      expect(result.cropX).toBe(Math.round((2400 - result.cropWidth) / 2));
    });

    it("should crop vertically for 16:9 target when image is taller", () => {
      // 1600x1200 image (1.33:1), target 16:9 (1.78:1)
      // Should crop to 1600x900
      const result = calculateCropDimensions(1600, 1200, "16:9");
      expect(result.cropX).toBe(0);
      expect(result.cropWidth).toBe(1600);
      expect(result.cropHeight).toBe(Math.round(1600 / (16 / 9)));
      expect(result.cropY).toBe(Math.round((1200 - result.cropHeight) / 2));
    });

    it("should crop for 9:16 portrait ratio", () => {
      // 1600x1600 square, target 9:16
      // Should crop to 900x1600
      const result = calculateCropDimensions(1600, 1600, "9:16");
      expect(result.cropY).toBe(0);
      expect(result.cropHeight).toBe(1600);
      expect(result.cropWidth).toBe(Math.round(1600 * (9 / 16)));
      expect(result.cropX).toBe(Math.round((1600 - result.cropWidth) / 2));
    });

    it("should crop for 4:5 Instagram ratio", () => {
      // 1000x1000 square, target 4:5
      // Should crop to 800x1000
      const result = calculateCropDimensions(1000, 1000, "4:5");
      expect(result.cropY).toBe(0);
      expect(result.cropHeight).toBe(1000);
      expect(result.cropWidth).toBe(Math.round(1000 * (4 / 5)));
      expect(result.cropX).toBe(Math.round((1000 - result.cropWidth) / 2));
    });

    it("should crop for 3:2 landscape ratio", () => {
      // 1500x1200, target 3:2 (1.5:1)
      // Should crop to 1500x1000
      const result = calculateCropDimensions(1500, 1200, "3:2");
      expect(result.cropX).toBe(0);
      expect(result.cropWidth).toBe(1500);
      expect(result.cropHeight).toBe(1000);
      expect(result.cropY).toBe(100);
    });

    it("should crop for 21:9 ultrawide ratio", () => {
      // 2100x1000, target 21:9 (2.33:1)
      // Should crop to 2100x900
      const result = calculateCropDimensions(2100, 1000, "21:9");
      expect(result.cropX).toBe(0);
      expect(result.cropWidth).toBe(2100);
      expect(result.cropHeight).toBe(Math.round(2100 / (21 / 9)));
      expect(result.cropY).toBe(Math.round((1000 - result.cropHeight) / 2));
    });
  });

  describe("calculateFinalDimensions", () => {
    it("should not resize if both dimensions are under max", () => {
      const result = calculateFinalDimensions(800, 600, 1024);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it("should not resize if exactly at max dimension", () => {
      const result = calculateFinalDimensions(1024, 768, 1024);
      expect(result).toEqual({ width: 1024, height: 768 });
    });

    it("should resize landscape image with width > max", () => {
      // 2048x1536, max 1024
      // Scale factor: 1024/2048 = 0.5
      const result = calculateFinalDimensions(2048, 1536, 1024);
      expect(result).toEqual({ width: 1024, height: 768 });
    });

    it("should resize portrait image with height > max", () => {
      // 1536x2048, max 1024
      // Scale factor: 1024/2048 = 0.5
      const result = calculateFinalDimensions(1536, 2048, 1024);
      expect(result).toEqual({ width: 768, height: 1024 });
    });

    it("should resize square image if > max", () => {
      const result = calculateFinalDimensions(2048, 2048, 1024);
      expect(result).toEqual({ width: 1024, height: 1024 });
    });

    it("should handle very large images", () => {
      const result = calculateFinalDimensions(8000, 6000, 1024);
      expect(result).toEqual({ width: 1024, height: 768 });
    });

    it("should handle non-standard dimensions", () => {
      // 1500x1000, max 1024
      // Scale factor: 1024/1500 = 0.6827
      const result = calculateFinalDimensions(1500, 1000, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(Math.round(1000 * (1024 / 1500)));
    });

    it("should use custom max dimension", () => {
      const result = calculateFinalDimensions(4000, 3000, 2048);
      expect(result).toEqual({ width: 2048, height: 1536 });
    });
  });
});
