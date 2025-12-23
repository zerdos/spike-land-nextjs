import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AnalysisDetailedResult,
  analyzeImage,
  buildDynamicEnhancementPrompt,
  DEFAULT_MODEL,
  type EnhanceImageParams,
  enhanceImageWithGemini,
  GEMINI_TIMEOUT_MS,
  type GenerateImageParams,
  generateImageWithGemini,
  getModelForTier,
  isGeminiConfigured,
  type ModifyImageParams,
  modifyImageWithGemini,
  resetGeminiClient,
  VALID_GEMINI_MODELS,
} from "./gemini-client";

// Mock the @google/genai module - Vitest 4: Use vi.hoisted for configurable mock
const { MockGoogleGenAI, mockGenerateContentStream, mockGenerateContent } = vi
  .hoisted(() => {
    const mockGenerateContentStream = vi.fn();
    const mockGenerateContent = vi.fn();

    class MockGoogleGenAI {
      static mock = { instances: [] as MockGoogleGenAI[] };
      models = {
        generateContentStream: mockGenerateContentStream,
        generateContent: mockGenerateContent,
      };
      constructor() {
        MockGoogleGenAI.mock.instances.push(this);
      }
    }

    return { MockGoogleGenAI, mockGenerateContentStream, mockGenerateContent };
  });

vi.mock("@google/genai", () => ({
  GoogleGenAI: MockGoogleGenAI,
}));

describe("gemini-client", () => {
  describe("analyzeImage", () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = "test-api-key";
      resetGeminiClient();
      // Mock the generateContent response for analysis
      mockGenerateContent.mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                mainSubject: "A person in a garden",
                imageStyle: "photograph",
                defects: {
                  isDark: false,
                  isBlurry: false,
                  hasNoise: true,
                  hasVHSArtifacts: false,
                  isLowResolution: true,
                  isOverexposed: false,
                  hasColorCast: false,
                },
                lightingCondition: "natural daylight",
                cropping: { isCroppingNeeded: false },
              }),
            }],
          },
        }],
      });
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      mockGenerateContent.mockReset();
    });

    it("should return analysis result with enhancement prompt", async () => {
      const result = await analyzeImage("base64data", "image/jpeg");

      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("quality");
      expect(result).toHaveProperty("suggestedImprovements");
      expect(result).toHaveProperty("enhancementPrompt");
      expect(result.quality).toMatch(/low|medium|high/);
      expect(Array.isArray(result.suggestedImprovements)).toBe(true);
    });

    it("should include enhancement prompt with dynamic instructions", async () => {
      const result = await analyzeImage("base64data", "image/jpeg");

      // Dynamic prompt should contain professional image restoration instructions
      expect(result.enhancementPrompt).toContain(
        "professional image restoration",
      );
    });

    it("should log image metadata during analysis", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await analyzeImage("testImageData", "image/png");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("image/png"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("13 chars"), // 'testImageData'.length
      );

      consoleSpy.mockRestore();
    });
  });

  describe("buildDynamicEnhancementPrompt", () => {
    const baseAnalysis: AnalysisDetailedResult = {
      mainSubject: "A person in a garden",
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
    };

    it("should return base prompt for clean photograph", () => {
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis);
      expect(prompt).toContain("professional image restoration");
      expect(prompt).toContain("high-resolution");
    });

    it("should add sketch conversion instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        imageStyle: "sketch",
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("sketch");
      expect(prompt).toContain("photorealistic");
    });

    it("should add painting conversion instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        imageStyle: "painting",
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("painting");
      expect(prompt).toContain("photorealistic");
    });

    it("should add screenshot cleanup instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        imageStyle: "screenshot",
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("screenshot");
    });

    it("should add dark image relighting instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: { ...baseAnalysis.defects, isDark: true },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("relight");
    });

    it("should add overexposed recovery instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: { ...baseAnalysis.defects, isOverexposed: true },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("blown-out");
    });

    it("should add VHS artifact removal instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: { ...baseAnalysis.defects, hasVHSArtifacts: true },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("analog video");
      expect(prompt).toContain("tracking");
    });

    it("should add noise reduction instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: { ...baseAnalysis.defects, hasNoise: true },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("noise");
    });

    it("should add low resolution enhancement instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: { ...baseAnalysis.defects, isLowResolution: true },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("pixelated");
    });

    it("should add color cast correction instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: {
          ...baseAnalysis.defects,
          hasColorCast: true,
          colorCastType: "yellow",
        },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("yellow");
      expect(prompt).toContain("color cast");
    });

    it("should add blur correction instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: { ...baseAnalysis.defects, isBlurry: true },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("focus");
    });

    it("should combine multiple defect instructions", () => {
      const analysis: AnalysisDetailedResult = {
        ...baseAnalysis,
        defects: {
          isDark: true,
          isBlurry: true,
          hasNoise: true,
          hasVHSArtifacts: false,
          isLowResolution: false,
          isOverexposed: false,
          hasColorCast: false,
        },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("relight");
      expect(prompt).toContain("focus");
      expect(prompt).toContain("noise");
    });

    it("should handle extreme VHS case with multiple defects", () => {
      const analysis: AnalysisDetailedResult = {
        mainSubject: "VHS tape recording",
        imageStyle: "screenshot",
        defects: {
          isDark: false,
          isBlurry: true,
          hasNoise: true,
          hasVHSArtifacts: true,
          isLowResolution: true,
          isOverexposed: false,
          hasColorCast: true,
          colorCastType: "blue",
        },
        lightingCondition: "indoor artificial",
        cropping: { isCroppingNeeded: false },
      };
      const prompt = buildDynamicEnhancementPrompt(analysis);
      expect(prompt).toContain("screenshot");
      expect(prompt).toContain("analog video");
      expect(prompt).toContain("noise");
      expect(prompt).toContain("blue");
    });

    it("should add reference image instructions when provided", () => {
      const promptConfig = {
        referenceImages: [
          { url: "https://r2.example.com/ref1.jpg", r2Key: "ref1.jpg" },
        ],
      };
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis, promptConfig);
      expect(prompt).toContain("Style Reference");
      expect(prompt).toContain("Match the visual style");
      expect(prompt).toContain("reference image"); // singular
    });

    it("should use plural form for multiple reference images", () => {
      const promptConfig = {
        referenceImages: [
          { url: "https://r2.example.com/ref1.jpg", r2Key: "ref1.jpg" },
          { url: "https://r2.example.com/ref2.jpg", r2Key: "ref2.jpg" },
        ],
      };
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis, promptConfig);
      expect(prompt).toContain("reference images"); // plural
    });

    it("should include reference image descriptions when provided", () => {
      const promptConfig = {
        referenceImages: [
          {
            url: "https://r2.example.com/ref1.jpg",
            r2Key: "ref1.jpg",
            description: "Target vintage look",
          },
          {
            url: "https://r2.example.com/ref2.jpg",
            r2Key: "ref2.jpg",
            description: "Color palette",
          },
        ],
      };
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis, promptConfig);
      expect(prompt).toContain("Reference image notes");
      expect(prompt).toContain("Target vintage look");
      expect(prompt).toContain("Color palette");
    });

    it("should not include description section when no descriptions provided", () => {
      const promptConfig = {
        referenceImages: [
          { url: "https://r2.example.com/ref1.jpg", r2Key: "ref1.jpg" },
        ],
      };
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis, promptConfig);
      expect(prompt).not.toContain("Reference image notes");
    });

    it("should not add reference instructions when referenceImages is empty", () => {
      const promptConfig = {
        referenceImages: [],
      };
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis, promptConfig);
      expect(prompt).not.toContain("Style Reference");
    });

    it("should combine custom instructions with reference images", () => {
      const promptConfig = {
        customInstructions: "Preserve film grain",
        referenceImages: [
          {
            url: "https://r2.example.com/ref1.jpg",
            r2Key: "ref1.jpg",
            description: "Target style",
          },
        ],
      };
      const prompt = buildDynamicEnhancementPrompt(baseAnalysis, promptConfig);
      expect(prompt).toContain("Additional Instructions");
      expect(prompt).toContain("Preserve film grain");
      expect(prompt).toContain("Style Reference");
      expect(prompt).toContain("Target style");
    });
  });

  describe("isGeminiConfigured", () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it("should return true when API key is set", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      expect(isGeminiConfigured()).toBe(true);
    });

    it("should return false when API key is not set", () => {
      expect(isGeminiConfigured()).toBe(false);
    });

    it("should return false when API key is empty string", () => {
      process.env.GEMINI_API_KEY = "";
      expect(isGeminiConfigured()).toBe(false);
    });
  });

  describe("enhanceImageWithGemini", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
      resetGeminiClient();
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
    });

    const defaultParams: EnhanceImageParams = {
      imageData: "base64imagedata",
      mimeType: "image/jpeg",
      tier: "1K",
    };

    it("should throw error when API key is not set", async () => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();

      await expect(enhanceImageWithGemini(defaultParams)).rejects.toThrow(
        "GEMINI_API_KEY environment variable is not set",
      );
    });

    it("should handle streaming response correctly", async () => {
      const imageBase64 = Buffer.from("test-image-data").toString("base64");

      // Create async generator for streaming response
      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: imageBase64,
                    },
                  },
                ],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await enhanceImageWithGemini(defaultParams);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("test-image-data");
    });

    it("should concatenate multiple chunks correctly", async () => {
      const chunk1 = Buffer.from("chunk1").toString("base64");
      const chunk2 = Buffer.from("chunk2").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk1 } }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk2 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await enhanceImageWithGemini(defaultParams);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("chunk1chunk2");
    });

    it("should throw when no image data received", async () => {
      async function* mockStream() {
        yield { candidates: [] };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await expect(enhanceImageWithGemini(defaultParams)).rejects.toThrow(
        "No image data received from Gemini API",
      );
    });

    it("should skip chunks without valid candidates", async () => {
      const imageBase64 = Buffer.from("valid-data").toString("base64");

      async function* mockStream() {
        // Chunk without candidates
        yield { candidates: null };
        // Chunk without content
        yield { candidates: [{ content: null }] };
        // Chunk without parts
        yield { candidates: [{ content: { parts: null } }] };
        // Valid chunk
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await enhanceImageWithGemini(defaultParams);

      expect(result.toString()).toBe("valid-data");
    });

    it("should handle empty inline data gracefully", async () => {
      const imageBase64 = Buffer.from("fallback-data").toString("base64");

      async function* mockStream() {
        // Chunk with empty data string
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: "" } }],
              },
            },
          ],
        };
        // Valid chunk
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await enhanceImageWithGemini(defaultParams);

      // Empty data still creates a buffer (0 bytes), so both are concatenated
      expect(result.toString()).toBe("fallback-data");
    });

    it("should pass correct parameters to Gemini API", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const params: EnhanceImageParams = {
        imageData: "myImageData",
        mimeType: "image/png",
        tier: "2K",
        originalWidth: 800,
        originalHeight: 600,
      };

      await enhanceImageWithGemini(params);

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3-pro-image-preview", // DEFAULT_MODEL (always premium)
          config: {
            responseModalities: ["IMAGE", "TEXT"],
            imageConfig: {
              imageSize: "2K",
            },
          },
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              parts: expect.arrayContaining([
                expect.objectContaining({
                  inlineData: {
                    mimeType: "image/png",
                    data: "myImageData",
                  },
                }),
                expect.objectContaining({
                  text: expect.stringContaining("2048x2048"),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should handle different tier resolutions", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      // Test 4K tier
      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await enhanceImageWithGemini({ ...defaultParams, tier: "4K" });

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: { imageSize: "4K" },
          }),
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining("4096x4096"),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should include reference images in content parts when provided", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");
      const refImageBase64 = Buffer.from("reference-style").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await enhanceImageWithGemini({
        ...defaultParams,
        promptOverride: "Test prompt",
        referenceImages: [
          {
            imageData: refImageBase64,
            mimeType: "image/jpeg",
            description: "Style ref",
          },
        ],
      });

      // Verify reference images are logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Including 1 reference image(s) for style guidance",
        ),
      );

      // Verify the API was called with correct content structure
      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                // Original image
                expect.objectContaining({
                  inlineData: expect.objectContaining({
                    mimeType: "image/jpeg",
                    data: "base64imagedata",
                  }),
                }),
                // Reference image
                expect.objectContaining({
                  inlineData: expect.objectContaining({
                    mimeType: "image/jpeg",
                    data: refImageBase64,
                  }),
                }),
                // Text prompt
                expect.objectContaining({
                  text: expect.stringContaining("Test prompt"),
                }),
              ]),
            }),
          ]),
        }),
      );

      consoleSpy.mockRestore();
    });

    it("should include multiple reference images in correct order", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");
      const ref1Base64 = Buffer.from("ref1").toString("base64");
      const ref2Base64 = Buffer.from("ref2").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await enhanceImageWithGemini({
        ...defaultParams,
        promptOverride: "Test prompt",
        referenceImages: [
          { imageData: ref1Base64, mimeType: "image/png" },
          { imageData: ref2Base64, mimeType: "image/webp" },
        ],
      });

      const calledContents = mockGenerateContentStream.mock.calls[0]![0].contents[0].parts;

      // First should be original image
      expect(calledContents[0].inlineData.data).toBe("base64imagedata");

      // Then reference images
      expect(calledContents[1].inlineData.data).toBe(ref1Base64);
      expect(calledContents[1].inlineData.mimeType).toBe("image/png");
      expect(calledContents[2].inlineData.data).toBe(ref2Base64);
      expect(calledContents[2].inlineData.mimeType).toBe("image/webp");

      // Last should be text prompt
      expect(calledContents[3].text).toContain("Test prompt");
    });

    it("should log generation message", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await enhanceImageWithGemini(defaultParams);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Generating enhanced image with Gemini API using model:",
        ),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Tier: 1K, Resolution: 1024x1024"),
      );

      consoleSpy.mockRestore();
    });

    it("should have a reasonable timeout constant", () => {
      // Verify the timeout constant exists and is set to 5 minutes
      expect(GEMINI_TIMEOUT_MS).toBe(5 * 60 * 1000);
    });

    it("should handle stream error during processing", async () => {
      async function* mockErrorStream() {
        throw new Error("Network disconnected");
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockErrorStream());

      await expect(enhanceImageWithGemini(defaultParams)).rejects.toThrow(
        "Stream processing failed",
      );
    });

    it("should handle API initialization failure", async () => {
      mockGenerateContentStream.mockRejectedValueOnce(
        new Error("Service unavailable"),
      );

      await expect(enhanceImageWithGemini(defaultParams)).rejects.toThrow(
        "Failed to start image enhancement: Service unavailable",
      );
    });
  });

  describe("resetGeminiClient", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
    });

    it("should allow reinitializing client after reset", () => {
      process.env.GEMINI_API_KEY = "first-key";

      resetGeminiClient();

      // After reset, no new instances should be created until next call
      expect(MockGoogleGenAI.mock.instances.length).toBe(0);
    });
  });

  describe("generateImageWithGemini", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
      resetGeminiClient();
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
    });

    const defaultParams: GenerateImageParams = {
      prompt: "A beautiful sunset over the ocean",
      tier: "1K",
    };

    it("should throw error when API key is not set", async () => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();

      await expect(generateImageWithGemini(defaultParams)).rejects.toThrow(
        "GEMINI_API_KEY environment variable is not set",
      );
    });

    it("should generate image successfully", async () => {
      const imageBase64 = Buffer.from("generated-image").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await generateImageWithGemini(defaultParams);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("generated-image");
    });

    it("should pass correct text-only content to API", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await generateImageWithGemini(defaultParams);

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_MODEL,
          config: {
            responseModalities: ["IMAGE", "TEXT"],
            imageConfig: {
              imageSize: "1K",
            },
          },
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining(
                    "A beautiful sunset over the ocean",
                  ),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should include negative prompt when provided", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const params: GenerateImageParams = {
        prompt: "A sunset",
        tier: "2K",
        negativePrompt: "blurry, dark, noisy",
      };

      await generateImageWithGemini(params);

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining("Avoid: blurry, dark, noisy"),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should handle different tier resolutions for generation", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await generateImageWithGemini({ ...defaultParams, tier: "4K" });

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: { imageSize: "4K" },
          }),
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining("4096x4096"),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should handle API initialization failure for generation", async () => {
      mockGenerateContentStream.mockRejectedValueOnce(
        new Error("Rate limit exceeded"),
      );

      await expect(generateImageWithGemini(defaultParams)).rejects.toThrow(
        "Failed to start image generation: Rate limit exceeded",
      );
    });

    it("should throw when no image data received from generation", async () => {
      async function* mockStream() {
        yield { candidates: [] };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await expect(generateImageWithGemini(defaultParams)).rejects.toThrow(
        "No image data received from Gemini API",
      );
    });

    it("should log generation details", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await generateImageWithGemini(defaultParams);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Generating image with Gemini API using model:",
        ),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Tier: 1K"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Prompt:"),
      );

      consoleSpy.mockRestore();
    });

    it("should truncate long prompts in logs", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const longPrompt = "a".repeat(150);
      await generateImageWithGemini({ prompt: longPrompt, tier: "1K" });

      // Find the log call that contains "Prompt:"
      const promptLog = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("Prompt:"),
      );

      expect(promptLog).toBeDefined();
      // Prompt should be truncated to 100 chars + "..."
      expect(promptLog![0]).toContain("...");

      consoleSpy.mockRestore();
    });
  });

  describe("modifyImageWithGemini", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
      resetGeminiClient();
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
    });

    const defaultParams: ModifyImageParams = {
      prompt: "Make the sky more blue",
      imageData: "base64imagedata",
      mimeType: "image/jpeg",
      tier: "1K",
    };

    it("should throw error when API key is not set", async () => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();

      await expect(modifyImageWithGemini(defaultParams)).rejects.toThrow(
        "GEMINI_API_KEY environment variable is not set",
      );
    });

    it("should modify image successfully", async () => {
      const imageBase64 = Buffer.from("modified-image").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await modifyImageWithGemini(defaultParams);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("modified-image");
    });

    it("should pass image data and text content to API", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await modifyImageWithGemini(defaultParams);

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_MODEL,
          config: {
            responseModalities: ["IMAGE", "TEXT"],
            imageConfig: {
              imageSize: "1K",
            },
          },
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              parts: expect.arrayContaining([
                expect.objectContaining({
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: "base64imagedata",
                  },
                }),
                expect.objectContaining({
                  text: expect.stringContaining("Make the sky more blue"),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should handle different tier resolutions for modification", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await modifyImageWithGemini({ ...defaultParams, tier: "2K" });

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: { imageSize: "2K" },
          }),
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining("2048x2048"),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("should handle API initialization failure for modification", async () => {
      mockGenerateContentStream.mockRejectedValueOnce(
        new Error("Service unavailable"),
      );

      await expect(modifyImageWithGemini(defaultParams)).rejects.toThrow(
        "Failed to start image generation: Service unavailable",
      );
    });

    it("should throw when no image data received from modification", async () => {
      async function* mockStream() {
        yield { candidates: [] };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await expect(modifyImageWithGemini(defaultParams)).rejects.toThrow(
        "No image data received from Gemini API",
      );
    });

    it("should concatenate multiple chunks correctly for modification", async () => {
      const chunk1 = Buffer.from("modified").toString("base64");
      const chunk2 = Buffer.from("-result").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk1 } }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk2 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await modifyImageWithGemini(defaultParams);

      expect(result.toString()).toBe("modified-result");
    });

    it("should skip chunks without valid candidates", async () => {
      const imageBase64 = Buffer.from("valid-data").toString("base64");

      async function* mockStream() {
        yield { candidates: null };
        yield { candidates: [{ content: null }] };
        yield { candidates: [{ content: { parts: null } }] };
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await modifyImageWithGemini(defaultParams);

      expect(result.toString()).toBe("valid-data");
    });

    it("should log modification details", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await modifyImageWithGemini(defaultParams);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Modifying image with Gemini API using model:"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Tier: 1K"),
      );

      consoleSpy.mockRestore();
    });

    it("should handle stream error during modification", async () => {
      async function* mockErrorStream() {
        throw new Error("Connection reset");
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockErrorStream());

      await expect(modifyImageWithGemini(defaultParams)).rejects.toThrow(
        "Stream processing failed",
      );
    });
  });

  describe("processGeminiStream edge cases", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
      resetGeminiClient();
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
    });

    it("should handle empty inline data gracefully in processGeminiStream", async () => {
      const imageBase64 = Buffer.from("actual-data").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: "" } }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      const result = await generateImageWithGemini({
        prompt: "test",
        tier: "1K",
      });

      expect(result.toString()).toBe("actual-data");
    });

    it("should handle non-Error exceptions during stream processing", async () => {
      async function* mockStream() {
        throw "String error thrown";
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await expect(generateImageWithGemini({ prompt: "test", tier: "1K" }))
        .rejects.toThrow(
          "Stream processing failed: Unknown error",
        );
    });

    it("should log skipped chunks without valid candidates", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield { candidates: [] };
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await generateImageWithGemini({ prompt: "test", tier: "1K" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Skipping chunk \d+: no valid candidates/),
      );

      consoleSpy.mockRestore();
    });

    it("should log successful chunk receipt", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await generateImageWithGemini({ prompt: "test", tier: "1K" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Received chunk \d+: \d+ bytes/),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /Successfully received \d+ chunks, total \d+ bytes/,
        ),
      );

      consoleSpy.mockRestore();
    });

    it("should log error when no image data received", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      async function* mockStream() {
        yield { candidates: [] };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await expect(modifyImageWithGemini({
        prompt: "test",
        imageData: "data",
        mimeType: "image/png",
        tier: "1K",
      })).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No image data received after processing"),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should log stream initiation failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      mockGenerateContentStream.mockRejectedValueOnce(
        new Error("Network error"),
      );

      await expect(generateImageWithGemini({ prompt: "test", tier: "1K" }))
        .rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initiate Gemini API stream:"),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle non-Error exceptions during API initialization", async () => {
      mockGenerateContentStream.mockRejectedValueOnce("String rejection");

      await expect(generateImageWithGemini({ prompt: "test", tier: "1K" }))
        .rejects.toThrow(
          "Failed to start image generation: Unknown error",
        );
    });
  });

  describe("timeout handling", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
      resetGeminiClient();
      process.env.GEMINI_API_KEY = "test-api-key";
      vi.useFakeTimers();
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
      vi.useRealTimers();
    });

    it("should clear timeout on successful completion", async () => {
      vi.useRealTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const imageBase64 = Buffer.from("success").toString("base64");

      async function* fastStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(fastStream());

      const result = await generateImageWithGemini({
        prompt: "test",
        tier: "1K",
      });

      expect(result.toString()).toBe("success");
      // clearTimeout should have been called to clean up the timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("should clear timeout on error during processing", async () => {
      vi.useRealTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      async function* errorStream() {
        throw new Error("Network error");
      }

      mockGenerateContentStream.mockResolvedValueOnce(errorStream());

      await expect(generateImageWithGemini({ prompt: "test", tier: "1K" }))
        .rejects.toThrow();

      // clearTimeout should have been called even on error
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("should have timeout constant configured correctly", () => {
      // Verify the timeout is set to 5 minutes (300 seconds)
      expect(GEMINI_TIMEOUT_MS).toBe(5 * 60 * 1000);
      expect(GEMINI_TIMEOUT_MS).toBe(300000);
    });

    it("should timeout and reject for enhanceImageWithGemini when stream takes too long", async () => {
      // Create a slow stream that never completes
      const slowStreamIterator = {
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise(() => {}), // Never resolves
        }),
      };

      mockGenerateContentStream.mockResolvedValueOnce(slowStreamIterator);

      const promise = enhanceImageWithGemini({
        imageData: "base64data",
        mimeType: "image/jpeg",
        tier: "1K",
      });

      // Attach a catch handler immediately to prevent unhandled rejection warning
      // The actual assertion will happen below
      let caughtError: Error | null = null;
      promise.catch((e) => {
        caughtError = e;
      });

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS + 1000);

      // Give the microtask queue a chance to process
      await vi.runAllTimersAsync();

      // Verify the error was thrown
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toMatch(
        /Gemini API request timed out after \d+ seconds/,
      );
    });

    it("should timeout and reject for generateImageWithGemini when stream takes too long", async () => {
      // Create a slow stream that never completes
      const slowStreamIterator = {
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise(() => {}), // Never resolves
        }),
      };

      mockGenerateContentStream.mockResolvedValueOnce(slowStreamIterator);

      const promise = generateImageWithGemini({
        prompt: "A sunset",
        tier: "1K",
      });

      // Attach a catch handler immediately to prevent unhandled rejection warning
      let caughtError: Error | null = null;
      promise.catch((e) => {
        caughtError = e;
      });

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS + 1000);

      // Give the microtask queue a chance to process
      await vi.runAllTimersAsync();

      // Verify the error was thrown
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toMatch(
        /Gemini API request timed out after \d+ seconds/,
      );
    });

    it("should timeout and reject for modifyImageWithGemini when stream takes too long", async () => {
      // Create a slow stream that never completes
      const slowStreamIterator = {
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise(() => {}), // Never resolves
        }),
      };

      mockGenerateContentStream.mockResolvedValueOnce(slowStreamIterator);

      const promise = modifyImageWithGemini({
        prompt: "Make it blue",
        imageData: "base64data",
        mimeType: "image/jpeg",
        tier: "1K",
      });

      // Attach a catch handler immediately to prevent unhandled rejection warning
      let caughtError: Error | null = null;
      promise.catch((e) => {
        caughtError = e;
      });

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS + 1000);

      // Give the microtask queue a chance to process
      await vi.runAllTimersAsync();

      // Verify the error was thrown
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toMatch(
        /Gemini API request timed out after \d+ seconds/,
      );
    });
  });

  describe("DEFAULT_MODEL export", () => {
    it("should export the premium model as default", () => {
      // DEFAULT_MODEL is always the premium model
      // Tier-based selection is done via getModelForTier()
      expect(DEFAULT_MODEL).toBe("gemini-3-pro-image-preview");
    });
  });

  describe("error logging in processGeminiStream", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      MockGoogleGenAI.mock.instances = [];
      resetGeminiClient();
      process.env.GEMINI_API_KEY = "test-api-key";
    });

    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClient();
    });

    it("should log error details when stream processing fails at specific chunk", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      const imageBase64 = Buffer.from("valid").toString("base64");

      // Yield one valid chunk, then throw error
      async function* errorAfterChunkStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
        throw new Error("Chunk processing failed midway");
      }

      mockGenerateContentStream.mockResolvedValueOnce(errorAfterChunkStream());

      await expect(generateImageWithGemini({ prompt: "test", tier: "1K" }))
        .rejects.toThrow(
          "Stream processing failed: Chunk processing failed midway",
        );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error processing stream at chunk \d+:/),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should log received chunk details including bytes and elapsed time", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const imageBase64 = Buffer.from("test-data-chunk").toString("base64");

      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: imageBase64 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(mockStream());

      await modifyImageWithGemini({
        prompt: "test",
        imageData: "data",
        mimeType: "image/png",
        tier: "2K",
      });

      // Verify the chunk receipt log contains bytes and elapsed time info
      const chunkLog = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("Received chunk"),
      );

      expect(chunkLog).toBeDefined();
      expect(chunkLog![0]).toMatch(
        /Received chunk \d+: \d+ bytes \(total: \d+ chunks, \d+s elapsed\)/,
      );

      consoleSpy.mockRestore();
    });

    it("should log success summary with total bytes and time", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const chunk1 = Buffer.from("chunk-one").toString("base64");
      const chunk2 = Buffer.from("chunk-two").toString("base64");

      async function* multiChunkStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk1 } }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: chunk2 } }],
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValueOnce(multiChunkStream());

      await generateImageWithGemini({ prompt: "test", tier: "1K" });

      // Verify success log
      const successLog = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("Successfully received"),
      );

      expect(successLog).toBeDefined();
      expect(successLog![0]).toMatch(
        /Successfully received 2 chunks, total \d+ bytes in \d+s/,
      );

      consoleSpy.mockRestore();
    });
  });

  describe("model validation", () => {
    it("should export VALID_GEMINI_MODELS with expected models", () => {
      expect(VALID_GEMINI_MODELS).toContain("gemini-3-pro-image-preview");
      expect(VALID_GEMINI_MODELS).toContain("gemini-2.5-flash-image");
    });

    it("should NOT include the broken production model in allowlist", () => {
      // This test ensures the invalid model that caused the production error
      // is NOT in the allowlist. If this test fails, someone added a broken model.
      expect(VALID_GEMINI_MODELS).not.toContain(
        "gemini-2.0-flash-preview-image-generation",
      );
    });
  });

  describe("getModelForTier", () => {
    it("should return nano model for FREE tier", () => {
      expect(getModelForTier("FREE")).toBe("gemini-2.5-flash-image");
    });

    it("should return premium model for TIER_1K", () => {
      expect(getModelForTier("TIER_1K")).toBe("gemini-3-pro-image-preview");
    });

    it("should return premium model for TIER_2K", () => {
      expect(getModelForTier("TIER_2K")).toBe("gemini-3-pro-image-preview");
    });

    it("should return premium model for TIER_4K", () => {
      expect(getModelForTier("TIER_4K")).toBe("gemini-3-pro-image-preview");
    });
  });
});
