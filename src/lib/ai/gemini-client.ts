import { GoogleGenAI } from "@google/genai";

// Configuration constants - exported for job metadata tracking
export const DEFAULT_MODEL = "gemini-3-pro-image-preview";
export const DEFAULT_TEMPERATURE: number | null = null; // Uses Gemini API defaults

// Timeout for Gemini API requests (5 minutes)
// 4K images can take up to 2 minutes based on observed successful jobs,
// so 5 minutes provides a safe buffer while preventing indefinite hangs
export const GEMINI_TIMEOUT_MS = 5 * 60 * 1000;

// Timeout for vision analysis stage (30 seconds)
// Analysis should be fast - if it times out, we fall back to default prompt
export const ANALYSIS_TIMEOUT_MS = 30 * 1000;

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

export interface ImageAnalysisResult {
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

export interface EnhanceImageParams {
  imageData: string;
  mimeType: string;
  tier: "1K" | "2K" | "4K";
  originalWidth?: number;
  originalHeight?: number;
  /** Optional prompt override - when provided, skips internal analysis and uses this prompt directly */
  promptOverride?: string;
}

/**
 * Builds a dynamic enhancement prompt based on detected image characteristics.
 * Handles extreme cases like VHS artifacts, sketches, and pitch-dark photos.
 *
 * @param analysis - Structured analysis result from vision model
 * @returns Dynamic enhancement prompt tailored to the image's specific defects
 */
export function buildDynamicEnhancementPrompt(analysis: AnalysisDetailedResult): string {
  const defects = analysis.defects;
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
  if (defects.isDark || analysis.lightingCondition.includes("pitch black")) {
    instruction +=
      `- Dramatically relight the scene. Reveal details hidden in shadows as if illuminated by strong, natural light (e.g., bright moonlight or professional studio lighting) while maintaining a realistic atmosphere.\n`;
  } else if (defects.isOverexposed) {
    instruction +=
      `- Recover details in blown-out highlight areas. Restore natural texture and color to bright spots.\n`;
  }

  // VHS/Analog Artifacts
  if (defects.hasVHSArtifacts) {
    instruction +=
      `- Completely remove all analog video artifacts, including tracking lines, color bleeding, static noise, and tape distortion.\n`;
  }

  // Noise & Resolution
  if (defects.hasNoise || defects.isLowResolution) {
    instruction +=
      `- Apply advanced noise reduction to eliminate grain. Sharpen fine details and textures that are currently pixelated or blurry.\n`;
  }

  // Color Correction
  if (defects.hasColorCast && defects.colorCastType) {
    instruction +=
      `- Neutralize the strong ${defects.colorCastType} color cast to restore natural, accurate colors.\n`;
  }

  // Focus/Blur
  if (defects.isBlurry) {
    instruction += `- Bring the entire image into sharp, crisp focus.\n`;
  }

  // Final instruction
  instruction +=
    `\nFinal Output Requirement: A clean, sharp, highly detailed professional photograph.`;

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
function validateImageStyle(style: unknown): AnalysisDetailedResult["imageStyle"] {
  const validStyles = ["photograph", "sketch", "painting", "screenshot", "other"];
  if (typeof style === "string" && validStyles.includes(style)) {
    return style as AnalysisDetailedResult["imageStyle"];
  }
  return "photograph";
}

/**
 * Validates the colorCastType field from analysis response.
 * @internal
 */
function validateColorCastType(type: unknown): AnalysisDetailedResult["defects"]["colorCastType"] {
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
      cropReason: parsed.cropping?.cropReason ? String(parsed.cropping.cropReason) : undefined,
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
): Promise<AnalysisDetailedResult> {
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    config: {
      responseMimeType: "application/json",
      temperature: 0.1, // Low temperature for deterministic JSON output
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
 * @returns Structured analysis result with defects, style, and cropping suggestions
 */
export async function analyzeImageV2(
  imageData: string,
  mimeType: string,
): Promise<ImageAnalysisResultV2> {
  console.log(
    `Analyzing image with vision model (format: ${mimeType}, data length: ${imageData.length} chars)`,
  );

  const ai = getGeminiClient();
  let structuredAnalysis: AnalysisDetailedResult;

  try {
    // Create analysis promise with timeout protection
    const analysisPromise = performVisionAnalysis(ai, imageData, mimeType);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Analysis timed out after ${ANALYSIS_TIMEOUT_MS / 1000}s`));
      }, ANALYSIS_TIMEOUT_MS);
    });

    structuredAnalysis = await Promise.race([analysisPromise, timeoutPromise]);
    console.log("Vision analysis successful:", JSON.stringify(structuredAnalysis.defects));
  } catch (error) {
    console.warn(
      "Vision analysis failed, using fallback:",
      error instanceof Error ? error.message : String(error),
    );
    structuredAnalysis = getDefaultAnalysis();
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
  if (defects.isLowResolution) suggestedImprovements.push("resolution enhancement");
  if (defects.hasColorCast) suggestedImprovements.push("color correction");

  // Always add standard improvements
  suggestedImprovements.push("color optimization", "detail enhancement");

  // Build enhancement prompt using dynamic prompt builder
  const enhancementPrompt = buildDynamicEnhancementPrompt(v2Result.structuredAnalysis);

  return {
    description: v2Result.description,
    quality: v2Result.quality,
    suggestedImprovements,
    enhancementPrompt,
  };
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

  const config = {
    responseModalities: ["IMAGE"],
    imageConfig: {
      imageSize: params.tier,
    },
  };

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
          text: `${enhancementPrompt}\n\nGenerate at ${resolutionMap[params.tier]} resolution.`,
        },
      ],
    },
  ];

  console.log(`Generating enhanced image with Gemini API using model: ${DEFAULT_MODEL}`);
  console.log(`Tier: ${params.tier}, Resolution: ${resolutionMap[params.tier]}`);
  console.log(`Timeout: ${GEMINI_TIMEOUT_MS / 1000}s`);

  // Process streaming response with timeout
  const processStream = async (): Promise<Buffer> => {
    let response;
    try {
      response = await ai.models.generateContentStream({
        model: DEFAULT_MODEL,
        config,
        contents,
      });
    } catch (error) {
      console.error("Failed to initiate Gemini API stream:", error);
      throw new Error(
        `Failed to start image enhancement: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    const imageChunks: Buffer[] = [];
    let chunkCount = 0;
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const startTime = Date.now();

    // Create a timeout promise that rejects after GEMINI_TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(
          new Error(
            `Gemini API request timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds. ` +
              `Processed ${chunkCount} chunks before timeout.`,
          ),
        );
      }, GEMINI_TIMEOUT_MS);
    });

    // Process chunks with timeout protection
    const processChunks = async (): Promise<Buffer> => {
      try {
        for await (const chunk of response) {
          // Check if we've timed out (defensive check)
          if (timedOut) {
            throw new Error("Stream processing aborted due to timeout");
          }

          chunkCount++;
          const elapsed = Math.round((Date.now() - startTime) / 1000);

          if (
            !chunk.candidates || !chunk.candidates[0]?.content ||
            !chunk.candidates[0]?.content.parts
          ) {
            console.log(`Skipping chunk ${chunkCount}: no valid candidates (${elapsed}s elapsed)`);
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
      } catch (error) {
        if (timedOut) {
          throw error; // Re-throw timeout error
        }
        console.error(`Error processing stream at chunk ${chunkCount}:`, error);
        throw new Error(
          `Stream processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      if (imageChunks.length === 0) {
        console.error(`No image data received after processing ${chunkCount} chunks`);
        throw new Error("No image data received from Gemini API");
      }

      const totalBytes = imageChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `Successfully received ${imageChunks.length} chunks, total ${totalBytes} bytes in ${totalTime}s`,
      );

      return Buffer.concat(imageChunks);
    };

    // Race between processing and timeout, then clear timeout on success
    try {
      const result = await Promise.race([processChunks(), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  };

  return processStream();
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// MCP Generation types and functions

export interface GenerateImageParams {
  prompt: string;
  tier: "1K" | "2K" | "4K";
  negativePrompt?: string;
}

export interface ModifyImageParams {
  prompt: string;
  imageData: string;
  mimeType: string;
  tier: "1K" | "2K" | "4K";
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

  const config = {
    responseModalities: ["IMAGE"],
    imageConfig: {
      imageSize: params.tier,
    },
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
  console.log(`Tier: ${params.tier}, Resolution: ${resolutionMap[params.tier]}`);
  console.log(`Prompt: ${params.prompt.substring(0, 100)}...`);
  console.log(`Timeout: ${GEMINI_TIMEOUT_MS / 1000}s`);

  return processGeminiStream(ai, config, contents);
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

  const config = {
    responseModalities: ["IMAGE"],
    imageConfig: {
      imageSize: params.tier,
    },
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
  console.log(`Tier: ${params.tier}, Resolution: ${resolutionMap[params.tier]}`);
  console.log(`Prompt: ${params.prompt.substring(0, 100)}...`);
  console.log(`Timeout: ${GEMINI_TIMEOUT_MS / 1000}s`);

  return processGeminiStream(ai, config, contents);
}

/**
 * Helper function to process Gemini streaming response with timeout
 */
async function processGeminiStream(
  ai: GoogleGenAI,
  config: { responseModalities: string[]; imageConfig: { imageSize: string; }; },
  contents: {
    role: "user";
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string; }; }>;
  }[],
): Promise<Buffer> {
  let response;
  try {
    response = await ai.models.generateContentStream({
      model: DEFAULT_MODEL,
      config,
      contents,
    });
  } catch (error) {
    console.error("Failed to initiate Gemini API stream:", error);
    throw new Error(
      `Failed to start image generation: ${
        error instanceof Error ? error.message : "Unknown error"
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
          `Gemini API request timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds. ` +
            `Processed ${chunkCount} chunks before timeout.`,
        ),
      );
    }, GEMINI_TIMEOUT_MS);
  });

  const processChunks = async (): Promise<Buffer> => {
    try {
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
    } catch (error) {
      if (timedOut) {
        throw error;
      }
      console.error(`Error processing stream at chunk ${chunkCount}:`, error);
      throw new Error(
        `Stream processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    if (imageChunks.length === 0) {
      console.error(`No image data received after processing ${chunkCount} chunks`);
      throw new Error("No image data received from Gemini API");
    }

    const totalBytes = imageChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `Successfully received ${imageChunks.length} chunks, total ${totalBytes} bytes in ${totalTime}s`,
    );

    return Buffer.concat(imageChunks);
  };

  try {
    const result = await Promise.race([processChunks(), timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
}
