import { SYSTEM_DEFAULT_PIPELINE } from "@/lib/ai/pipeline-types";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma before importing modules that use it
vi.mock("@/lib/prisma", () => ({
  default: {
    album: {
      findUnique: vi.fn(),
    },
    enhancementPipeline: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  calculateCropRegion,
  calculateTargetDimensions,
  createWorkflowContext,
  cropDimensionsToPixels,
  ENHANCED_JPEG_QUALITY,
  ERROR_BOUNDARIES,
  generateEnhancedR2Key,
  recordFatalFailure,
  recordSoftFailure,
  recordStageSuccess,
  TIER_RESOLUTIONS,
  validateCropDimensions,
  validateEnhanceImageInput,
  WorkflowStage,
  WorkflowStageError,
} from "./enhance-image.shared";

// Import pipeline resolver separately (it uses Prisma)
import { resolvePipelineConfig } from "./pipeline-resolver";

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
      expect(() => validateEnhanceImageInput({ ...validInput, jobId: "" }))
        .toThrow(
          "Invalid jobId",
        );
    });

    it("should throw for non-string jobId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, jobId: 123 as any })).toThrow(
        "Invalid jobId",
      );
    });

    it("should throw for empty imageId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, imageId: "" }))
        .toThrow(
          "Invalid imageId",
        );
    });

    it("should throw for non-string imageId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, imageId: null as any })).toThrow(
        "Invalid imageId",
      );
    });

    it("should throw for empty userId", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, userId: "" }))
        .toThrow(
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
      expect(() => validateEnhanceImageInput({ ...validInput, tokensCost: -1 }))
        .toThrow(
          "Invalid tokensCost",
        );
    });

    it("should throw for non-number tokensCost", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tokensCost: "10" as any })).toThrow(
        "Invalid tokensCost",
      );
    });

    it("should accept zero tokensCost", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, tokensCost: 0 }))
        .not.toThrow();
    });

    it("should throw for invalid sourceImageR2Key type", () => {
      expect(() =>
        validateEnhanceImageInput({
          ...validInput,
          sourceImageR2Key: 123 as any,
        })
      ).toThrow("Invalid sourceImageR2Key");
    });

    it("should accept null sourceImageR2Key", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, sourceImageR2Key: null })).not
        .toThrow();
    });

    it("should accept valid blendSource", () => {
      expect(() =>
        validateEnhanceImageInput({
          ...validInput,
          blendSource: { base64: "abc123", mimeType: "image/jpeg" },
        })
      ).not.toThrow();
    });

    it("should throw for empty blendSource.base64", () => {
      expect(() =>
        validateEnhanceImageInput({
          ...validInput,
          blendSource: { base64: "", mimeType: "image/jpeg" },
        })
      ).toThrow("Invalid blendSource.base64");
    });

    it("should throw for non-string blendSource.base64", () => {
      expect(() =>
        validateEnhanceImageInput({
          ...validInput,
          blendSource: { base64: 123 as any, mimeType: "image/jpeg" },
        })
      ).toThrow("Invalid blendSource.base64");
    });

    it("should throw for empty blendSource.mimeType", () => {
      expect(() =>
        validateEnhanceImageInput({
          ...validInput,
          blendSource: { base64: "abc123", mimeType: "" },
        })
      ).toThrow("Invalid blendSource.mimeType");
    });

    it("should throw for non-string blendSource.mimeType", () => {
      expect(() =>
        validateEnhanceImageInput({
          ...validInput,
          blendSource: { base64: "abc123", mimeType: 123 as any },
        })
      ).toThrow("Invalid blendSource.mimeType");
    });

    it("should accept null blendSource", () => {
      expect(() => validateEnhanceImageInput({ ...validInput, blendSource: null })).not.toThrow();
    });
  });

  describe("calculateCropRegion", () => {
    it("should use full image when Gemini output matches target aspect ratio", () => {
      // Gemini output 2048x1536 (4:3), target 4000x3000 (4:3)
      const result = calculateCropRegion(2048, 1536, 4000, 3000);
      expect(result).toEqual({
        extractLeft: 0,
        extractTop: 0,
        extractWidth: 2048,
        extractHeight: 1536,
      });
    });

    it("should use full image for matching square images", () => {
      // Gemini output 1024x1024 (1:1), target 512x512 (1:1)
      const result = calculateCropRegion(1024, 1024, 512, 512);
      expect(result).toEqual({
        extractLeft: 0,
        extractTop: 0,
        extractWidth: 1024,
        extractHeight: 1024,
      });
    });

    it("should crop square Gemini output for landscape target", () => {
      // Gemini output 1024x1024 (square), target 2:1 landscape
      const result = calculateCropRegion(1024, 1024, 1000, 500);
      expect(result.extractLeft).toBe(0);
      expect(result.extractTop).toBeGreaterThan(0);
      expect(result.extractWidth).toBe(1024);
      expect(result.extractHeight).toBeLessThan(1024);
    });

    it("should crop square Gemini output for portrait target", () => {
      // Gemini output 1024x1024 (square), target 1:2 portrait
      const result = calculateCropRegion(1024, 1024, 500, 1000);
      expect(result.extractLeft).toBeGreaterThan(0);
      expect(result.extractTop).toBe(0);
      expect(result.extractWidth).toBeLessThan(1024);
      expect(result.extractHeight).toBe(1024);
    });

    it("should center crop square output for landscape target", () => {
      const geminiSize = 2048;
      // Gemini output 2048x2048 (square), target 2:1 landscape
      const result = calculateCropRegion(geminiSize, geminiSize, 2000, 1000);

      // For 2:1 aspect ratio, height should be halved
      const expectedHeight = Math.round(geminiSize / 2);
      expect(result.extractHeight).toBe(expectedHeight);

      // Should be centered vertically
      const expectedTop = Math.round((geminiSize - expectedHeight) / 2);
      expect(result.extractTop).toBe(expectedTop);
    });

    it("should center crop square output for portrait target", () => {
      const geminiSize = 2048;
      // Gemini output 2048x2048 (square), target 1:2 portrait
      const result = calculateCropRegion(geminiSize, geminiSize, 1000, 2000);

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

      const tier1k = calculateTargetDimensions(
        "TIER_1K",
        originalWidth,
        originalHeight,
      );
      const calculatedAspect1k = tier1k.targetWidth / tier1k.targetHeight;
      expect(Math.abs(calculatedAspect1k - originalAspect)).toBeLessThan(0.01);

      const tier2k = calculateTargetDimensions(
        "TIER_2K",
        originalWidth,
        originalHeight,
      );
      const calculatedAspect2k = tier2k.targetWidth / tier2k.targetHeight;
      expect(Math.abs(calculatedAspect2k - originalAspect)).toBeLessThan(0.01);

      const tier4k = calculateTargetDimensions(
        "TIER_4K",
        originalWidth,
        originalHeight,
      );
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
      expect(result).toBe(
        "users/user-abc/enhanced/subfolder/image/job-222.jpg",
      );
    });
  });

  describe("validateCropDimensions", () => {
    it("should return true for valid crop dimensions", () => {
      expect(validateCropDimensions({
        x: 0.1,
        y: 0.2,
        width: 0.5,
        height: 0.6,
      })).toBe(true);
    });

    it("should return true for crop starting at origin (0, 0)", () => {
      expect(validateCropDimensions({
        x: 0,
        y: 0,
        width: 0.5,
        height: 0.5,
      })).toBe(true);
    });

    it("should return true for full image crop (1.0 width/height)", () => {
      expect(validateCropDimensions({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      })).toBe(true);
    });

    it("should return false for negative x", () => {
      expect(validateCropDimensions({
        x: -0.1,
        y: 0,
        width: 0.5,
        height: 0.5,
      })).toBe(false);
    });

    it("should return false for negative y", () => {
      expect(validateCropDimensions({
        x: 0,
        y: -0.1,
        width: 0.5,
        height: 0.5,
      })).toBe(false);
    });

    it("should return false for x > 1", () => {
      expect(validateCropDimensions({
        x: 1.1,
        y: 0,
        width: 0.5,
        height: 0.5,
      })).toBe(false);
    });

    it("should return false for y > 1", () => {
      expect(validateCropDimensions({
        x: 0,
        y: 1.1,
        width: 0.5,
        height: 0.5,
      })).toBe(false);
    });

    it("should return false for width <= 0", () => {
      expect(validateCropDimensions({
        x: 0,
        y: 0,
        width: 0,
        height: 0.5,
      })).toBe(false);
    });

    it("should return false for height <= 0", () => {
      expect(validateCropDimensions({
        x: 0,
        y: 0,
        width: 0.5,
        height: 0,
      })).toBe(false);
    });

    it("should return false when x + width > 1", () => {
      expect(validateCropDimensions({
        x: 0.6,
        y: 0,
        width: 0.5,
        height: 0.5,
      })).toBe(false);
    });

    it("should return false when y + height > 1", () => {
      expect(validateCropDimensions({
        x: 0,
        y: 0.6,
        width: 0.5,
        height: 0.5,
      })).toBe(false);
    });

    it("should allow small floating point tolerance for x + width", () => {
      // Should allow up to 1.01 due to floating point tolerance
      expect(validateCropDimensions({
        x: 0.5,
        y: 0,
        width: 0.505,
        height: 0.5,
      })).toBe(true);
    });
  });

  describe("cropDimensionsToPixels", () => {
    it("should convert percentage to pixel values", () => {
      const result = cropDimensionsToPixels(
        { x: 0.1, y: 0.2, width: 0.5, height: 0.4 },
        1000,
        800,
      );
      expect(result).toEqual({
        left: 100,
        top: 160,
        width: 500,
        height: 320,
      });
    });

    it("should handle full image crop (0,0 to 1,1)", () => {
      const result = cropDimensionsToPixels(
        { x: 0, y: 0, width: 1, height: 1 },
        1920,
        1080,
      );
      expect(result).toEqual({
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
      });
    });

    it("should round to nearest pixel", () => {
      const result = cropDimensionsToPixels(
        { x: 0.333, y: 0.666, width: 0.5, height: 0.25 },
        100,
        100,
      );
      expect(result.left).toBe(33);
      expect(result.top).toBe(67);
      expect(result.width).toBe(50);
      expect(result.height).toBe(25);
    });

    it("should clamp left to 0 minimum", () => {
      const result = cropDimensionsToPixels(
        { x: -0.1, y: 0, width: 0.5, height: 0.5 },
        100,
        100,
      );
      expect(result.left).toBe(0);
    });

    it("should clamp top to 0 minimum", () => {
      const result = cropDimensionsToPixels(
        { x: 0, y: -0.1, width: 0.5, height: 0.5 },
        100,
        100,
      );
      expect(result.top).toBe(0);
    });

    it("should clamp width to image width maximum", () => {
      const result = cropDimensionsToPixels(
        { x: 0, y: 0, width: 1.5, height: 0.5 },
        100,
        100,
      );
      expect(result.width).toBe(100);
    });

    it("should clamp height to image height maximum", () => {
      const result = cropDimensionsToPixels(
        { x: 0, y: 0, width: 0.5, height: 1.5 },
        100,
        100,
      );
      expect(result.height).toBe(100);
    });
  });

  describe("resolvePipelineConfig", () => {
    const mockAlbumFindUnique = vi.mocked(prisma.album.findUnique);
    const mockPipelineFindUnique = vi.mocked(
      prisma.enhancementPipeline.findUnique,
    );
    const mockPipelineUpdate = vi.mocked(prisma.enhancementPipeline.update);

    beforeEach(() => {
      vi.clearAllMocks();
      // Mock update to return a resolved promise
      mockPipelineUpdate.mockResolvedValue(
        {} as ReturnType<typeof prisma.enhancementPipeline.update> extends Promise<infer T> ? T
          : never,
      );
    });

    it("should return system default when no pipelineId or albumId provided", async () => {
      const result = await resolvePipelineConfig();

      expect(result.pipelineId).toBeNull();
      expect(result.config).toEqual(SYSTEM_DEFAULT_PIPELINE);
      expect(mockAlbumFindUnique).not.toHaveBeenCalled();
      expect(mockPipelineFindUnique).not.toHaveBeenCalled();
    });

    it("should use explicit pipelineId when provided", async () => {
      mockPipelineFindUnique.mockResolvedValue(
        {
          tier: "TIER_2K",
          analysisConfig: { enabled: false },
          autoCropConfig: { enabled: true },
          promptConfig: { customInstructions: "Test" },
          generationConfig: { retryAttempts: 5 },
        } as unknown as ReturnType<
          typeof prisma.enhancementPipeline.findUnique
        > extends Promise<infer T> ? T
          : never,
      );

      const result = await resolvePipelineConfig(undefined, "pipeline-123");

      expect(mockPipelineFindUnique).toHaveBeenCalledWith({
        where: { id: "pipeline-123" },
        select: {
          tier: true,
          analysisConfig: true,
          autoCropConfig: true,
          promptConfig: true,
          generationConfig: true,
        },
      });
      expect(result.pipelineId).toBe("pipeline-123");
      expect(result.config.tier).toBe("TIER_2K");
      expect(result.config.analysis.enabled).toBe(false);
    });

    it("should fetch pipeline from album when albumId provided", async () => {
      mockAlbumFindUnique.mockResolvedValue(
        {
          pipelineId: "album-pipeline-456",
        } as unknown as ReturnType<typeof prisma.album.findUnique> extends Promise<infer T> ? T
          : never,
      );
      mockPipelineFindUnique.mockResolvedValue(
        {
          tier: "TIER_4K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: false },
          promptConfig: null,
          generationConfig: null,
        } as unknown as ReturnType<
          typeof prisma.enhancementPipeline.findUnique
        > extends Promise<infer T> ? T
          : never,
      );

      const result = await resolvePipelineConfig("album-789");

      expect(mockAlbumFindUnique).toHaveBeenCalledWith({
        where: { id: "album-789" },
        select: { pipelineId: true },
      });
      expect(mockPipelineFindUnique).toHaveBeenCalledWith({
        where: { id: "album-pipeline-456" },
        select: expect.any(Object),
      });
      expect(result.pipelineId).toBe("album-pipeline-456");
      expect(result.config.tier).toBe("TIER_4K");
    });

    it("should prefer explicit pipelineId over album's pipeline", async () => {
      mockPipelineFindUnique.mockResolvedValue(
        {
          tier: "TIER_1K",
          analysisConfig: null,
          autoCropConfig: null,
          promptConfig: null,
          generationConfig: null,
        } as ReturnType<typeof prisma.enhancementPipeline.findUnique> extends Promise<infer T> ? T
          : never,
      );

      const result = await resolvePipelineConfig(
        "album-123",
        "explicit-pipeline",
      );

      // Should not query album since explicit pipelineId was provided
      expect(mockAlbumFindUnique).not.toHaveBeenCalled();
      expect(mockPipelineFindUnique).toHaveBeenCalledWith({
        where: { id: "explicit-pipeline" },
        select: expect.any(Object),
      });
      expect(result.pipelineId).toBe("explicit-pipeline");
    });

    it("should return system default when album has no pipeline", async () => {
      mockAlbumFindUnique.mockResolvedValue(
        {
          pipelineId: null,
        } as ReturnType<typeof prisma.album.findUnique> extends Promise<infer T> ? T
          : never,
      );

      const result = await resolvePipelineConfig("album-without-pipeline");

      expect(result.pipelineId).toBeNull();
      expect(result.config).toEqual(SYSTEM_DEFAULT_PIPELINE);
    });

    it("should return system default when album not found", async () => {
      mockAlbumFindUnique.mockResolvedValue(null);

      const result = await resolvePipelineConfig("nonexistent-album");

      expect(result.pipelineId).toBeNull();
      expect(result.config).toEqual(SYSTEM_DEFAULT_PIPELINE);
    });

    it("should return system default when pipeline not found", async () => {
      mockPipelineFindUnique.mockResolvedValue(null);

      const result = await resolvePipelineConfig(
        undefined,
        "nonexistent-pipeline",
      );

      expect(result.pipelineId).toBeNull();
      expect(result.config).toEqual(SYSTEM_DEFAULT_PIPELINE);
    });

    it("should increment usage count when pipeline is found", async () => {
      mockPipelineFindUnique.mockResolvedValue(
        {
          tier: "TIER_1K",
          analysisConfig: null,
          autoCropConfig: null,
          promptConfig: null,
          generationConfig: null,
        } as ReturnType<typeof prisma.enhancementPipeline.findUnique> extends Promise<infer T> ? T
          : never,
      );

      await resolvePipelineConfig(undefined, "pipeline-to-increment");

      // Wait a tick for the async update
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPipelineUpdate).toHaveBeenCalledWith({
        where: { id: "pipeline-to-increment" },
        data: { usageCount: { increment: 1 } },
      });
    });

    it("should use system defaults for null config fields", async () => {
      mockPipelineFindUnique.mockResolvedValue(
        {
          tier: "TIER_2K",
          analysisConfig: null,
          autoCropConfig: null,
          promptConfig: null,
          generationConfig: null,
        } as ReturnType<typeof prisma.enhancementPipeline.findUnique> extends Promise<infer T> ? T
          : never,
      );

      const result = await resolvePipelineConfig(
        undefined,
        "pipeline-with-nulls",
      );

      expect(result.config.tier).toBe("TIER_2K");
      expect(result.config.analysis).toEqual(SYSTEM_DEFAULT_PIPELINE.analysis);
      expect(result.config.autoCrop).toEqual(SYSTEM_DEFAULT_PIPELINE.autoCrop);
      expect(result.config.prompt).toEqual(SYSTEM_DEFAULT_PIPELINE.prompt);
      expect(result.config.generation).toEqual(
        SYSTEM_DEFAULT_PIPELINE.generation,
      );
    });
  });

  describe("WorkflowStage", () => {
    it("should have all expected stages", () => {
      expect(WorkflowStage.DOWNLOAD).toBe("DOWNLOAD");
      expect(WorkflowStage.METADATA).toBe("METADATA");
      expect(WorkflowStage.ANALYSIS).toBe("ANALYSIS");
      expect(WorkflowStage.BLEND_SOURCE).toBe("BLEND_SOURCE");
      expect(WorkflowStage.CROP).toBe("CROP");
      expect(WorkflowStage.PAD).toBe("PAD");
      expect(WorkflowStage.ENHANCE).toBe("ENHANCE");
      expect(WorkflowStage.POST_PROCESS).toBe("POST_PROCESS");
      expect(WorkflowStage.SAVE).toBe("SAVE");
      expect(WorkflowStage.REFUND).toBe("REFUND");
    });
  });

  describe("ERROR_BOUNDARIES", () => {
    it("should have configuration for all stages", () => {
      const stages = Object.values(WorkflowStage);
      for (const stage of stages) {
        expect(ERROR_BOUNDARIES[stage]).toBeDefined();
        expect(ERROR_BOUNDARIES[stage].stage).toBe(stage);
      }
    });

    it("should mark DOWNLOAD as non-recoverable and retryable", () => {
      expect(ERROR_BOUNDARIES[WorkflowStage.DOWNLOAD].isRecoverable).toBe(
        false,
      );
      expect(ERROR_BOUNDARIES[WorkflowStage.DOWNLOAD].retryable).toBe(true);
    });

    it("should mark ANALYSIS as recoverable", () => {
      expect(ERROR_BOUNDARIES[WorkflowStage.ANALYSIS].isRecoverable).toBe(true);
      expect(ERROR_BOUNDARIES[WorkflowStage.ANALYSIS].defaultBehavior).toBe(
        "Skip analysis, use generic enhancement prompt",
      );
    });

    it("should mark BLEND_SOURCE as recoverable", () => {
      expect(ERROR_BOUNDARIES[WorkflowStage.BLEND_SOURCE].isRecoverable).toBe(
        true,
      );
      expect(ERROR_BOUNDARIES[WorkflowStage.BLEND_SOURCE].defaultBehavior).toBe(
        "Proceed without blend source",
      );
    });

    it("should mark CROP as recoverable", () => {
      expect(ERROR_BOUNDARIES[WorkflowStage.CROP].isRecoverable).toBe(true);
      expect(ERROR_BOUNDARIES[WorkflowStage.CROP].defaultBehavior).toBe(
        "Keep original image without cropping",
      );
    });

    it("should mark ENHANCE as non-recoverable and retryable", () => {
      expect(ERROR_BOUNDARIES[WorkflowStage.ENHANCE].isRecoverable).toBe(false);
      expect(ERROR_BOUNDARIES[WorkflowStage.ENHANCE].retryable).toBe(true);
    });

    it("should mark REFUND as recoverable", () => {
      expect(ERROR_BOUNDARIES[WorkflowStage.REFUND].isRecoverable).toBe(true);
      expect(ERROR_BOUNDARIES[WorkflowStage.REFUND].defaultBehavior).toBe(
        "Log error, continue with status update",
      );
    });
  });

  describe("WorkflowStageError", () => {
    it("should create error with stage and message", () => {
      const error = new WorkflowStageError(
        "Test error",
        WorkflowStage.DOWNLOAD,
      );
      expect(error.message).toBe("Test error");
      expect(error.stage).toBe(WorkflowStage.DOWNLOAD);
      expect(error.name).toBe("WorkflowStageError");
    });

    it("should use default error boundary config when options not provided", () => {
      const error = new WorkflowStageError(
        "Test error",
        WorkflowStage.DOWNLOAD,
      );
      expect(error.isRecoverable).toBe(
        ERROR_BOUNDARIES[WorkflowStage.DOWNLOAD].isRecoverable,
      );
      expect(error.retryable).toBe(
        ERROR_BOUNDARIES[WorkflowStage.DOWNLOAD].retryable,
      );
    });

    it("should allow overriding isRecoverable", () => {
      const error = new WorkflowStageError(
        "Test error",
        WorkflowStage.DOWNLOAD,
        { isRecoverable: true },
      );
      expect(error.isRecoverable).toBe(true);
    });

    it("should allow overriding retryable", () => {
      const error = new WorkflowStageError(
        "Test error",
        WorkflowStage.DOWNLOAD,
        { retryable: false },
      );
      expect(error.retryable).toBe(false);
    });

    it("should store cause error", () => {
      const cause = new Error("Original error");
      const error = new WorkflowStageError(
        "Wrapped error",
        WorkflowStage.ENHANCE,
        { cause },
      );
      expect(error.cause).toBe(cause);
    });

    describe("fromError", () => {
      it("should create WorkflowStageError from Error", () => {
        const cause = new Error("Original error");
        const error = WorkflowStageError.fromError(
          cause,
          WorkflowStage.ENHANCE,
        );
        expect(error.message).toBe("Original error");
        expect(error.stage).toBe(WorkflowStage.ENHANCE);
        expect(error.cause).toBe(cause);
      });

      it("should create WorkflowStageError from string", () => {
        const error = WorkflowStageError.fromError(
          "String error",
          WorkflowStage.SAVE,
        );
        expect(error.message).toBe("String error");
        expect(error.stage).toBe(WorkflowStage.SAVE);
        expect(error.cause).toBeUndefined();
      });

      it("should allow overriding options", () => {
        const error = WorkflowStageError.fromError(
          new Error("Test"),
          WorkflowStage.DOWNLOAD,
          { isRecoverable: true, retryable: false },
        );
        expect(error.isRecoverable).toBe(true);
        expect(error.retryable).toBe(false);
      });
    });

    describe("isPermanentFailure", () => {
      it("should return true for non-retryable, non-recoverable WorkflowStageError", () => {
        const error = new WorkflowStageError("Test", WorkflowStage.DOWNLOAD, {
          isRecoverable: false,
          retryable: false,
        });
        expect(WorkflowStageError.isPermanentFailure(error)).toBe(true);
      });

      it("should return false for retryable WorkflowStageError", () => {
        const error = new WorkflowStageError("Test", WorkflowStage.DOWNLOAD, {
          isRecoverable: false,
          retryable: true,
        });
        expect(WorkflowStageError.isPermanentFailure(error)).toBe(false);
      });

      it("should return false for recoverable WorkflowStageError", () => {
        const error = new WorkflowStageError("Test", WorkflowStage.ANALYSIS, {
          isRecoverable: true,
          retryable: false,
        });
        expect(WorkflowStageError.isPermanentFailure(error)).toBe(false);
      });

      it("should detect permanent failure patterns in Error messages", () => {
        expect(
          WorkflowStageError.isPermanentFailure(new Error("Invalid API key")),
        ).toBe(true);
        expect(
          WorkflowStageError.isPermanentFailure(new Error("quota exceeded")),
        ).toBe(true);
        expect(
          WorkflowStageError.isPermanentFailure(
            new Error("invalid credentials provided"),
          ),
        ).toBe(true);
        expect(
          WorkflowStageError.isPermanentFailure(
            new Error("resource not found"),
          ),
        ).toBe(true);
        expect(
          WorkflowStageError.isPermanentFailure(new Error("forbidden access")),
        ).toBe(true);
        expect(
          WorkflowStageError.isPermanentFailure(
            new Error("unauthorized request"),
          ),
        ).toBe(true);
      });

      it("should return false for transient error messages", () => {
        expect(
          WorkflowStageError.isPermanentFailure(
            new Error("Connection timeout"),
          ),
        ).toBe(false);
        expect(
          WorkflowStageError.isPermanentFailure(new Error("Network error")),
        ).toBe(false);
      });

      it("should handle string errors", () => {
        expect(WorkflowStageError.isPermanentFailure("Invalid API key")).toBe(
          true,
        );
        expect(WorkflowStageError.isPermanentFailure("Connection timeout"))
          .toBe(
            false,
          );
      });
    });
  });

  describe("WorkflowContext", () => {
    describe("createWorkflowContext", () => {
      it("should create context with jobId", () => {
        const context = createWorkflowContext("job-123");
        expect(context.jobId).toBe("job-123");
        expect(context.completedStages).toEqual([]);
        expect(context.warnings).toEqual([]);
        expect(context.failedStage).toBeUndefined();
        expect(context.failureMessage).toBeUndefined();
      });
    });

    describe("recordStageSuccess", () => {
      it("should add stage to completedStages", () => {
        const context = createWorkflowContext("job-123");
        recordStageSuccess(context, WorkflowStage.DOWNLOAD);
        expect(context.completedStages).toContain(WorkflowStage.DOWNLOAD);
      });

      it("should allow multiple stages to be recorded", () => {
        const context = createWorkflowContext("job-123");
        recordStageSuccess(context, WorkflowStage.DOWNLOAD);
        recordStageSuccess(context, WorkflowStage.METADATA);
        recordStageSuccess(context, WorkflowStage.ANALYSIS);
        expect(context.completedStages).toEqual([
          WorkflowStage.DOWNLOAD,
          WorkflowStage.METADATA,
          WorkflowStage.ANALYSIS,
        ]);
      });
    });

    describe("recordSoftFailure", () => {
      it("should add warning with stage and message", () => {
        const context = createWorkflowContext("job-123");
        recordSoftFailure(
          context,
          WorkflowStage.ANALYSIS,
          "Vision API timeout",
        );
        expect(context.warnings).toHaveLength(1);
        expect(context.warnings[0]!.stage).toBe(WorkflowStage.ANALYSIS);
        expect(context.warnings[0]!.message).toBe("Vision API timeout");
        expect(context.warnings[0]!.defaultUsed).toBe(
          "Skip analysis, use generic enhancement prompt",
        );
      });
    });

    describe("recordFatalFailure", () => {
      it("should set failedStage and failureMessage", () => {
        const context = createWorkflowContext("job-123");
        recordFatalFailure(context, WorkflowStage.DOWNLOAD, "File not found");
        expect(context.failedStage).toBe(WorkflowStage.DOWNLOAD);
        expect(context.failureMessage).toBe("File not found");
      });
    });
  });
});
