import { GoogleGenAI } from "@google/genai";

// Configuration constants - exported for job metadata tracking
export const DEFAULT_MODEL = "gemini-3-pro-image-preview";
export const DEFAULT_TEMPERATURE: number | null = null; // Uses Gemini API defaults

// Timeout for Gemini API requests (5 minutes)
// 4K images can take up to 2 minutes based on observed successful jobs,
// so 5 minutes provides a safe buffer while preventing indefinite hangs
export const GEMINI_TIMEOUT_MS = 5 * 60 * 1000;

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

export interface EnhanceImageParams {
  imageData: string;
  mimeType: string;
  tier: "1K" | "2K" | "4K";
  originalWidth?: number;
  originalHeight?: number;
}

const ENHANCEMENT_BASE_PROMPT =
  `Create a high resolution version of this photo. Please generate it detailed with perfect focus, lights, and colors, make it look like if this photo was taken by a professional photographer with a modern professional camera in 2025.`;

/**
 * Analyzes an image and returns enhancement suggestions.
 *
 * @param imageData - Base64 encoded image data (currently unused but reserved for future vision model integration)
 * @param mimeType - MIME type of the image (currently unused but reserved for future vision model integration)
 * @returns Analysis result with description, quality assessment, and enhancement prompt
 *
 * @remarks
 * This is currently a placeholder implementation that returns static analysis results.
 * In the future, this will integrate with Gemini's vision model to perform actual image
 * analysis, including quality assessment, content detection, and intelligent enhancement suggestions.
 * Parameters are preserved to maintain API compatibility for future implementation.
 */
export async function analyzeImage(
  imageData: string,
  mimeType: string,
): Promise<ImageAnalysisResult> {
  // Log analysis attempt with metadata (parameters logged to demonstrate they're available for future use)
  console.log(
    `Analyzing image with Gemini API (format: ${mimeType}, data length: ${imageData.length} chars)`,
  );

  // TODO: Implement actual vision model analysis in future iteration
  // - Use Gemini vision to detect image content and quality
  // - Generate dynamic enhancement suggestions based on image characteristics
  // - Adjust enhancement prompt based on image type (portrait, landscape, etc.)
  return {
    description: "Photo ready for enhancement",
    quality: "medium" as const,
    suggestedImprovements: ["sharpness", "color enhancement", "detail preservation"],
    enhancementPrompt:
      `${ENHANCEMENT_BASE_PROMPT}\n\nFocus on improving: sharpness, color enhancement, detail preservation`,
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

  const analysis = await analyzeImage(params.imageData, params.mimeType);

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
          text: `${analysis.enhancementPrompt}\n\nGenerate at ${
            resolutionMap[params.tier]
          } resolution.`,
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
