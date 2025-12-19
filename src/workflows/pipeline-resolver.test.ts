import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before vi.mock is called
const { mockPrisma, mockTryCatch } = vi.hoisted(() => ({
  mockPrisma: {
    album: {
      findUnique: vi.fn(),
    },
    enhancementPipeline: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockTryCatch: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: mockTryCatch,
}));

import { SYSTEM_DEFAULT_PIPELINE } from "@/lib/ai/pipeline-types";
import { resolvePipelineConfig } from "./pipeline-resolver";

describe("pipeline-resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for tryCatch - just execute the promise
    mockTryCatch.mockImplementation(async (promise: Promise<unknown>) => {
      try {
        const data = await promise;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    });
  });

  describe("resolvePipelineConfig", () => {
    describe("when no albumId or pipelineId provided", () => {
      it("should return system default pipeline", async () => {
        const result = await resolvePipelineConfig();

        expect(result).toEqual({
          config: SYSTEM_DEFAULT_PIPELINE,
          pipelineId: null,
        });
      });

      it("should not query album or pipeline", async () => {
        await resolvePipelineConfig();

        expect(mockPrisma.album.findUnique).not.toHaveBeenCalled();
        expect(mockPrisma.enhancementPipeline.findUnique).not
          .toHaveBeenCalled();
      });
    });

    describe("when albumId provided without pipelineId", () => {
      it("should query album for pipelineId", async () => {
        mockPrisma.album.findUnique.mockResolvedValue({
          pipelineId: "album-pipeline-123",
        });
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_2K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: false },
          promptConfig: { customInstructions: "test" },
          generationConfig: { retryAttempts: 5 },
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        await resolvePipelineConfig("album-456");

        expect(mockPrisma.album.findUnique).toHaveBeenCalledWith({
          where: { id: "album-456" },
          select: { pipelineId: true },
        });
      });

      it("should use album pipelineId to fetch pipeline config", async () => {
        mockPrisma.album.findUnique.mockResolvedValue({
          pipelineId: "album-pipeline-123",
        });
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_2K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: false },
          promptConfig: null,
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        await resolvePipelineConfig("album-456");

        expect(mockPrisma.enhancementPipeline.findUnique).toHaveBeenCalledWith({
          where: { id: "album-pipeline-123" },
          select: {
            tier: true,
            analysisConfig: true,
            autoCropConfig: true,
            promptConfig: true,
            generationConfig: true,
          },
        });
      });

      it("should return system default when album has no pipelineId", async () => {
        mockPrisma.album.findUnique.mockResolvedValue({
          pipelineId: null,
        });

        const result = await resolvePipelineConfig("album-456");

        expect(result).toEqual({
          config: SYSTEM_DEFAULT_PIPELINE,
          pipelineId: null,
        });
      });

      it("should return system default when album not found", async () => {
        mockPrisma.album.findUnique.mockResolvedValue(null);

        const result = await resolvePipelineConfig("nonexistent-album");

        expect(result).toEqual({
          config: SYSTEM_DEFAULT_PIPELINE,
          pipelineId: null,
        });
      });
    });

    describe("when explicit pipelineId provided", () => {
      it("should use pipelineId directly without querying album", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_4K",
          analysisConfig: { enabled: false },
          autoCropConfig: { enabled: true, minCropRatio: 0.1 },
          promptConfig: { skipCorrections: ["isDark"] },
          generationConfig: { model: "custom-model" },
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        await resolvePipelineConfig("album-456", "explicit-pipeline-789");

        expect(mockPrisma.album.findUnique).not.toHaveBeenCalled();
        expect(mockPrisma.enhancementPipeline.findUnique).toHaveBeenCalledWith({
          where: { id: "explicit-pipeline-789" },
          select: {
            tier: true,
            analysisConfig: true,
            autoCropConfig: true,
            promptConfig: true,
            generationConfig: true,
          },
        });
      });

      it("should return parsed pipeline config with pipelineId", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_2K",
          analysisConfig: { enabled: true, model: "custom-model" },
          autoCropConfig: { enabled: false },
          promptConfig: { customInstructions: "test instructions" },
          generationConfig: { retryAttempts: 2 },
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        const result = await resolvePipelineConfig(undefined, "pipeline-123");

        expect(result).toEqual({
          config: {
            tier: "TIER_2K",
            analysis: { enabled: true, model: "custom-model" },
            autoCrop: { enabled: false },
            prompt: { customInstructions: "test instructions" },
            generation: { retryAttempts: 2 },
          },
          pipelineId: "pipeline-123",
        });
      });

      it("should return system default when pipeline not found", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue(null);

        const result = await resolvePipelineConfig(
          undefined,
          "nonexistent-pipeline",
        );

        expect(result).toEqual({
          config: SYSTEM_DEFAULT_PIPELINE,
          pipelineId: null,
        });
      });
    });

    describe("pipeline config parsing", () => {
      it("should use default analysis config when null", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_1K",
          analysisConfig: null,
          autoCropConfig: { enabled: true },
          promptConfig: null,
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        const result = await resolvePipelineConfig(undefined, "pipeline-123");

        expect(result.config.analysis).toEqual(
          SYSTEM_DEFAULT_PIPELINE.analysis,
        );
      });

      it("should use default autoCrop config when null", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_1K",
          analysisConfig: { enabled: true },
          autoCropConfig: null,
          promptConfig: null,
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        const result = await resolvePipelineConfig(undefined, "pipeline-123");

        expect(result.config.autoCrop).toEqual(
          SYSTEM_DEFAULT_PIPELINE.autoCrop,
        );
      });

      it("should use default prompt config when null", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_1K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: null,
          generationConfig: { retryAttempts: 1 },
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        const result = await resolvePipelineConfig(undefined, "pipeline-123");

        expect(result.config.prompt).toEqual(SYSTEM_DEFAULT_PIPELINE.prompt);
      });

      it("should use default generation config when null", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_1K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: {},
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        const result = await resolvePipelineConfig(undefined, "pipeline-123");

        expect(result.config.generation).toEqual(
          SYSTEM_DEFAULT_PIPELINE.generation,
        );
      });
    });

    describe("usage count increment", () => {
      it("should increment usage count when pipeline is found", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_1K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: null,
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        await resolvePipelineConfig(undefined, "pipeline-123");

        expect(mockTryCatch).toHaveBeenCalled();
        // The tryCatch was called with the update promise
        expect(mockPrisma.enhancementPipeline.update).toHaveBeenCalledWith({
          where: { id: "pipeline-123" },
          data: { usageCount: { increment: 1 } },
        });
      });

      it("should not fail when usage count update fails", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_1K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: null,
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockRejectedValue(
          new Error("Update failed"),
        );

        // Should not throw
        const result = await resolvePipelineConfig(undefined, "pipeline-123");

        expect(result.pipelineId).toBe("pipeline-123");
      });

      it("should not increment usage count when pipeline not found", async () => {
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue(null);

        await resolvePipelineConfig(undefined, "nonexistent-pipeline");

        expect(mockPrisma.enhancementPipeline.update).not.toHaveBeenCalled();
      });
    });

    describe("priority resolution", () => {
      it("should prefer explicit pipelineId over album pipelineId", async () => {
        mockPrisma.album.findUnique.mockResolvedValue({
          pipelineId: "album-pipeline",
        });
        mockPrisma.enhancementPipeline.findUnique.mockResolvedValue({
          tier: "TIER_4K",
          analysisConfig: { enabled: true },
          autoCropConfig: { enabled: true },
          promptConfig: null,
          generationConfig: null,
        });
        mockPrisma.enhancementPipeline.update.mockResolvedValue({});

        const result = await resolvePipelineConfig(
          "album-456",
          "explicit-pipeline",
        );

        expect(mockPrisma.album.findUnique).not.toHaveBeenCalled();
        expect(mockPrisma.enhancementPipeline.findUnique).toHaveBeenCalledWith({
          where: { id: "explicit-pipeline" },
          select: expect.any(Object),
        });
        expect(result.pipelineId).toBe("explicit-pipeline");
      });
    });
  });
});
