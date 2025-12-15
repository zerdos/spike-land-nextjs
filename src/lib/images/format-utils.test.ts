import { describe, expect, it } from "vitest";
import {
  estimateFileSize,
  type ExportFormat,
  getFileExtension,
  isValidFormat,
} from "./format-utils";

describe("format-utils", () => {
  describe("estimateFileSize", () => {
    const originalSize = 1000000; // 1MB

    it("should estimate PNG size (larger than original)", () => {
      const estimated = estimateFileSize(originalSize, "png");
      expect(estimated).toBe(1300000); // 1.3x original
    });

    it("should estimate JPEG size with default quality", () => {
      const estimated = estimateFileSize(originalSize, "jpeg");
      expect(estimated).toBe(855000); // 0.95 * 0.9 * original
    });

    it("should estimate JPEG size with custom quality", () => {
      const estimated = estimateFileSize(originalSize, "jpeg", 80);
      expect(estimated).toBe(720000); // 0.8 * 0.9 * original
    });

    it("should estimate WebP size (smaller than original)", () => {
      const estimated = estimateFileSize(originalSize, "webp");
      expect(estimated).toBe(700000); // 0.7x original
    });

    it("should return original size for unknown format", () => {
      const estimated = estimateFileSize(
        originalSize,
        "unknown" as ExportFormat,
      );
      expect(estimated).toBe(originalSize);
    });
  });

  describe("isValidFormat", () => {
    it("should return true for valid formats", () => {
      expect(isValidFormat("png")).toBe(true);
      expect(isValidFormat("jpeg")).toBe(true);
      expect(isValidFormat("webp")).toBe(true);
    });

    it("should return false for invalid formats", () => {
      expect(isValidFormat("bmp")).toBe(false);
      expect(isValidFormat("gif")).toBe(false);
      expect(isValidFormat("tiff")).toBe(false);
      expect(isValidFormat("")).toBe(false);
    });
  });

  describe("getFileExtension", () => {
    it("should return correct extensions", () => {
      expect(getFileExtension("png")).toBe("png");
      expect(getFileExtension("jpeg")).toBe("jpg");
      expect(getFileExtension("webp")).toBe("webp");
    });
  });
});
