import { describe, expect, it } from "vitest";
import {
  detectMimeType,
  getDefaultDimensions,
  getImageDimensionsFromBuffer,
} from "./image-dimensions";

describe("image-dimensions", () => {
  describe("getImageDimensionsFromBuffer", () => {
    describe("PNG", () => {
      it("should read PNG dimensions", () => {
        // Minimal PNG header with 100x50 dimensions
        // PNG signature + IHDR chunk
        const pngBuffer = Buffer.from([
          // PNG signature
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
          // IHDR chunk length (13 bytes)
          0x00,
          0x00,
          0x00,
          0x0d,
          // IHDR chunk type
          0x49,
          0x48,
          0x44,
          0x52,
          // Width: 100 (big-endian)
          0x00,
          0x00,
          0x00,
          0x64,
          // Height: 50 (big-endian)
          0x00,
          0x00,
          0x00,
          0x32,
          // Rest of IHDR (bit depth, color type, etc.)
          0x08,
          0x02,
          0x00,
          0x00,
          0x00,
        ]);

        const result = getImageDimensionsFromBuffer(pngBuffer);
        expect(result).toEqual({ width: 100, height: 50, format: "png" });
      });

      it("should return null for invalid PNG", () => {
        const invalidBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x00]); // Wrong signature
        const result = getImageDimensionsFromBuffer(invalidBuffer);
        expect(result).toBeNull();
      });
    });

    describe("JPEG", () => {
      it("should read JPEG dimensions from SOF0 marker", () => {
        // Minimal JPEG with SOF0 marker
        // 200x150 dimensions
        const jpegBuffer = Buffer.from([
          // SOI marker
          0xff,
          0xd8,
          // APP0 marker (short)
          0xff,
          0xe0,
          0x00,
          0x10,
          0x4a,
          0x46,
          0x49,
          0x46,
          0x00,
          0x01,
          0x01,
          0x00,
          0x00,
          0x01,
          0x00,
          0x01,
          0x00,
          0x00,
          // SOF0 marker
          0xff,
          0xc0,
          0x00,
          0x11, // length
          0x08, // precision
          0x00,
          0x96, // height: 150
          0x00,
          0xc8, // width: 200
          0x03, // components
          0x01,
          0x22,
          0x00,
          0x02,
          0x11,
          0x01,
          0x03,
          0x11,
          0x01,
        ]);

        const result = getImageDimensionsFromBuffer(jpegBuffer);
        expect(result).toEqual({ width: 200, height: 150, format: "jpeg" });
      });

      it("should return null for invalid JPEG", () => {
        const invalidBuffer = Buffer.from([0xff, 0x00]); // Not a JPEG
        const result = getImageDimensionsFromBuffer(invalidBuffer);
        expect(result).toBeNull();
      });
    });

    describe("WebP", () => {
      it("should read VP8X WebP dimensions", () => {
        // Minimal VP8X WebP header
        // 300x200 dimensions (stored as width-1, height-1)
        const webpBuffer = Buffer.from([
          // RIFF
          0x52,
          0x49,
          0x46,
          0x46,
          // File size (placeholder)
          0x00,
          0x00,
          0x00,
          0x00,
          // WEBP
          0x57,
          0x45,
          0x42,
          0x50,
          // VP8X chunk
          0x56,
          0x50,
          0x38,
          0x58,
          // Chunk size
          0x0a,
          0x00,
          0x00,
          0x00,
          // Flags
          0x10,
          0x00,
          0x00,
          0x00,
          // Canvas width-1: 299 (0x12B) in little-endian 24-bit
          0x2b,
          0x01,
          0x00,
          // Canvas height-1: 199 (0xC7) in little-endian 24-bit
          0xc7,
          0x00,
          0x00,
        ]);

        const result = getImageDimensionsFromBuffer(webpBuffer);
        expect(result).toEqual({ width: 300, height: 200, format: "webp" });
      });

      it("should return null for invalid WebP", () => {
        const invalidBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]); // Incomplete
        const result = getImageDimensionsFromBuffer(invalidBuffer);
        expect(result).toBeNull();
      });
    });

    describe("GIF", () => {
      it("should read GIF dimensions", () => {
        // Minimal GIF89a header with 120x80 dimensions
        const gifBuffer = Buffer.from([
          // GIF89a signature
          0x47,
          0x49,
          0x46,
          0x38,
          0x39,
          0x61,
          // Width: 120 (little-endian)
          0x78,
          0x00,
          // Height: 80 (little-endian)
          0x50,
          0x00,
        ]);

        const result = getImageDimensionsFromBuffer(gifBuffer);
        expect(result).toEqual({ width: 120, height: 80, format: "gif" });
      });

      it("should return null for invalid GIF", () => {
        const invalidBuffer = Buffer.from([0x47, 0x49, 0x00]); // Wrong signature
        const result = getImageDimensionsFromBuffer(invalidBuffer);
        expect(result).toBeNull();
      });
    });

    describe("Unknown format", () => {
      it("should return null for unknown format", () => {
        const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        const result = getImageDimensionsFromBuffer(unknownBuffer);
        expect(result).toBeNull();
      });

      it("should return null for empty buffer", () => {
        const emptyBuffer = Buffer.from([]);
        const result = getImageDimensionsFromBuffer(emptyBuffer);
        expect(result).toBeNull();
      });
    });
  });

  describe("getDefaultDimensions", () => {
    it("should return default 1024x1024 dimensions", () => {
      const result = getDefaultDimensions();
      expect(result).toEqual({ width: 1024, height: 1024, format: "unknown" });
    });
  });

  describe("detectMimeType", () => {
    it("should detect PNG mime type", () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x01,
        0x08,
        0x02,
        0x00,
        0x00,
        0x00,
      ]);
      expect(detectMimeType(pngBuffer)).toBe("image/png");
    });

    it("should return default for unknown format", () => {
      const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(detectMimeType(unknownBuffer)).toBe("image/jpeg");
    });
  });
});
