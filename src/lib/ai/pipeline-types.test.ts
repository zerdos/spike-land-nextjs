import { describe, expect, it } from "vitest";
import {
  isValidPipelineConfig,
  parsePipelineConfig,
  type PipelineConfig,
  type PipelineDbConfigs,
  type PromptConfig,
  type ReferenceImage,
  SYSTEM_DEFAULT_PIPELINE,
} from "./pipeline-types";

describe("pipeline-types", () => {
  describe("SYSTEM_DEFAULT_PIPELINE", () => {
    it("should have TIER_1K as default tier", () => {
      expect(SYSTEM_DEFAULT_PIPELINE.tier).toBe("TIER_1K");
    });

    it("should have analysis enabled by default", () => {
      expect(SYSTEM_DEFAULT_PIPELINE.analysis.enabled).toBe(true);
    });

    it("should have auto-crop enabled by default", () => {
      expect(SYSTEM_DEFAULT_PIPELINE.autoCrop.enabled).toBe(true);
    });

    it("should have correct auto-crop defaults", () => {
      expect(SYSTEM_DEFAULT_PIPELINE.autoCrop.minCropRatio).toBe(0.05);
      expect(SYSTEM_DEFAULT_PIPELINE.autoCrop.allowBlackBarRemoval).toBe(true);
      expect(SYSTEM_DEFAULT_PIPELINE.autoCrop.allowUIElementCrop).toBe(true);
    });

    it("should have empty prompt config by default", () => {
      expect(SYSTEM_DEFAULT_PIPELINE.prompt).toEqual({});
    });

    it("should have 3 retry attempts by default", () => {
      expect(SYSTEM_DEFAULT_PIPELINE.generation.retryAttempts).toBe(3);
    });
  });

  describe("parsePipelineConfig", () => {
    it("should use provided configs when available", () => {
      const dbConfigs: PipelineDbConfigs = {
        analysisConfig: { enabled: false },
        autoCropConfig: { enabled: false, minCropRatio: 0.1 },
        promptConfig: { customInstructions: "Test instructions" },
        generationConfig: { retryAttempts: 5 },
      };

      const result = parsePipelineConfig("TIER_2K", dbConfigs);

      expect(result.tier).toBe("TIER_2K");
      expect(result.analysis.enabled).toBe(false);
      expect(result.autoCrop.enabled).toBe(false);
      expect(result.autoCrop.minCropRatio).toBe(0.1);
      expect(result.prompt.customInstructions).toBe("Test instructions");
      expect(result.generation.retryAttempts).toBe(5);
    });

    it("should fall back to system defaults for null configs", () => {
      const dbConfigs: PipelineDbConfigs = {
        analysisConfig: null,
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      };

      const result = parsePipelineConfig("TIER_4K", dbConfigs);

      expect(result.tier).toBe("TIER_4K");
      expect(result.analysis).toEqual(SYSTEM_DEFAULT_PIPELINE.analysis);
      expect(result.autoCrop).toEqual(SYSTEM_DEFAULT_PIPELINE.autoCrop);
      expect(result.prompt).toEqual(SYSTEM_DEFAULT_PIPELINE.prompt);
      expect(result.generation).toEqual(SYSTEM_DEFAULT_PIPELINE.generation);
    });

    it("should handle partial null configs", () => {
      const dbConfigs: PipelineDbConfigs = {
        analysisConfig: { enabled: true, temperature: 0.5 },
        autoCropConfig: null,
        promptConfig: { defectOverrides: { isDark: true } },
        generationConfig: null,
      };

      const result = parsePipelineConfig("TIER_1K", dbConfigs);

      expect(result.analysis).toEqual({ enabled: true, temperature: 0.5 });
      expect(result.autoCrop).toEqual(SYSTEM_DEFAULT_PIPELINE.autoCrop);
      expect(result.prompt).toEqual({ defectOverrides: { isDark: true } });
      expect(result.generation).toEqual(SYSTEM_DEFAULT_PIPELINE.generation);
    });
  });

  describe("isValidPipelineConfig", () => {
    const validConfig: PipelineConfig = {
      tier: "TIER_1K",
      analysis: { enabled: true },
      autoCrop: { enabled: true },
      prompt: {},
      generation: { retryAttempts: 3 },
    };

    it("should return true for valid pipeline config", () => {
      expect(isValidPipelineConfig(validConfig)).toBe(true);
    });

    it("should return true for SYSTEM_DEFAULT_PIPELINE", () => {
      expect(isValidPipelineConfig(SYSTEM_DEFAULT_PIPELINE)).toBe(true);
    });

    it("should return true for all valid tiers", () => {
      expect(isValidPipelineConfig({ ...validConfig, tier: "TIER_1K" })).toBe(
        true,
      );
      expect(isValidPipelineConfig({ ...validConfig, tier: "TIER_2K" })).toBe(
        true,
      );
      expect(isValidPipelineConfig({ ...validConfig, tier: "TIER_4K" })).toBe(
        true,
      );
    });

    it("should return false for null", () => {
      expect(isValidPipelineConfig(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidPipelineConfig(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(isValidPipelineConfig("string")).toBe(false);
      expect(isValidPipelineConfig(123)).toBe(false);
      expect(isValidPipelineConfig([])).toBe(false);
    });

    it("should return false for invalid tier", () => {
      expect(isValidPipelineConfig({ ...validConfig, tier: "INVALID" })).toBe(
        false,
      );
      expect(isValidPipelineConfig({ ...validConfig, tier: 123 })).toBe(false);
    });

    it("should return false for missing tier", () => {
      const { tier: _tier, ...noTier } = validConfig;
      expect(isValidPipelineConfig(noTier)).toBe(false);
    });

    it("should return false for null analysis", () => {
      expect(isValidPipelineConfig({ ...validConfig, analysis: null })).toBe(
        false,
      );
    });

    it("should return false for missing analysis", () => {
      const { analysis: _analysis, ...noAnalysis } = validConfig;
      expect(isValidPipelineConfig(noAnalysis)).toBe(false);
    });

    it("should return false for null autoCrop", () => {
      expect(isValidPipelineConfig({ ...validConfig, autoCrop: null })).toBe(
        false,
      );
    });

    it("should return false for missing autoCrop", () => {
      const { autoCrop: _autoCrop, ...noAutoCrop } = validConfig;
      expect(isValidPipelineConfig(noAutoCrop)).toBe(false);
    });

    it("should return false for null prompt", () => {
      expect(isValidPipelineConfig({ ...validConfig, prompt: null })).toBe(
        false,
      );
    });

    it("should return false for missing prompt", () => {
      const { prompt: _prompt, ...noPrompt } = validConfig;
      expect(isValidPipelineConfig(noPrompt)).toBe(false);
    });

    it("should return false for null generation", () => {
      expect(isValidPipelineConfig({ ...validConfig, generation: null })).toBe(
        false,
      );
    });

    it("should return false for missing generation", () => {
      const { generation: _generation, ...noGeneration } = validConfig;
      expect(isValidPipelineConfig(noGeneration)).toBe(false);
    });

    it("should return true for config with extra properties", () => {
      const configWithExtra = { ...validConfig, extraProp: "value" };
      expect(isValidPipelineConfig(configWithExtra)).toBe(true);
    });

    it("should return true for minimal valid configs in each section", () => {
      const minimalConfig = {
        tier: "TIER_1K",
        analysis: {},
        autoCrop: {},
        prompt: {},
        generation: {},
      };
      expect(isValidPipelineConfig(minimalConfig)).toBe(true);
    });
  });

  describe("PromptConfig with referenceImages", () => {
    it("should accept valid reference images in prompt config", () => {
      const configWithRefs: PipelineConfig = {
        tier: "TIER_1K",
        analysis: { enabled: true },
        autoCrop: { enabled: true },
        prompt: {
          referenceImages: [
            {
              url: "https://example.com/ref1.jpg",
              r2Key: "pipelines/123/references/ref1.jpg",
              description: "Target style",
            },
          ],
        },
        generation: { retryAttempts: 3 },
      };
      expect(isValidPipelineConfig(configWithRefs)).toBe(true);
    });

    it("should accept multiple reference images (up to 3)", () => {
      const refs: ReferenceImage[] = [
        { url: "https://example.com/ref1.jpg", r2Key: "ref1.jpg" },
        {
          url: "https://example.com/ref2.jpg",
          r2Key: "ref2.jpg",
          description: "Color palette",
        },
        {
          url: "https://example.com/ref3.jpg",
          r2Key: "ref3.jpg",
          description: "Lighting",
        },
      ];
      const config: PipelineConfig = {
        tier: "TIER_2K",
        analysis: { enabled: true },
        autoCrop: { enabled: false },
        prompt: { referenceImages: refs },
        generation: {},
      };
      expect(isValidPipelineConfig(config)).toBe(true);
      expect(config.prompt.referenceImages).toHaveLength(3);
    });

    it("should accept reference images without description", () => {
      const ref: ReferenceImage = {
        url: "https://example.com/ref.jpg",
        r2Key: "pipelines/abc/references/ref.jpg",
      };
      expect(ref.description).toBeUndefined();
      expect(ref.url).toBe("https://example.com/ref.jpg");
      expect(ref.r2Key).toBe("pipelines/abc/references/ref.jpg");
    });

    it("should accept empty referenceImages array", () => {
      const config: PipelineConfig = {
        tier: "TIER_1K",
        analysis: { enabled: true },
        autoCrop: { enabled: true },
        prompt: { referenceImages: [] },
        generation: { retryAttempts: 3 },
      };
      expect(isValidPipelineConfig(config)).toBe(true);
      expect(config.prompt.referenceImages).toHaveLength(0);
    });

    it("should combine reference images with other prompt config options", () => {
      const prompt: PromptConfig = {
        customInstructions: "Enhance with vintage look",
        skipCorrections: ["hasNoise"],
        defectOverrides: { isDark: false },
        referenceImages: [
          {
            url: "https://example.com/vintage.jpg",
            r2Key: "vintage.jpg",
            description: "Vintage style",
          },
        ],
      };
      expect(prompt.customInstructions).toBe("Enhance with vintage look");
      expect(prompt.skipCorrections).toContain("hasNoise");
      expect(prompt.defectOverrides?.isDark).toBe(false);
      expect(prompt.referenceImages).toHaveLength(1);
    });
  });

  describe("parsePipelineConfig with referenceImages", () => {
    it("should preserve reference images from db config", () => {
      const dbConfigs: PipelineDbConfigs = {
        analysisConfig: { enabled: true },
        autoCropConfig: { enabled: false },
        promptConfig: {
          referenceImages: [
            {
              url: "https://example.com/ref.jpg",
              r2Key: "ref.jpg",
              description: "Style ref",
            },
          ],
        },
        generationConfig: { retryAttempts: 5 },
      };

      const result = parsePipelineConfig("TIER_2K", dbConfigs);

      expect(result.prompt.referenceImages).toHaveLength(1);
      expect(result.prompt.referenceImages?.[0]!.url).toBe(
        "https://example.com/ref.jpg",
      );
      expect(result.prompt.referenceImages?.[0]!.description).toBe("Style ref");
    });

    it("should handle null prompt config with default (no reference images)", () => {
      const dbConfigs: PipelineDbConfigs = {
        analysisConfig: { enabled: true },
        autoCropConfig: null,
        promptConfig: null,
        generationConfig: null,
      };

      const result = parsePipelineConfig("TIER_1K", dbConfigs);

      expect(result.prompt).toEqual(SYSTEM_DEFAULT_PIPELINE.prompt);
      expect(result.prompt.referenceImages).toBeUndefined();
    });
  });
});
