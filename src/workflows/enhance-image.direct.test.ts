import { JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before vi.mock is called
const {
  mockDownloadFromR2,
  mockUploadToR2,
  mockEnhanceImageWithGemini,
  mockAnalyzeImageV2,
  mockRefundTokens,
  mockPrismaUpdate,
  mockGetImageDimensionsFromBuffer,
  mockDetectMimeType,
} = vi.hoisted(() => ({
  mockDownloadFromR2: vi.fn(),
  mockUploadToR2: vi.fn(),
  mockEnhanceImageWithGemini: vi.fn(),
  mockAnalyzeImageV2: vi.fn(),
  mockRefundTokens: vi.fn(),
  mockPrismaUpdate: vi.fn(),
  mockGetImageDimensionsFromBuffer: vi.fn(),
  mockDetectMimeType: vi.fn(),
}));

vi.mock("@/lib/storage/r2-client", () => ({
  downloadFromR2: mockDownloadFromR2,
  uploadToR2: mockUploadToR2,
}));

vi.mock("@/lib/ai/gemini-client", () => ({
  enhanceImageWithGemini: mockEnhanceImageWithGemini,
  analyzeImageV2: mockAnalyzeImageV2,
  buildDynamicEnhancementPrompt: vi.fn(() => "Mock enhancement prompt for testing"),
  buildBlendEnhancementPrompt: vi.fn(() => "Mock blend prompt for testing"),
  getModelForTier: vi.fn((tier: string) => {
    if (tier === "FREE") return "gemini-2.5-flash-image";
    return "gemini-3-pro-image-preview";
  }),
  DEFAULT_MODEL: "gemini-3-pro-image-preview",
  DEFAULT_TEMPERATURE: null,
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    refundTokens: mockRefundTokens,
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      update: mockPrismaUpdate,
    },
  },
}));

// Mock image-dimensions
vi.mock("@/lib/images/image-dimensions", () => ({
  getImageDimensionsFromBuffer: mockGetImageDimensionsFromBuffer,
  detectMimeType: mockDetectMimeType,
  getDefaultDimensions: () => ({ width: 1024, height: 1024, format: "jpeg" }),
}));

import { enhanceImageDirect } from "./enhance-image.direct";

describe("enhance-image.direct", () => {
  const validInput = {
    jobId: "job-123",
    imageId: "img-456",
    userId: "user-789",
    originalR2Key: "users/user-789/originals/image.jpg",
    tier: "TIER_1K" as const,
    tokensCost: 10,
  };

  const mockImageBuffer = Buffer.from("mock-image-data");
  const mockEnhancedBuffer = Buffer.from("mock-enhanced-data");

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();

    // Setup default successful mocks
    mockDownloadFromR2.mockResolvedValue(mockImageBuffer);
    mockUploadToR2.mockResolvedValue({
      success: true,
      url: "https://example.com/enhanced.jpg",
    });
    mockEnhanceImageWithGemini.mockResolvedValue(mockEnhancedBuffer);
    mockAnalyzeImageV2.mockResolvedValue({
      description: "A test image",
      quality: "medium",
      structuredAnalysis: {
        mainSubject: "test subject",
        imageStyle: "photograph",
        defects: {
          isDark: false,
          isBlurry: false,
          hasNoise: false,
          hasVHSArtifacts: false,
          isLowResolution: false,
          isOverexposed: false,
          hasColorCast: false,
        },
        lightingCondition: "natural daylight",
        cropping: { isCroppingNeeded: false },
      },
    });
    mockRefundTokens.mockResolvedValue({ success: true });
    mockPrismaUpdate.mockResolvedValue({});

    // Mock image-dimensions - return dimensions for both original and enhanced images
    mockGetImageDimensionsFromBuffer.mockReturnValue({
      width: 1920,
      height: 1080,
      format: "jpeg",
    });
    mockDetectMimeType.mockReturnValue("image/jpeg");
  });

  describe("input validation", () => {
    it("should throw for invalid jobId", async () => {
      await expect(
        enhanceImageDirect({ ...validInput, jobId: "" }),
      ).rejects.toThrow("Invalid jobId");
    });

    it("should throw for invalid userId", async () => {
      await expect(
        enhanceImageDirect({ ...validInput, userId: "" }),
      ).rejects.toThrow("Invalid userId");
    });

    it("should throw for invalid tier", async () => {
      await expect(
        enhanceImageDirect({ ...validInput, tier: "INVALID" as any }),
      ).rejects.toThrow("Invalid tier");
    });

    it("should throw for negative tokensCost", async () => {
      await expect(
        enhanceImageDirect({ ...validInput, tokensCost: -1 }),
      ).rejects.toThrow("Invalid tokensCost");
    });
  });

  describe("successful enhancement", () => {
    it("should download image from R2", async () => {
      await enhanceImageDirect(validInput);

      expect(mockDownloadFromR2).toHaveBeenCalledWith(validInput.originalR2Key);
    });

    it("should call Gemini API with correct parameters", async () => {
      await enhanceImageDirect(validInput);

      expect(mockEnhanceImageWithGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: "1K",
          originalWidth: 1920,
          originalHeight: 1080,
        }),
      );
    });

    it("should upload enhanced image to R2", async () => {
      await enhanceImageDirect(validInput);

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringContaining("/enhanced/"),
          contentType: "image/jpeg",
          metadata: expect.objectContaining({
            tier: "TIER_1K",
            jobId: "job-123",
          }),
        }),
      );
    });

    it("should update job status to COMPLETED", async () => {
      await enhanceImageDirect(validInput);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: "job-123" },
        data: expect.objectContaining({
          status: JobStatus.COMPLETED,
          enhancedUrl: "https://example.com/enhanced.jpg",
        }),
      });
    });

    it("should return success result", async () => {
      const result = await enhanceImageDirect(validInput);

      expect(result).toEqual({
        success: true,
        enhancedUrl: "https://example.com/enhanced.jpg",
      });
    });

    it("should not refund tokens on success", async () => {
      await enhanceImageDirect(validInput);

      expect(mockRefundTokens).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle download failure", async () => {
      mockDownloadFromR2.mockResolvedValue(null);

      const result = await enhanceImageDirect(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to download");
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: "job-123" },
        data: expect.objectContaining({
          status: JobStatus.REFUNDED,
        }),
      });
    });

    it("should handle Gemini API failure", async () => {
      mockEnhanceImageWithGemini.mockRejectedValue(
        new Error("Gemini API error"),
      );

      const result = await enhanceImageDirect(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Gemini API error");
    });

    it("should handle upload failure", async () => {
      mockUploadToR2.mockResolvedValue({
        success: false,
        url: null,
      });

      const result = await enhanceImageDirect(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to upload");
    });

    it("should refund tokens on failure", async () => {
      mockDownloadFromR2.mockResolvedValue(null);

      await enhanceImageDirect(validInput);

      expect(mockRefundTokens).toHaveBeenCalledWith(
        "user-789",
        10,
        "job-123",
        expect.any(String),
      );
    });

    it("should log error with stack trace", async () => {
      mockDownloadFromR2.mockRejectedValue(new Error("Test error"));

      await enhanceImageDirect(validInput);

      // Retry logic wraps the error, so we check for the job failure log
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Job job-123 failed"),
        expect.any(Error),
      );
    });

    it("should update job status to REFUNDED on error", async () => {
      mockDownloadFromR2.mockRejectedValue(new Error("Download failed"));

      await enhanceImageDirect(validInput);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: "job-123" },
        data: {
          status: JobStatus.REFUNDED,
          errorMessage: "Failed to download original image from R2",
          currentStage: null,
        },
      });
    });

    it("should handle refund failure gracefully", async () => {
      mockDownloadFromR2.mockResolvedValue(null);
      mockRefundTokens.mockResolvedValue({
        success: false,
        error: "Refund failed",
      });

      const result = await enhanceImageDirect(validInput);

      expect(result.success).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to refund tokens"),
        "Refund failed",
      );
    });

    it("should handle non-Error exceptions", async () => {
      // When download fails (even with non-Error), retry logic returns null,
      // which causes processEnhancement to throw a wrapped error
      mockDownloadFromR2.mockRejectedValue("String error");

      const result = await enhanceImageDirect(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to download original image from R2");
    });
  });

  describe("image processing", () => {
    it("should handle images without metadata", async () => {
      // Return null to trigger default dimensions fallback
      mockGetImageDimensionsFromBuffer.mockReturnValue(null);

      await enhanceImageDirect(validInput);

      // Should use default dimensions
      expect(mockEnhanceImageWithGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          originalWidth: 1024, // DEFAULT_IMAGE_DIMENSION
          originalHeight: 1024,
          mimeType: "image/jpeg",
        }),
      );
    });

    it("should handle different tiers", async () => {
      const tiers = ["TIER_1K", "TIER_2K", "TIER_4K"] as const;
      const expectedSizes = ["1K", "2K", "4K"];

      for (let i = 0; i < tiers.length; i++) {
        vi.clearAllMocks();
        await enhanceImageDirect({ ...validInput, tier: tiers[i]! });

        expect(mockEnhanceImageWithGemini).toHaveBeenCalledWith(
          expect.objectContaining({
            tier: expectedSizes[i],
          }),
        );
      }
    });

    it("should handle missing Gemini output dimensions", async () => {
      // First call returns metadata with width (for original), second call (for enhanced buffer)
      // returns object with undefined dimensions to bypass the fallback but trigger the validation error
      mockGetImageDimensionsFromBuffer
        .mockReturnValueOnce({
          width: 1920,
          height: 1080,
          format: "jpeg",
        })
        .mockReturnValueOnce({
          width: undefined,
          height: undefined,
          format: "jpeg",
        });

      const result = await enhanceImageDirect(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get Gemini output dimensions");
    });
  });

  describe("R2 key generation", () => {
    it("should generate correct enhanced R2 key", async () => {
      await enhanceImageDirect(validInput);

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "users/user-789/enhanced/image/job-123.jpg",
        }),
      );
    });

    it("should handle different original keys", async () => {
      await enhanceImageDirect({
        ...validInput,
        originalR2Key: "users/abc/originals/subfolder/pic.png",
      });

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "users/abc/enhanced/subfolder/pic/job-123.jpg",
        }),
      );
    });
  });
});
