import { tryCatch } from "@/lib/try-catch";
import { GoogleGenAI } from "@google/genai";
import type { AspectRatio } from "./aspect-ratio";
import type { AnalysisConfig, PromptConfig } from "./pipeline-types";

/**
 * Known valid Gemini models for image generation.
 * This allowlist prevents runtime errors from invalid model names.
 */
export const VALID_GEMINI_MODELS = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
] as const;

/**
 * Model mapping by enhancement tier.
 * - FREE: Uses nano model (gemini-2.5-flash-image) for free tier
 * - TIER_1K/2K/4K: Uses premium model (gemini-3-pro-image-preview)
 */
const TIER_MODELS = {
  FREE: "gemini-2.5-flash-image", // Nano model (free tier)
  TIER_1K: "gemini-3-pro-image-preview", // Premium model
  TIER_2K: "gemini-3-pro-image-preview", // Premium model
  TIER_4K: "gemini-3-pro-image-preview", // Premium model
} as const;

type TierModelKey = keyof typeof TIER_MODELS;

/**
 * Get the appropriate model for a given enhancement tier.
 * @param tier - The enhancement tier
 * @returns The Gemini model name to use
 */
export function getModelForTier(tier: TierModelKey): string {
  return TIER_MODELS[tier];
}

/**
 * Default model for backward compatibility.
 * Uses premium model (gemini-3-pro-image-preview) as default.
 */
export const DEFAULT_MODEL = "gemini-3-pro-image-preview";
export const DEFAULT_TEMPERATURE: number | null = null; // Uses Gemini API defaults

/**
 * Check if a model supports the imageSize parameter.
 * Only gemini-3-pro-image-preview supports imageSize.
 * gemini-2.5-flash-image always outputs 1024px and doesn't accept imageSize.
 */
function supportsImageSize(model: string): boolean {
  return model === "gemini-3-pro-image-preview";
}

// Timeout for Gemini API requests (configurable via env, default 5 minutes)
// 4K images can take up to 2 minutes based on observed successful jobs,
// so 5 minutes provides a safe buffer while preventing indefinite hangs
export const GEMINI_TIMEOUT_MS = parseInt(
  process.env.GEMINI_TIMEOUT_MS || String(5 * 60 * 1000),
  10,
);

// Timeout for vision analysis stage (configurable via env, default 30 seconds)
// Analysis should be fast - if it times out, we fall back to default prompt
const ANALYSIS_TIMEOUT_MS = parseInt(
  process.env.ANALYSIS_TIMEOUT_MS || String(30 * 1000),
  10,
);

// Analysis prompt schema for structured JSON output from vision model
const ANALYSIS_PROMPT_SCHEMA =
  `Analyze this image and provide a JSON object describing its content, technical flaws, and potential cropping needs.
The JSON MUST strictly adhere to this structure, with no additional text before or after:
{
    "mainSubject": "brief description of image content",
    "imageStyle": "photograph" OR "sketch" OR "painting" OR "screenshot" OR "other",
    "defects": {
      "isDark": boolean (true if severely underexposed/pitch black),
      "isBlurry": boolean (true if significant motion or focus blur),
      "hasNoise": boolean (true if grainy or high ISO noise),
      "hasVHSArtifacts": boolean (true if tracking lines, tape distortion, color bleed),
      "isLowResolution": boolean (true if pixelated),
      "isOverexposed": boolean (true if blown-out highlights),
      "hasColorCast": boolean (true if unnatural tint),
      "colorCastType": "yellow" OR "blue" OR "green" OR "red" OR "magenta" OR "cyan" (null if no cast)
    },
    "lightingCondition": "e.g., pitch black, dim indoors, sunny, harsh flash",
    "cropping": {
      "isCroppingNeeded": boolean (true if there are black bars, UI elements, or excessive empty space),
      "suggestedCrop": { "x": number, "y": number, "width": number, "height": number } (percentages 0.0-1.0, null if no crop),
      "cropReason": "reason for crop" (null if no crop needed)
    }
}`;

let genAI: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenAI({
      apiKey,
    });
  }
  return genAI;
}

/**
 * Resets the Gemini client instance. Used for testing purposes.
 * @internal
 */
export function resetGeminiClient(): void {
  genAI = null;
}

interface ImageAnalysisResult {
  description: string;
  quality: "low" | "medium" | "high";
  suggestedImprovements: string[];
  enhancementPrompt: string;
}

// New types for dynamic two-stage AI pipeline

/**
 * Crop dimensions as percentages (0.0-1.0) of the original image dimensions.
 * Used by the vision model to suggest cropping areas.
 */
export interface CropDimensions {
  x: number; // Left edge as percentage (0.0-1.0)
  y: number; // Top edge as percentage (0.0-1.0)
  width: number; // Width as percentage (0.0-1.0)
  height: number; // Height as percentage (0.0-1.0)
}

/**
 * Pixel-based crop region used for Sharp image processing.
 * Converted from CropDimensions percentages.
 */
export interface CropRegionPixels {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Detailed analysis result from vision model.
 * Provides structured information about image characteristics and defects.
 */
export interface AnalysisDetailedResult {
  /** Brief description of the main subject in the image */
  mainSubject: string;
  /** Detected style/type of the image */
  imageStyle: "photograph" | "sketch" | "painting" | "screenshot" | "other";
  /** Detected defects that need correction */
  defects: {
    /** True if severely underexposed (pitch dark) */
    isDark: boolean;
    /** True if image has motion blur or is out of focus */
    isBlurry: boolean;
    /** True if image has visible ISO/sensor noise or grain */
    hasNoise: boolean;
    /** True if image has VHS tracking lines, color bleed, or analog artifacts */
    hasVHSArtifacts: boolean;
    /** True if image is pixelated or low detail */
    isLowResolution: boolean;
    /** True if image has blown-out highlights */
    isOverexposed: boolean;
    /** True if image has unnatural color tint */
    hasColorCast: boolean;
    /** Type of color cast if hasColorCast is true */
    colorCastType?: "yellow" | "blue" | "green" | "red" | "magenta" | "cyan";
  };
  /** Description of lighting conditions (e.g., "pitch black", "dim indoors", "sunny") */
  lightingCondition: string;
  /** Cropping analysis */
  cropping: {
    /** True if image has black bars, UI elements, or excessive empty space */
    isCroppingNeeded: boolean;
    /** Suggested crop dimensions as percentages (0.0-1.0) */
    suggestedCrop?: CropDimensions;
    /** Reason for suggested cropping */
    cropReason?: string;
  };
}

/**
 * Extended ImageAnalysisResult with structured analysis from vision model.
 */
export interface ImageAnalysisResultV2 {
  description: string;
  quality: "low" | "medium" | "high";
  structuredAnalysis: AnalysisDetailedResult;
}

/**
 * Reference image data for style guidance
 */
export interface ReferenceImageData {
  /** Base64 encoded image data */
  imageData: string;
  /** MIME type of the image */
  mimeType: string;
  /** Optional description of the reference */
  description?: string;
}

export interface EnhanceImageParams {
  imageData: string;
  mimeType: string;
  tier: "1K" | "2K" | "4K";
  originalWidth?: number;
  originalHeight?: number;
  /** Optional prompt override - when provided, skips internal analysis and uses this prompt directly */
  promptOverride?: string;
  /** Optional reference images for style guidance - base64 encoded with mime types */
  referenceImages?: ReferenceImageData[];
  /** Optional model override - when provided, uses this model instead of DEFAULT_MODEL */
  model?: string;
}

/**
 * Builds a dynamic enhancement prompt based on detected image characteristics.
 * Handles extreme cases like VHS artifacts, sketches, and pitch-dark photos.
 *
 * @param analysis - Structured analysis result from vision model
 * @param promptConfig - Optional prompt configuration for overrides
 * @returns Dynamic enhancement prompt tailored to the image's specific defects
 */
export function buildDynamicEnhancementPrompt(
  analysis: AnalysisDetailedResult,
  promptConfig?: PromptConfig,
): string {
  // Apply defect overrides if provided
  const defects = promptConfig?.defectOverrides
    ? { ...analysis.defects, ...promptConfig.defectOverrides }
    : analysis.defects;

  // Track which corrections to skip
  const skipCorrections = new Set(promptConfig?.skipCorrections || []);

  let instruction =
    `You are a professional image restoration AI. Transform this input image into a stunning, high-resolution, professional photograph taken with a modern camera in ideal lighting conditions. Maintain the original subject and composition perfectly.\n\nSpecific Correction Instructions:\n`;

  // Style Conversion (sketches/paintings to photorealistic)
  if (analysis.imageStyle === "sketch") {
    instruction +=
      `- Convert this sketch into a photorealistic image while preserving the composition and subject. Add realistic textures, lighting, and colors.\n`;
  } else if (analysis.imageStyle === "painting") {
    instruction +=
      `- Convert this painting into a photorealistic photograph while maintaining the composition. Replace painted textures with realistic details and natural lighting.\n`;
  } else if (analysis.imageStyle === "screenshot") {
    instruction +=
      `- Clean up this screenshot and enhance it to photographic quality. Remove any UI elements or compression artifacts.\n`;
  }

  // Lighting & Exposure
  if (
    !skipCorrections.has("isDark") &&
    (defects.isDark || analysis.lightingCondition.includes("pitch black"))
  ) {
    instruction +=
      `- Dramatically relight the scene. Reveal details hidden in shadows as if illuminated by strong, natural light (e.g., bright moonlight or professional studio lighting) while maintaining a realistic atmosphere.\n`;
  } else if (!skipCorrections.has("isOverexposed") && defects.isOverexposed) {
    instruction +=
      `- Recover details in blown-out highlight areas. Restore natural texture and color to bright spots.\n`;
  }

  // VHS/Analog Artifacts
  if (!skipCorrections.has("hasVHSArtifacts") && defects.hasVHSArtifacts) {
    instruction +=
      `- Completely remove all analog video artifacts, including tracking lines, color bleeding, static noise, and tape distortion.\n`;
  }

  // Noise & Resolution
  if (
    !skipCorrections.has("hasNoise") &&
    !skipCorrections.has("isLowResolution") &&
    (defects.hasNoise || defects.isLowResolution)
  ) {
    instruction +=
      `- Apply advanced noise reduction to eliminate grain. Sharpen fine details and textures that are currently pixelated or blurry.\n`;
  }

  // Color Correction
  if (
    !skipCorrections.has("hasColorCast") && defects.hasColorCast &&
    defects.colorCastType
  ) {
    instruction +=
      `- Neutralize the strong ${defects.colorCastType} color cast to restore natural, accurate colors.\n`;
  }

  // Focus/Blur
  if (!skipCorrections.has("isBlurry") && defects.isBlurry) {
    instruction += `- Bring the entire image into sharp, crisp focus.\n`;
  }

  // Add custom instructions if provided
  if (promptConfig?.customInstructions) {
    instruction += `\nAdditional Instructions:\n${promptConfig.customInstructions}\n`;
  }

  // Add reference image instructions if provided
  if (
    promptConfig?.referenceImages && promptConfig.referenceImages.length > 0
  ) {
    instruction += `\nStyle Reference:\n`;
    instruction +=
      `- Match the visual style, color grading, and overall aesthetic of the provided reference image${
        promptConfig.referenceImages.length > 1 ? "s" : ""
      }.\n`;

    // Add descriptions if available
    const descriptionsWithContent = promptConfig.referenceImages
      .filter((img) => img.description)
      .map((img) => img.description);

    if (descriptionsWithContent.length > 0) {
      instruction += `- Reference image notes: ${descriptionsWithContent.join("; ")}\n`;
    }
  }

  // Final instruction
  instruction +=
    `\nFinal Output Requirement: A clean, sharp, highly detailed professional photograph.`;

  return instruction;
}

/**
 * Builds a prompt for blending two images together creatively.
 * Used when sourceImageId is provided for image-to-image enhancement.
 *
 * @param targetAnalysis - Structured analysis result from vision model for the target image
 * @returns Enhancement prompt tailored for blending two images
 */
export function buildBlendEnhancementPrompt(
  targetAnalysis: AnalysisDetailedResult,
): string {
  let instruction = `You are a professional image artist specializing in creative image blending.
You have been given TWO images:
1. The TARGET image (the main image to enhance)
2. The SOURCE image (a reference image to blend elements from)

Your task is to creatively merge visual elements, styles, or subjects from the SOURCE image into the TARGET image while maintaining a cohesive, professional result.

Guidelines:
- Preserve the core composition and subject of the TARGET image
- Incorporate artistic elements, color palette, or stylistic qualities from the SOURCE image
- The result should look like a natural, professional photograph
- Blend seamlessly without obvious artificial transitions
`;

  // Add target image defect corrections if any
  const defects = targetAnalysis.defects;
  if (defects.isDark) {
    instruction += `- The target image is dark - ensure proper lighting in the blended result\n`;
  }
  if (defects.hasNoise) {
    instruction += `- Remove any noise or grain from the final result\n`;
  }
  if (defects.isBlurry) {
    instruction += `- Ensure the final result is sharp and in focus\n`;
  }
  if (defects.isOverexposed) {
    instruction += `- Balance exposure in the final result\n`;
  }
  if (defects.hasColorCast && defects.colorCastType) {
    instruction += `- Correct the ${defects.colorCastType} color cast in the final result\n`;
  }

  instruction += `
Final Output: A stunning, high-quality photograph that artistically blends both images into a cohesive masterpiece.`;

  return instruction;
}

/**
 * Returns default analysis result for fallback scenarios.
 * Used when vision model analysis fails or times out.
 * @internal
 */
function getDefaultAnalysis(): AnalysisDetailedResult {
  return {
    mainSubject: "General image",
    imageStyle: "photograph",
    defects: {
      isDark: false,
      isBlurry: false,
      hasNoise: false,
      hasVHSArtifacts: false,
      isLowResolution: true, // Assume low res since we're enhancing
      isOverexposed: false,
      hasColorCast: false,
    },
    lightingCondition: "unknown",
    cropping: {
      isCroppingNeeded: false,
    },
  };
}

/**
 * Validates the imageStyle field from analysis response.
 * @internal
 */
function validateImageStyle(
  style: unknown,
): AnalysisDetailedResult["imageStyle"] {
  const validStyles = [
    "photograph",
    "sketch",
    "painting",
    "screenshot",
    "other",
  ];
  if (typeof style === "string" && validStyles.includes(style)) {
    return style as AnalysisDetailedResult["imageStyle"];
  }
  return "photograph";
}

/**
 * Validates the colorCastType field from analysis response.
 * @internal
 */
function validateColorCastType(
  type: unknown,
): AnalysisDetailedResult["defects"]["colorCastType"] {
  const validTypes = ["yellow", "blue", "green", "red", "magenta", "cyan"];
  if (typeof type === "string" && validTypes.includes(type)) {
    return type as AnalysisDetailedResult["defects"]["colorCastType"];
  }
  return undefined;
}

/**
 * Parses the analysis response, handling potential markdown code blocks.
 * @internal
 */
function parseAnalysisResponse(text: string): AnalysisDetailedResult {
  // Remove markdown code blocks if present
  let jsonText = text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  const parsed = JSON.parse(jsonText);

  // Validate and sanitize the parsed response
  return {
    mainSubject: String(parsed.mainSubject || "Unknown subject"),
    imageStyle: validateImageStyle(parsed.imageStyle),
    defects: {
      isDark: Boolean(parsed.defects?.isDark),
      isBlurry: Boolean(parsed.defects?.isBlurry),
      hasNoise: Boolean(parsed.defects?.hasNoise),
      hasVHSArtifacts: Boolean(parsed.defects?.hasVHSArtifacts),
      isLowResolution: Boolean(parsed.defects?.isLowResolution),
      isOverexposed: Boolean(parsed.defects?.isOverexposed),
      hasColorCast: Boolean(parsed.defects?.hasColorCast),
      colorCastType: validateColorCastType(parsed.defects?.colorCastType),
    },
    lightingCondition: String(parsed.lightingCondition || "unknown"),
    cropping: {
      isCroppingNeeded: Boolean(parsed.cropping?.isCroppingNeeded),
      suggestedCrop: parsed.cropping?.suggestedCrop
        ? {
          x: Number(parsed.cropping.suggestedCrop.x) || 0,
          y: Number(parsed.cropping.suggestedCrop.y) || 0,
          width: Number(parsed.cropping.suggestedCrop.width) || 1,
          height: Number(parsed.cropping.suggestedCrop.height) || 1,
        }
        : undefined,
      cropReason: parsed.cropping?.cropReason
        ? String(parsed.cropping.cropReason)
        : undefined,
    },
  };
}

/**
 * Performs actual vision analysis using Gemini model.
 * @internal
 */
async function performVisionAnalysis(
  ai: GoogleGenAI,
  imageData: string,
  mimeType: string,
  modelOverride?: string,
  temperatureOverride?: number,
): Promise<AnalysisDetailedResult> {
  const model = modelOverride || DEFAULT_MODEL;
  const temperature = temperatureOverride ?? 0.1; // Low temperature for deterministic JSON output

  const response = await ai.models.generateContent({
    model,
    config: {
      responseMimeType: "application/json",
      temperature,
    },
    contents: [{
      role: "user" as const,
      parts: [
        { text: ANALYSIS_PROMPT_SCHEMA },
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
      ],
    }],
  });

  // Extract text response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No analysis response from vision model");
  }

  return parseAnalysisResponse(text);
}

/**
 * Analyzes an image using Gemini vision model to detect defects and content type.
 * Used by the orchestrator to build dynamic enhancement prompts.
 *
 * @param imageData - Base64 encoded image data
 * @param mimeType - MIME type of the image
 * @param config - Optional analysis configuration overrides
 * @returns Structured analysis result with defects, style, and cropping suggestions
 */
export async function analyzeImageV2(
  imageData: string,
  mimeType: string,
  config?: AnalysisConfig,
): Promise<ImageAnalysisResultV2> {
  // If analysis is disabled via config, return default analysis immediately
  if (config?.enabled === false) {
    console.log("Image analysis disabled by pipeline config, using defaults");
    return {
      description: "Analysis skipped",
      quality: "medium",
      structuredAnalysis: getDefaultAnalysis(),
    };
  }

  console.log(
    `Analyzing image with vision model (format: ${mimeType}, data length: ${imageData.length} chars)`,
  );

  const ai = getGeminiClient();
  let structuredAnalysis: AnalysisDetailedResult;

  // Create analysis promise with timeout protection
  const analysisPromise = performVisionAnalysis(
    ai,
    imageData,
    mimeType,
    config?.model,
    config?.temperature,
  );
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(`Analysis timed out after ${ANALYSIS_TIMEOUT_MS / 1000}s`),
      );
    }, ANALYSIS_TIMEOUT_MS);
  });

  const { data: analysisResult, error: analysisError } = await tryCatch(
    Promise.race([analysisPromise, timeoutPromise]),
  );

  if (analysisError) {
    console.warn(
      "Vision analysis failed, using fallback:",
      analysisError instanceof Error
        ? analysisError.message
        : String(analysisError),
    );
    structuredAnalysis = getDefaultAnalysis();
  } else {
    structuredAnalysis = analysisResult;
    console.log(
      "Vision analysis successful:",
      JSON.stringify(structuredAnalysis.defects),
    );
  }

  // Determine quality based on defect count
  const defectCount = Object.values(structuredAnalysis.defects)
    .filter((v) => v === true).length;
  const quality: "low" | "medium" | "high" = defectCount >= 3
    ? "low"
    : defectCount >= 1
    ? "medium"
    : "high";

  return {
    description: structuredAnalysis.mainSubject,
    quality,
    structuredAnalysis,
  };
}

/**
 * Backward-compatible analyzeImage function.
 * Wraps analyzeImageV2 and returns the legacy ImageAnalysisResult format.
 *
 * @deprecated Use analyzeImageV2 for new code - it returns structured analysis
 * @param imageData - Base64 encoded image data
 * @param mimeType - MIME type of the image
 * @returns Legacy analysis result format for backward compatibility
 */
export async function analyzeImage(
  imageData: string,
  mimeType: string,
): Promise<ImageAnalysisResult> {
  const v2Result = await analyzeImageV2(imageData, mimeType);

  // Build suggested improvements from detected defects
  const suggestedImprovements: string[] = [];
  const defects = v2Result.structuredAnalysis.defects;

  if (v2Result.structuredAnalysis.imageStyle !== "photograph") {
    suggestedImprovements.push("photorealistic conversion");
  }
  if (defects.isDark) suggestedImprovements.push("exposure correction");
  if (defects.isOverexposed) suggestedImprovements.push("highlight recovery");
  if (defects.isBlurry) suggestedImprovements.push("sharpening");
  if (defects.hasNoise) suggestedImprovements.push("noise reduction");
  if (defects.hasVHSArtifacts) suggestedImprovements.push("artifact removal");
  if (defects.isLowResolution) {
    suggestedImprovements.push("resolution enhancement");
  }
  if (defects.hasColorCast) suggestedImprovements.push("color correction");

  // Always add standard improvements
  suggestedImprovements.push("color optimization", "detail enhancement");

  // Build enhancement prompt using dynamic prompt builder
  const enhancementPrompt = buildDynamicEnhancementPrompt(
    v2Result.structuredAnalysis,
  );

  return {
    description: v2Result.description,
    quality: v2Result.quality,
    suggestedImprovements,
    enhancementPrompt,
  };
}

// Stream processing types and unified helper function

/**
 * Configuration for the unified Gemini stream processor.
 * Used by all image generation/enhancement/modification functions.
 */
interface GeminiStreamConfig {
  responseModalities: string[];
  imageConfig?: { imageSize?: string; aspectRatio?: string; };
}

/**
 * Content structure for Gemini API requests.
 */
interface GeminiContent {
  role: "user";
  parts: Array<
    { text?: string; inlineData?: { mimeType: string; data: string; }; }
  >;
}

/**
 * Options for the unified stream processor.
 */
interface StreamProcessorOptions {
  /** GoogleGenAI client instance */
  ai: GoogleGenAI;
  /** Model to use for generation */
  model: string;
  /** API configuration */
  config: GeminiStreamConfig;
  /** Content to send to the API */
  contents: GeminiContent[];
  /** Timeout in milliseconds (defaults to GEMINI_TIMEOUT_MS) */
  timeoutMs?: number;
  /** Type of operation for error messages */
  operationType?: "enhancement" | "generation" | "modification";
}

/**
 * Unified helper function to process Gemini streaming response with timeout.
 * Consolidates duplicate stream processing logic from enhanceImageWithGemini,
 * generateImageWithGemini, and modifyImageWithGemini.
 *
 * @param options - Stream processor options including AI client, model, config, and contents
 * @returns Buffer containing the image data from the stream
 * @throws Error if stream initialization fails, times out, or no image data is received
 */
async function processGeminiStream(
  options: StreamProcessorOptions,
): Promise<Buffer> {
  const {
    ai,
    model,
    config,
    contents,
    timeoutMs = GEMINI_TIMEOUT_MS,
    operationType = "generation",
  } = options;

  // Map operation type to error message prefix
  const errorPrefixMap = {
    enhancement: "Failed to start image enhancement",
    generation: "Failed to start image generation",
    modification: "Failed to start image modification",
  };

  const { data: response, error: streamInitError } = await tryCatch(
    ai.models.generateContentStream({
      model,
      config,
      contents,
    }),
  );

  if (streamInitError) {
    console.error("Failed to initiate Gemini API stream:", streamInitError);
    throw new Error(
      `${errorPrefixMap[operationType]}: ${
        streamInitError instanceof Error
          ? streamInitError.message
          : "Unknown error"
      }`,
    );
  }

  const imageChunks: Buffer[] = [];
  let chunkCount = 0;
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const startTime = Date.now();

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(
        new Error(
          `Gemini API request timed out after ${timeoutMs / 1000} seconds. ` +
            `Processed ${chunkCount} chunks before timeout.`,
        ),
      );
    }, timeoutMs);
  });

  const processChunks = async (): Promise<Buffer> => {
    const processAllChunks = async () => {
      for await (const chunk of response) {
        if (timedOut) {
          throw new Error("Stream processing aborted due to timeout");
        }

        chunkCount++;
        const elapsed = Math.round((Date.now() - startTime) / 1000);

        if (
          !chunk.candidates ||
          !chunk.candidates[0]?.content ||
          !chunk.candidates[0]?.content.parts
        ) {
          console.log(
            `Skipping chunk ${chunkCount}: no valid candidates (${elapsed}s elapsed)`,
          );
          continue;
        }

        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          const buffer = Buffer.from(inlineData.data || "", "base64");
          imageChunks.push(buffer);
          console.log(
            `Received chunk ${chunkCount}: ${buffer.length} bytes (total: ${imageChunks.length} chunks, ${elapsed}s elapsed)`,
          );
        }
      }
    };

    const { error: chunkError } = await tryCatch(processAllChunks());

    if (chunkError) {
      if (timedOut) {
        throw chunkError;
      }
      console.error(
        `Error processing stream at chunk ${chunkCount}:`,
        chunkError,
      );
      throw new Error(
        `Stream processing failed: ${
          chunkError instanceof Error ? chunkError.message : "Unknown error"
        }`,
      );
    }

    if (imageChunks.length === 0) {
      console.error(
        `No image data received after processing ${chunkCount} chunks`,
      );
      throw new Error("No image data received from Gemini API");
    }

    const totalBytes = imageChunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `Successfully received ${imageChunks.length} chunks, total ${totalBytes} bytes in ${totalTime}s`,
    );

    return Buffer.concat(imageChunks);
  };

  const { data: result, error: raceError } = await tryCatch(
    Promise.race([processChunks(), timeoutPromise]),
  );

  if (timeoutId) clearTimeout(timeoutId);

  if (raceError) {
    throw raceError;
  }

  return result;
}

/**
 * Enhances an image using Gemini's image generation API.
 *
 * @param params - Enhancement parameters including image data, MIME type, and tier
 * @returns Buffer containing the enhanced image data
 * @throws Error if API times out, no API key is configured, or no image data is received
 */
export async function enhanceImageWithGemini(
  params: EnhanceImageParams,
): Promise<Buffer> {
  const ai = getGeminiClient();

  // Use promptOverride if provided, otherwise run analysis to generate prompt
  let enhancementPrompt: string;
  if (params.promptOverride) {
    enhancementPrompt = params.promptOverride;
    console.log("Using provided prompt override (skipping analysis)");
  } else {
    const analysis = await analyzeImage(params.imageData, params.mimeType);
    enhancementPrompt = analysis.enhancementPrompt;
    console.log("Using dynamically generated enhancement prompt");
  }

  const resolutionMap = {
    "1K": "1024x1024",
    "2K": "2048x2048",
    "4K": "4096x4096",
  };

  // Use model from params if provided, otherwise use default
  const modelToUse = params.model || DEFAULT_MODEL;

  // Build config based on model capabilities
  // gemini-2.5-flash-image doesn't support imageSize (always 1024px)
  // gemini-3-pro-image-preview supports imageSize
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
    ...(supportsImageSize(modelToUse) && {
      imageConfig: {
        imageSize: params.tier,
      },
    }),
  };

  // Build content parts - include reference images if provided
  const parts: Array<
    { text?: string; inlineData?: { mimeType: string; data: string; }; }
  > = [];

  // Add the original image to enhance first
  parts.push({
    inlineData: {
      mimeType: params.mimeType,
      data: params.imageData,
    },
  });

  // Add reference images if provided (for style guidance)
  if (params.referenceImages && params.referenceImages.length > 0) {
    console.log(
      `Including ${params.referenceImages.length} reference image(s) for style guidance`,
    );
    for (const refImg of params.referenceImages) {
      parts.push({
        inlineData: {
          mimeType: refImg.mimeType,
          data: refImg.imageData,
        },
      });
    }
  }

  // Add the text prompt
  parts.push({
    text: `${enhancementPrompt}\n\nGenerate at ${resolutionMap[params.tier]} resolution.`,
  });

  const contents = [
    {
      role: "user" as const,
      parts,
    },
  ];

  console.log(
    `Generating enhanced image with Gemini API using model: ${modelToUse}`,
  );
  console.log(
    `Tier: ${params.tier}, Resolution: ${resolutionMap[params.tier]}`,
  );
  console.log(`Timeout: ${GEMINI_TIMEOUT_MS / 1000}s`);

  return processGeminiStream({
    ai,
    model: modelToUse,
    config,
    contents,
    operationType: "enhancement",
  });
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// MCP Generation types and functions

export interface GenerateImageParams {
  prompt: string;
  tier: "1K" | "2K" | "4K";
  negativePrompt?: string;
  /** Optional aspect ratio for the generated image (default: 1:1) */
  aspectRatio?: AspectRatio;
}

export interface ModifyImageParams {
  prompt: string;
  imageData: string;
  mimeType: string;
  tier: "1K" | "2K" | "4K";
  /** Optional aspect ratio - auto-detected from input image if not provided */
  aspectRatio?: AspectRatio;
}

const GENERATION_BASE_PROMPT =
  `You are a professional photographer creating high-quality images. Generate the following image with perfect composition, lighting, and detail. Make it look like a professional photograph taken with a modern camera in 2025.`;

const MODIFICATION_BASE_PROMPT =
  `Modify this image according to the following instructions while maintaining high quality, proper lighting, and professional appearance.`;

/**
 * Generates a new image from a text prompt using Gemini's image generation API.
 *
 * @param params - Generation parameters including prompt and tier
 * @returns Buffer containing the generated image data
 * @throws Error if API times out, no API key is configured, or no image data is received
 */
export async function generateImageWithGemini(
  params: GenerateImageParams,
): Promise<Buffer> {
  const ai = getGeminiClient();

  const resolutionMap = {
    "1K": "1024x1024",
    "2K": "2048x2048",
    "4K": "4096x4096",
  };

  // Build config based on model capabilities
  // DEFAULT_MODEL (gemini-3-pro-image-preview) supports imageSize
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
    ...(supportsImageSize(DEFAULT_MODEL) && {
      imageConfig: {
        imageSize: params.tier,
        ...(params.aspectRatio && { aspectRatio: params.aspectRatio }),
      },
    }),
    ...(!supportsImageSize(DEFAULT_MODEL) && params.aspectRatio && {
      imageConfig: {
        aspectRatio: params.aspectRatio,
      },
    }),
  };

  let fullPrompt =
    `${GENERATION_BASE_PROMPT}\n\nImage to generate: ${params.prompt}\n\nGenerate at ${
      resolutionMap[params.tier]
    } resolution.`;

  if (params.negativePrompt) {
    fullPrompt += `\n\nAvoid: ${params.negativePrompt}`;
  }

  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          text: fullPrompt,
        },
      ],
    },
  ];

  console.log(`Generating image with Gemini API using model: ${DEFAULT_MODEL}`);
  console.log(
    `Tier: ${params.tier}, Resolution: ${resolutionMap[params.tier]}, Aspect Ratio: ${
      params.aspectRatio || "1:1 (default)"
    }`,
  );
  console.log(`Prompt: ${params.prompt.substring(0, 100)}...`);
  console.log(`Timeout: ${GEMINI_TIMEOUT_MS / 1000}s`);

  return processGeminiStream({
    ai,
    model: DEFAULT_MODEL,
    config,
    contents,
    operationType: "generation",
  });
}

/**
 * Modifies an existing image based on a text prompt using Gemini's image generation API.
 *
 * @param params - Modification parameters including prompt, image data, and tier
 * @returns Buffer containing the modified image data
 * @throws Error if API times out, no API key is configured, or no image data is received
 */
export async function modifyImageWithGemini(
  params: ModifyImageParams,
): Promise<Buffer> {
  const ai = getGeminiClient();

  const resolutionMap = {
    "1K": "1024x1024",
    "2K": "2048x2048",
    "4K": "4096x4096",
  };

  // Build config based on model capabilities
  // DEFAULT_MODEL (gemini-3-pro-image-preview) supports imageSize
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
    ...(supportsImageSize(DEFAULT_MODEL) && {
      imageConfig: {
        imageSize: params.tier,
        ...(params.aspectRatio && { aspectRatio: params.aspectRatio }),
      },
    }),
    ...(!supportsImageSize(DEFAULT_MODEL) && params.aspectRatio && {
      imageConfig: {
        aspectRatio: params.aspectRatio,
      },
    }),
  };

  const fullPrompt =
    `${MODIFICATION_BASE_PROMPT}\n\nModification instructions: ${params.prompt}\n\nGenerate at ${
      resolutionMap[params.tier]
    } resolution.`;

  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.imageData,
          },
        },
        {
          text: fullPrompt,
        },
      ],
    },
  ];

  console.log(`Modifying image with Gemini API using model: ${DEFAULT_MODEL}`);
  console.log(
    `Tier: ${params.tier}, Resolution: ${resolutionMap[params.tier]}, Aspect Ratio: ${
      params.aspectRatio || "auto-detected"
    }`,
  );
  console.log(`Prompt: ${params.prompt.substring(0, 100)}...`);
  console.log(`Timeout: ${GEMINI_TIMEOUT_MS / 1000}s`);

  return processGeminiStream({
    ai,
    model: DEFAULT_MODEL,
    config,
    contents,
    operationType: "modification",
  });
}
