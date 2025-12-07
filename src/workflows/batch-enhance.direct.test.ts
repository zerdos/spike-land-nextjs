import { JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { batchEnhanceImagesDirect } from "./batch-enhance.direct";

// Mock dependencies
const mockEnhanceImageDirect = vi.fn();
const mockRefundTokens = vi.fn();
const mockPrismaCreate = vi.fn();

vi.mock("./enhance-image.direct", () => ({
  enhanceImageDirect: mockEnhanceImageDirect,
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    refundTokens: mockRefundTokens,
  },
}));

vi.mock("@/lib/tokens/costs", () => ({
  ENHANCEMENT_COSTS: {
    TIER_1K: 10,
    TIER_2K: 20,
    TIER_4K: 40,
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      create: mockPrismaCreate,
    },
  },
}));

describe("batch-enhance.direct", () => {
  const validInput = {
    batchId: "batch-123",
    userId: "user-789",
    tier: "TIER_1K" as const,
    images: [
      { imageId: "img-1", originalR2Key: "users/user-789/originals/img1.jpg" },
      { imageId: "img-2", originalR2Key: "users/user-789/originals/img2.jpg" },
      { imageId: "img-3", originalR2Key: "users/user-789/originals/img3.jpg" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();

    // Setup default successful mocks
    mockEnhanceImageDirect.mockResolvedValue({
      success: true,
      enhancedUrl: "https://example.com/enhanced.jpg",
    });
    mockRefundTokens.mockResolvedValue({ success: true });
    mockPrismaCreate.mockResolvedValue({ id: "job-new" });
  });

  describe("input validation", () => {
    it("should throw for invalid batchId", async () => {
      await expect(
        batchEnhanceImagesDirect({ ...validInput, batchId: "" })
      ).rejects.toThrow("Invalid batchId");
    });

    it("should throw for non-string batchId", async () => {
      await expect(
        batchEnhanceImagesDirect({ ...validInput, batchId: 123 as any })
      ).rejects.toThrow("Invalid batchId");
    });

    it("should throw for invalid userId", async () => {
      await expect(
        batchEnhanceImagesDirect({ ...validInput, userId: "" })
      ).rejects.toThrow("Invalid userId");
    });

    it("should throw for non-array images", async () => {
      await expect(
        batchEnhanceImagesDirect({ ...validInput, images: "not-array" as any })
      ).rejects.toThrow("Invalid images");
    });

    it("should throw for empty images array", async () => {
      await expect(
        batchEnhanceImagesDirect({ ...validInput, images: [] })
      ).rejects.toThrow("Invalid images");
    });

    it("should throw for invalid tier", async () => {
      await expect(
        batchEnhanceImagesDirect({ ...validInput, tier: "INVALID" as any })
      ).rejects.toThrow("Invalid tier");
    });

    it("should throw for invalid imageId in array", async () => {
      await expect(
        batchEnhanceImagesDirect({
          ...validInput,
          images: [{ imageId: "", originalR2Key: "key" }],
        })
      ).rejects.toThrow("Invalid imageId at index 0");
    });

    it("should throw for invalid originalR2Key in array", async () => {
      await expect(
        batchEnhanceImagesDirect({
          ...validInput,
          images: [{ imageId: "img-1", originalR2Key: "" }],
        })
      ).rejects.toThrow("Invalid originalR2Key at index 0");
    });

    it("should validate all images in array", async () => {
      await expect(
        batchEnhanceImagesDirect({
          ...validInput,
          images: [
            { imageId: "img-1", originalR2Key: "key1" },
            { imageId: "", originalR2Key: "key2" },
          ],
        })
      ).rejects.toThrow("Invalid imageId at index 1");
    });
  });

  describe("successful batch processing", () => {
    it("should process all images sequentially", async () => {
      const result = await batchEnhanceImagesDirect(validInput);

      expect(mockEnhanceImageDirect).toHaveBeenCalledTimes(3);
      expect(result.results).toHaveLength(3);
    });

    it("should create jobs for each image", async () => {
      await batchEnhanceImagesDirect(validInput);

      expect(mockPrismaCreate).toHaveBeenCalledTimes(3);
      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-789",
          tier: "TIER_1K",
          tokensCost: 10,
          status: JobStatus.PROCESSING,
        }),
      });
    });

    it("should call enhanceImageDirect with correct parameters", async () => {
      mockPrismaCreate
        .mockResolvedValueOnce({ id: "job-1" })
        .mockResolvedValueOnce({ id: "job-2" })
        .mockResolvedValueOnce({ id: "job-3" });

      await batchEnhanceImagesDirect(validInput);

      expect(mockEnhanceImageDirect).toHaveBeenNthCalledWith(1, {
        jobId: "job-1",
        imageId: "img-1",
        userId: "user-789",
        originalR2Key: "users/user-789/originals/img1.jpg",
        tier: "TIER_1K",
        tokensCost: 10,
      });

      expect(mockEnhanceImageDirect).toHaveBeenNthCalledWith(2, {
        jobId: "job-2",
        imageId: "img-2",
        userId: "user-789",
        originalR2Key: "users/user-789/originals/img2.jpg",
        tier: "TIER_1K",
        tokensCost: 10,
      });

      expect(mockEnhanceImageDirect).toHaveBeenNthCalledWith(3, {
        jobId: "job-3",
        imageId: "img-3",
        userId: "user-789",
        originalR2Key: "users/user-789/originals/img3.jpg",
        tier: "TIER_1K",
        tokensCost: 10,
      });
    });

    it("should return correct summary for all successful", async () => {
      const result = await batchEnhanceImagesDirect(validInput);

      expect(result).toEqual({
        batchId: "batch-123",
        results: expect.arrayContaining([
          expect.objectContaining({
            imageId: "img-1",
            success: true,
          }),
          expect.objectContaining({
            imageId: "img-2",
            success: true,
          }),
          expect.objectContaining({
            imageId: "img-3",
            success: true,
          }),
        ]),
        summary: {
          total: 3,
          successful: 3,
          failed: 0,
        },
      });
    });

    it("should not refund tokens when all succeed", async () => {
      await batchEnhanceImagesDirect(validInput);

      expect(mockRefundTokens).not.toHaveBeenCalled();
    });
  });

  describe("partial failure handling", () => {
    it("should continue processing after failure", async () => {
      mockEnhanceImageDirect
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "Failed" })
        .mockResolvedValueOnce({ success: true });

      const result = await batchEnhanceImagesDirect(validInput);

      expect(result.summary).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
      });
    });

    it("should refund tokens for failed jobs", async () => {
      mockEnhanceImageDirect
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "Failed" });

      await batchEnhanceImagesDirect({
        ...validInput,
        images: validInput.images.slice(0, 2),
      });

      expect(mockRefundTokens).toHaveBeenCalledWith(
        "user-789",
        10, // 1 failed * 10 tokens
        "batch-123",
        expect.stringContaining("1 of 2 jobs failed")
      );
    });

    it("should handle multiple failures", async () => {
      mockEnhanceImageDirect.mockResolvedValue({
        success: false,
        error: "All failed",
      });

      const result = await batchEnhanceImagesDirect(validInput);

      expect(result.summary).toEqual({
        total: 3,
        successful: 0,
        failed: 3,
      });

      expect(mockRefundTokens).toHaveBeenCalledWith(
        "user-789",
        30, // 3 failed * 10 tokens
        "batch-123",
        expect.stringContaining("3 of 3 jobs failed")
      );
    });

    it("should log error with stack trace on individual failure", async () => {
      const error = new Error("Processing failed");
      mockEnhanceImageDirect.mockRejectedValueOnce(error);

      await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to process image img-1"),
        error
      );
    });

    it("should handle refund failure gracefully", async () => {
      mockEnhanceImageDirect.mockResolvedValue({
        success: false,
        error: "Failed",
      });
      mockRefundTokens.mockResolvedValue({
        success: false,
        error: "Refund failed",
      });

      const result = await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(result.summary.failed).toBe(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to refund tokens"),
        "Refund failed"
      );
    });
  });

  describe("exception handling", () => {
    it("should handle exception during job creation", async () => {
      mockPrismaCreate.mockRejectedValueOnce(new Error("DB error"));

      const result = await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(result.results[0]).toEqual({
        imageId: "img-1",
        success: false,
        error: "DB error",
      });
    });

    it("should handle non-Error exceptions", async () => {
      mockEnhanceImageDirect.mockRejectedValueOnce("String error");

      const result = await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(result.results[0]).toEqual({
        imageId: "img-1",
        success: false,
        error: "String error",
      });
    });
  });

  describe("different tiers", () => {
    it("should use correct token cost for TIER_2K", async () => {
      await batchEnhanceImagesDirect({
        ...validInput,
        tier: "TIER_2K",
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokensCost: 20,
        }),
      });
    });

    it("should use correct token cost for TIER_4K", async () => {
      await batchEnhanceImagesDirect({
        ...validInput,
        tier: "TIER_4K",
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokensCost: 40,
        }),
      });
    });

    it("should refund correct amount for TIER_2K failures", async () => {
      mockEnhanceImageDirect.mockResolvedValue({
        success: false,
        error: "Failed",
      });

      await batchEnhanceImagesDirect({
        ...validInput,
        tier: "TIER_2K",
        images: [validInput.images[0]],
      });

      expect(mockRefundTokens).toHaveBeenCalledWith(
        "user-789",
        20, // 1 failed * 20 tokens
        "batch-123",
        expect.any(String)
      );
    });
  });

  describe("result structure", () => {
    it("should include jobId in successful results", async () => {
      mockPrismaCreate.mockResolvedValue({ id: "job-xyz" });

      const result = await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(result.results[0]).toEqual({
        imageId: "img-1",
        jobId: "job-xyz",
        success: true,
      });
    });

    it("should not include jobId in failed results", async () => {
      mockPrismaCreate.mockRejectedValue(new Error("Failed to create job"));

      const result = await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(result.results[0]).toEqual({
        imageId: "img-1",
        success: false,
        error: "Failed to create job",
      });
      expect(result.results[0].jobId).toBeUndefined();
    });

    it("should include error message in failed results", async () => {
      mockEnhanceImageDirect.mockResolvedValue({
        success: false,
        error: "Specific error message",
      });

      const result = await batchEnhanceImagesDirect({
        ...validInput,
        images: [validInput.images[0]],
      });

      expect(result.results[0].error).toBe("Specific error message");
    });
  });
});
