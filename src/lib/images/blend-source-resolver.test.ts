import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BlendSourceErrorCode,
  getHttpStatusForError,
  resolveBlendSource,
} from "./blend-source-resolver";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage/upload-handler", () => ({
  processAndUploadImage: vi.fn(),
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: async <T>(promise: Promise<T>) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("resolveBlendSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invalid input", () => {
    it("should return error for empty input", async () => {
      const result = await resolveBlendSource({}, "user-1", "target-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_INPUT");
      }
    });

    it("should return error when base64 provided without mimeType", async () => {
      const result = await resolveBlendSource(
        { base64: "data" },
        "user-1",
        "target-1",
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_INPUT");
      }
    });
  });

  describe("stored image resolution", () => {
    it("should return NOT_FOUND for non-existent image", async () => {
      const { default: prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);

      const result = await resolveBlendSource(
        { imageId: "non-existent" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Blend source image not found");
      }
    });

    it("should return ACCESS_DENIED for image owned by another user", async () => {
      const { default: prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        id: "image-1",
        userId: "other-user",
        originalUrl: "https://example.com/image.jpg",
        originalFormat: "jpeg",
      } as never);

      const result = await resolveBlendSource(
        { imageId: "image-1" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ACCESS_DENIED");
        expect(result.error.message).toBe("Access denied to blend source image");
      }
    });

    it("should return FETCH_FAILED when R2 fetch fails", async () => {
      const { default: prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        id: "image-1",
        userId: "user-1",
        originalUrl: "https://example.com/image.jpg",
        originalFormat: "jpeg",
      } as never);

      mockFetch.mockResolvedValue({ ok: false });

      const result = await resolveBlendSource(
        { imageId: "image-1" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });

    it("should return FETCH_FAILED when arrayBuffer fails", async () => {
      const { default: prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        id: "image-1",
        userId: "user-1",
        originalUrl: "https://example.com/image.jpg",
        originalFormat: "jpeg",
      } as never);

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: vi.fn().mockRejectedValue(new Error("Buffer error")),
      });

      const result = await resolveBlendSource(
        { imageId: "image-1" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });

    it("should successfully resolve stored image", async () => {
      const { default: prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        id: "image-1",
        userId: "user-1",
        originalUrl: "https://example.com/image.jpg",
        originalFormat: "jpeg",
      } as never);

      const mockArrayBuffer = new ArrayBuffer(10);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      });

      const result = await resolveBlendSource(
        { imageId: "image-1" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceImageId).toBe("image-1");
        expect(result.data.mimeType).toBe("image/jpeg");
        expect(result.data.base64).toBeDefined();
      }
    });

    it("should use fallback mimeType when content-type header is missing", async () => {
      const { default: prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue({
        id: "image-1",
        userId: "user-1",
        originalUrl: "https://example.com/image.png",
        originalFormat: "png",
      } as never);

      const mockArrayBuffer = new ArrayBuffer(10);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(), // No content-type header
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      });

      const result = await resolveBlendSource(
        { imageId: "image-1" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mimeType).toBe("image/png");
      }
    });
  });

  describe("uploaded base64 processing", () => {
    it("should return UPLOAD_FAILED when upload fails", async () => {
      const { processAndUploadImage } = await import(
        "@/lib/storage/upload-handler"
      );
      vi.mocked(processAndUploadImage).mockResolvedValue({
        success: false,
        error: "Upload failed",
      } as never);

      const result = await resolveBlendSource(
        { base64: "dGVzdA==", mimeType: "image/png" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UPLOAD_FAILED");
      }
    });

    it("should return UPLOAD_FAILED when DB record creation fails", async () => {
      const { processAndUploadImage } = await import(
        "@/lib/storage/upload-handler"
      );
      const { default: prisma } = await import("@/lib/prisma");

      vi.mocked(processAndUploadImage).mockResolvedValue({
        success: true,
        url: "https://r2.example.com/image.png",
        r2Key: "user-1/originals/image.png",
        width: 100,
        height: 100,
        sizeBytes: 1000,
        format: "png",
      } as never);

      vi.mocked(prisma.enhancedImage.create).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await resolveBlendSource(
        { base64: "dGVzdA==", mimeType: "image/png" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UPLOAD_FAILED");
      }
    });

    it("should successfully process uploaded base64", async () => {
      const { processAndUploadImage } = await import(
        "@/lib/storage/upload-handler"
      );
      const { default: prisma } = await import("@/lib/prisma");

      vi.mocked(processAndUploadImage).mockResolvedValue({
        success: true,
        url: "https://r2.example.com/image.png",
        r2Key: "user-1/originals/image.png",
        width: 100,
        height: 100,
        sizeBytes: 1000,
        format: "png",
      } as never);

      vi.mocked(prisma.enhancedImage.create).mockResolvedValue({
        id: "new-image-id",
        userId: "user-1",
      } as never);

      const result = await resolveBlendSource(
        { base64: "dGVzdA==", mimeType: "image/png" },
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceImageId).toBe("new-image-id");
        expect(result.data.base64).toBe("dGVzdA==");
        expect(result.data.mimeType).toBe("image/png");
      }
    });

    it("should use jpg extension for unknown mimeTypes", async () => {
      const { processAndUploadImage } = await import(
        "@/lib/storage/upload-handler"
      );
      const { default: prisma } = await import("@/lib/prisma");

      vi.mocked(processAndUploadImage).mockResolvedValue({
        success: true,
        url: "https://r2.example.com/image.jpg",
        r2Key: "user-1/originals/image.jpg",
        width: 100,
        height: 100,
        sizeBytes: 1000,
        format: "jpeg",
      } as never);

      vi.mocked(prisma.enhancedImage.create).mockResolvedValue({
        id: "new-image-id",
        userId: "user-1",
      } as never);

      const result = await resolveBlendSource(
        { base64: "dGVzdA==", mimeType: "image/" }, // mimeType without extension
        "user-1",
        "target-1",
      );

      expect(result.success).toBe(true);
      expect(processAndUploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilename: expect.stringMatching(/blend-source-\d+\.jpg/),
        }),
      );
    });
  });
});

describe("getHttpStatusForError", () => {
  const testCases: [BlendSourceErrorCode, number][] = [
    ["NOT_FOUND", 404],
    ["ACCESS_DENIED", 403],
    ["INVALID_INPUT", 400],
    ["FETCH_FAILED", 500],
    ["UPLOAD_FAILED", 500],
  ];

  it.each(testCases)(
    "should return %i for %s error code",
    (code, expectedStatus) => {
      expect(getHttpStatusForError(code)).toBe(expectedStatus);
    },
  );
});
