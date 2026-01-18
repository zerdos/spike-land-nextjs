import { beforeEach, describe, expect, it, vi } from "vitest";

// Create shared mock functions using vi.hoisted
const { mockUploadToR2 } = vi.hoisted(() => {
  const mockUploadToR2 = vi.fn();
  return { mockUploadToR2 };
});

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomUUID: () => "test-uuid-12345",
  },
}));

// Mock r2-client
vi.mock("./r2-client", () => ({
  uploadToR2: mockUploadToR2,
}));

import {
  processAndUploadImage,
  uploadPreProcessedImage,
  validateImageFile,
} from "./upload-handler";

describe("upload-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadToR2.mockReset();
  });

  describe("validateImageFile", () => {
    it("should validate buffer within size limit", () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      const result = validateImageFile(buffer);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject buffer exceeding default size limit", () => {
      const buffer = Buffer.alloc(51 * 1024 * 1024); // 51MB (exceeds default 50MB)
      const result = validateImageFile(buffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("File size exceeds maximum");
    });

    it("should validate buffer within custom size limit", () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const result = validateImageFile(buffer, 10 * 1024 * 1024); // 10MB limit

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject buffer exceeding custom size limit", () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const result = validateImageFile(buffer, 2 * 1024 * 1024); // 2MB limit

      expect(result.valid).toBe(false);
      expect(result.error).toContain("File size exceeds maximum of 2MB");
    });

    it("should validate empty buffer", () => {
      const buffer = Buffer.alloc(0);
      const result = validateImageFile(buffer);

      expect(result.valid).toBe(true);
    });

    it("should validate File object within size limit", () => {
      const file = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject File object exceeding size limit", () => {
      // Create a buffer that exceeds 1MB limit
      const largeContent = "x".repeat(2 * 1024 * 1024); // 2MB
      const file = new File([largeContent], "large.jpg", {
        type: "image/jpeg",
      });
      const result = validateImageFile(file, 1 * 1024 * 1024); // 1MB limit

      expect(result.valid).toBe(false);
      expect(result.error).toContain("File size exceeds maximum");
    });

    it("should accept buffer exactly at size limit", () => {
      const buffer = Buffer.alloc(50 * 1024 * 1024); // Exactly 50MB
      const result = validateImageFile(buffer);

      expect(result.valid).toBe(true);
    });
  });

  describe("processAndUploadImage", () => {
    const defaultParams = {
      buffer: Buffer.from("test image data"),
      originalFilename: "photo.jpg",
      userId: "user-123",
      width: 800,
      height: 600,
    };

    it("should successfully upload a pre-processed image", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.webp",
        url: "https://example.com/users/user-123/originals/test-uuid-12345.webp",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.imageId).toBe("test-uuid-12345");
      expect(result.r2Key).toBe("users/user-123/originals/test-uuid-12345.webp");
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.format).toBe("webp");
      expect(result.error).toBeUndefined();
    });

    it("should pass correct metadata to R2 upload", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-456/originals/test-uuid-12345.webp",
        url: "https://example.com/image.webp",
      });

      await processAndUploadImage({
        buffer: Buffer.from("test"),
        originalFilename: "my-photo.png",
        userId: "user-456",
        width: 1024,
        height: 768,
      });

      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: "users/user-456/originals/test-uuid-12345.webp",
        buffer: Buffer.from("test"),
        contentType: "image/webp",
        metadata: {
          userId: "user-456",
          originalFilename: "my-photo.png",
          originalWidth: "1024",
          originalHeight: "768",
          processedWidth: "1024",
          processedHeight: "768",
        },
      });
    });

    it("should return error when R2 upload fails", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: false,
        key: "",
        url: "",
        error: "Upload quota exceeded",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload quota exceeded");
      expect(result.imageId).toBe("");
    });

    it("should handle R2 upload exception", async () => {
      mockUploadToR2.mockRejectedValueOnce(new Error("Network error"));

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockUploadToR2.mockRejectedValueOnce("String error");

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should return correct sizeBytes", async () => {
      const imageBuffer = Buffer.from("processed webp content");
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.webp",
        url: "https://example.com/image.webp",
      });

      const result = await processAndUploadImage({
        buffer: imageBuffer,
        originalFilename: "test.png",
        userId: "user-123",
        width: 800,
        height: 600,
      });

      expect(result.sizeBytes).toBe(imageBuffer.length);
    });

    it("should generate unique r2Key with userId and imageId", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/special-user/originals/test-uuid-12345.webp",
        url: "https://example.com/image.webp",
      });

      const result = await processAndUploadImage({
        buffer: Buffer.from("test"),
        originalFilename: "image.jpg",
        userId: "special-user",
        width: 1000,
        height: 1000,
      });

      expect(result.r2Key).toBe(
        "users/special-user/originals/test-uuid-12345.webp",
      );
    });

    it("should handle custom content type", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpg",
        url: "https://example.com/image.jpg",
      });

      const result = await processAndUploadImage({
        buffer: Buffer.from("test"),
        originalFilename: "image.jpg",
        userId: "user-123",
        width: 800,
        height: 600,
        contentType: "image/jpeg",
      });

      expect(result.format).toBe("jpg");
      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "image/jpeg",
        }),
      );
    });

    it("should handle legacy params without dimensions (backwards compatibility)", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.webp",
        url: "https://example.com/image.webp",
      });

      // Legacy params without width/height
      const result = await processAndUploadImage({
        buffer: Buffer.from("test"),
        originalFilename: "photo.jpg",
        userId: "user-123",
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(0); // No dimensions provided
      expect(result.height).toBe(0);
    });
  });

  describe("uploadPreProcessedImage", () => {
    it("should upload a pre-processed image", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.webp",
        url: "https://example.com/image.webp",
      });

      const result = await uploadPreProcessedImage({
        buffer: Buffer.from("test"),
        userId: "user-123",
        width: 1024,
        height: 768,
        originalFilename: "photo.jpg",
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
    });

    it("should use custom content type", async () => {
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpg",
        url: "https://example.com/image.jpg",
      });

      await uploadPreProcessedImage({
        buffer: Buffer.from("test"),
        userId: "user-123",
        width: 1024,
        height: 768,
        originalFilename: "photo.jpg",
        contentType: "image/jpeg",
      });

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "image/jpeg",
        }),
      );
    });
  });
});
