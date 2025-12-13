import { beforeEach, describe, expect, it, vi } from "vitest";

// Create shared mock functions using vi.hoisted
const { mockSharp, mockUploadToR2, mockMetadata, mockResize, mockToBuffer } = vi.hoisted(() => {
  const mockMetadata = vi.fn();
  const mockResize = vi.fn();
  const mockToBuffer = vi.fn();
  const mockUploadToR2 = vi.fn();

  const mockSharp = vi.fn(() => ({
    metadata: mockMetadata,
    resize: mockResize,
    toBuffer: mockToBuffer,
  }));

  // Set up chainable methods
  mockResize.mockReturnValue({
    toBuffer: mockToBuffer,
  });

  return { mockSharp, mockUploadToR2, mockMetadata, mockResize, mockToBuffer };
});

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomUUID: () => "test-uuid-12345",
  },
}));

// Mock sharp
vi.mock("sharp", () => ({
  default: mockSharp,
}));

// Mock r2-client
vi.mock("./r2-client", () => ({
  uploadToR2: mockUploadToR2,
}));

import { processAndUploadImage, validateImageFile } from "./upload-handler";

describe("upload-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations
    mockMetadata.mockReset();
    mockResize.mockReset();
    mockToBuffer.mockReset();
    mockUploadToR2.mockReset();

    // Set up default chainable behavior
    mockResize.mockReturnValue({
      toBuffer: mockToBuffer,
    });
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
      const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject File object exceeding size limit", () => {
      // Create a buffer that exceeds 1MB limit
      const largeContent = "x".repeat(2 * 1024 * 1024); // 2MB
      const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
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
    };

    it("should successfully process and upload an image within 4K limits", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 1920,
        height: 1080,
        format: "jpeg",
      });
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/users/user-123/originals/test-uuid-12345.jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.imageId).toBe("test-uuid-12345");
      expect(result.r2Key).toBe("users/user-123/originals/test-uuid-12345.jpeg");
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.format).toBe("jpeg");
      expect(result.error).toBeUndefined();
    });

    it("should resize wide image exceeding 4K width", async () => {
      const resizedBuffer = Buffer.from("resized image");
      mockMetadata.mockResolvedValueOnce({
        width: 6000, // Exceeds MAX_DIMENSION (4096)
        height: 3000,
        format: "png",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.png",
        url: "https://example.com/image.png",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.width).toBe(4096); // MAX_DIMENSION
      expect(result.height).toBe(2048); // Maintains aspect ratio (6000/3000 = 2:1)
      expect(mockResize).toHaveBeenCalledWith(4096, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should resize tall image exceeding 4K height", async () => {
      const resizedBuffer = Buffer.from("resized image");
      mockMetadata.mockResolvedValueOnce({
        width: 2000,
        height: 6000, // Exceeds MAX_DIMENSION (4096)
        format: "jpeg",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.width).toBe(1365); // Maintains aspect ratio (2000/6000 = 1:3, 4096/3 = 1365)
      expect(result.height).toBe(4096); // MAX_DIMENSION
      expect(mockResize).toHaveBeenCalledWith(1365, 4096, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should not resize image within 4K limits", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 2000,
        height: 1500,
        format: "jpeg",
      });
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      await processAndUploadImage(defaultParams);

      expect(mockResize).not.toHaveBeenCalled();
    });

    it("should return error for invalid image format", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: undefined,
        height: undefined,
        format: undefined,
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid image format");
      expect(result.imageId).toBe("");
      expect(result.r2Key).toBe("");
      expect(result.url).toBe("");
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("should return error when width is missing", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: undefined,
        height: 1000,
        format: "jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid image format");
    });

    it("should return error when height is missing", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 1000,
        height: undefined,
        format: "jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid image format");
    });

    it("should return error when format is missing", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 1000,
        height: 1000,
        format: undefined,
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid image format");
    });

    it("should return error when R2 upload fails", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 1920,
        height: 1080,
        format: "jpeg",
      });
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

    it("should handle sharp metadata error", async () => {
      mockMetadata.mockRejectedValueOnce(new Error("Corrupt image data"));

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Corrupt image data");
    });

    it("should handle sharp resize error", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 6000,
        height: 4000,
        format: "jpeg",
      });
      mockToBuffer.mockRejectedValueOnce(new Error("Resize failed"));

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Resize failed");
    });

    it("should handle non-Error exceptions", async () => {
      mockMetadata.mockRejectedValueOnce("String error");

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should pass correct metadata to R2 upload", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 1920,
        height: 1080,
        format: "webp",
      });
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.webp",
        url: "https://example.com/image.webp",
      });

      await processAndUploadImage({
        buffer: Buffer.from("test"),
        originalFilename: "my-photo.webp",
        userId: "user-456",
      });

      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: "users/user-456/originals/test-uuid-12345.webp",
        buffer: expect.any(Buffer),
        contentType: "image/webp",
        metadata: {
          userId: "user-456",
          originalFilename: "my-photo.webp",
          originalWidth: "1920",
          originalHeight: "1080",
          processedWidth: "1920",
          processedHeight: "1080",
        },
      });
    });

    it("should pass resized metadata to R2 upload", async () => {
      const resizedBuffer = Buffer.from("resized");
      mockMetadata.mockResolvedValueOnce({
        width: 5000,
        height: 5000,
        format: "jpeg",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      await processAndUploadImage(defaultParams);

      expect(mockUploadToR2).toHaveBeenCalledWith({
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        buffer: resizedBuffer,
        contentType: "image/jpeg",
        metadata: {
          userId: "user-123",
          originalFilename: "photo.jpg",
          originalWidth: "5000",
          originalHeight: "5000",
          processedWidth: "4096",
          processedHeight: "4096",
        },
      });
    });

    it("should return correct sizeBytes for processed image", async () => {
      const imageBuffer = Buffer.from("test image content here");
      mockMetadata.mockResolvedValueOnce({
        width: 800,
        height: 600,
        format: "png",
      });
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.png",
        url: "https://example.com/image.png",
      });

      const result = await processAndUploadImage({
        buffer: imageBuffer,
        originalFilename: "test.png",
        userId: "user-123",
      });

      expect(result.sizeBytes).toBe(imageBuffer.length);
    });

    it("should return correct sizeBytes for resized image", async () => {
      const resizedBuffer = Buffer.from("small");
      mockMetadata.mockResolvedValueOnce({
        width: 8000,
        height: 6000,
        format: "jpeg",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.sizeBytes).toBe(resizedBuffer.length);
    });

    it("should handle square image exceeding 4K", async () => {
      const resizedBuffer = Buffer.from("resized");
      mockMetadata.mockResolvedValueOnce({
        width: 5000,
        height: 5000,
        format: "jpeg",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.width).toBe(4096);
      expect(result.height).toBe(4096);
    });

    it("should handle exactly 4K image (no resize needed)", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 4096,
        height: 4096,
        format: "jpeg",
      });
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.width).toBe(4096);
      expect(result.height).toBe(4096);
      expect(mockResize).not.toHaveBeenCalled();
    });

    it("should handle various image formats", async () => {
      const formats = ["jpeg", "png", "webp", "gif", "tiff", "avif"];

      for (const format of formats) {
        vi.clearAllMocks();
        mockResize.mockReturnValue({ toBuffer: mockToBuffer });

        mockMetadata.mockResolvedValueOnce({
          width: 800,
          height: 600,
          format,
        });
        mockUploadToR2.mockResolvedValueOnce({
          success: true,
          key: `users/user-123/originals/test-uuid-12345.${format}`,
          url: `https://example.com/image.${format}`,
        });

        const result = await processAndUploadImage(defaultParams);

        expect(result.success).toBe(true);
        expect(result.format).toBe(format);
        expect(mockUploadToR2).toHaveBeenCalledWith(
          expect.objectContaining({
            contentType: `image/${format}`,
          }),
        );
      }
    });

    it("should handle panoramic image (very wide)", async () => {
      const resizedBuffer = Buffer.from("resized panorama");
      mockMetadata.mockResolvedValueOnce({
        width: 12000, // Very wide panorama
        height: 2000,
        format: "jpeg",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.width).toBe(4096); // MAX_DIMENSION
      // Height = 4096 / (12000/2000) = 4096 / 6 = 683 (rounded)
      expect(result.height).toBe(683);
    });

    it("should handle very tall image (portrait)", async () => {
      const resizedBuffer = Buffer.from("resized portrait");
      mockMetadata.mockResolvedValueOnce({
        width: 1500,
        height: 10000, // Very tall portrait
        format: "png",
      });
      mockToBuffer.mockResolvedValueOnce(resizedBuffer);
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/user-123/originals/test-uuid-12345.png",
        url: "https://example.com/image.png",
      });

      const result = await processAndUploadImage(defaultParams);

      expect(result.success).toBe(true);
      expect(result.height).toBe(4096); // MAX_DIMENSION
      // Width = 4096 * (1500/10000) = 4096 * 0.15 = 614 (rounded)
      expect(result.width).toBe(614);
    });

    it("should generate unique r2Key with userId and imageId", async () => {
      mockMetadata.mockResolvedValueOnce({
        width: 1000,
        height: 1000,
        format: "jpeg",
      });
      mockUploadToR2.mockResolvedValueOnce({
        success: true,
        key: "users/special-user/originals/test-uuid-12345.jpeg",
        url: "https://example.com/image.jpeg",
      });

      const result = await processAndUploadImage({
        buffer: Buffer.from("test"),
        originalFilename: "image.jpg",
        userId: "special-user",
      });

      expect(result.r2Key).toBe("users/special-user/originals/test-uuid-12345.jpeg");
    });
  });
});
