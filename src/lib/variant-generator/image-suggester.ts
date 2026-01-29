/**
 * Image suggestion service using Gemini API
 *
 * Generates AI image suggestions based on copy and target audience.
 * Resolves #551
 */

import logger from "@/lib/logger";
import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import type { ImageSuggestion } from "@/types/variant-generator";

interface ImageSuggestionParams {
  /** Generated copy text to create image suggestions for */
  copyText: string;
  /** Target audience description */
  targetAudience?: Record<string, unknown>;
  /** Platform for the image (affects aspect ratio) */
  platform?: "instagram" | "facebook" | "twitter" | "linkedin";
}

/**
 * Platform-specific aspect ratio recommendations
 */
const PLATFORM_ASPECT_RATIOS: Record<string, string> = {
  instagram: "1:1",
  facebook: "16:9",
  twitter: "16:9",
  linkedin: "1.91:1",
};

/**
 * Build image suggestion prompt
 */
function buildImageSuggestionPrompt(params: ImageSuggestionParams): string {
  const { copyText, targetAudience, platform } = params;

  let prompt = `Analyze this marketing copy and suggest an appropriate image to accompany it:

"${copyText}"
`;

  if (targetAudience) {
    prompt += `\nTarget Audience: ${JSON.stringify(targetAudience)}\n`;
  }

  if (platform) {
    prompt += `\nPlatform: ${platform}\n`;
  }

  prompt += `
Provide a JSON response with the following structure:
{
  "prompt": "Detailed image generation prompt (3-5 sentences describing the ideal image)",
  "theme": "Visual theme category (e.g., 'lifestyle', 'product', 'abstract', 'technology', 'nature')",
  "description": "Brief description of the suggested image (1-2 sentences)",
  "aspectRatio": "Recommended aspect ratio (e.g., '1:1', '16:9', '4:5')",
  "includePeople": true or false (whether the image should include people),
  "colorPalette": ["#HEX1", "#HEX2", "#HEX3"] (3-5 dominant colors as hex codes)
}

Guidelines:
- The image should complement the copy's message and tone
- Consider the target audience's preferences and demographics
- Suggest realistic, achievable image concepts
- Color palette should match the brand mood and message
- Aspect ratio should match platform best practices if specified`;

  return prompt;
}

/**
 * Generate image suggestions for a copy variant
 *
 * @param params - Image suggestion parameters
 * @returns Array of image suggestions
 */
export async function suggestImagesForCopy(
  params: ImageSuggestionParams,
): Promise<ImageSuggestion[]> {
  logger.info("[IMAGE_SUGGESTER] Generating image suggestions", {
    copyLength: params.copyText.length,
    platform: params.platform,
  });

  const prompt = buildImageSuggestionPrompt(params);

  try {
    const result = await generateStructuredResponse<ImageSuggestion>(
      {
        prompt,
        systemPrompt: "You are an expert visual content strategist specializing in creating image concepts that enhance marketing copy. Provide practical, achievable image suggestions that align with the copy's message and target audience.",
        temperature: 0.7, // Higher temperature for creative suggestions
      },
    );

    // Apply platform-specific aspect ratio if not set
    if (params.platform && !result.aspectRatio) {
      result.aspectRatio = PLATFORM_ASPECT_RATIOS[params.platform];
    }

    logger.info("[IMAGE_SUGGESTER] Image suggestion generated successfully", {
      theme: result.theme,
      aspectRatio: result.aspectRatio,
    });

    return [result];
  } catch (error) {
    logger.error("[IMAGE_SUGGESTER] Failed to generate image suggestion:", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return a default suggestion on error
    return [
      {
        prompt: `Create a visually appealing image that represents: ${params.copyText.slice(0, 100)}`,
        theme: "general",
        description: "A professional marketing image that complements the copy",
        aspectRatio: params.platform
          ? PLATFORM_ASPECT_RATIOS[params.platform]
          : "1:1",
        includePeople: false,
        colorPalette: ["#4A90E2", "#F5A623", "#7ED321"],
      },
    ];
  }
}

/**
 * Generate multiple image suggestions with variations
 *
 * @param params - Image suggestion parameters
 * @param count - Number of suggestions to generate
 * @returns Array of image suggestions
 */
export async function suggestMultipleImages(
  params: ImageSuggestionParams,
  count: number = 3,
): Promise<ImageSuggestion[]> {
  logger.info("[IMAGE_SUGGESTER] Generating multiple image suggestions", {
    count,
  });

  const suggestions: ImageSuggestion[] = [];

  // Generate variations by adding different instructions
  const variations = [
    "Focus on the product/service itself",
    "Show people using or benefiting from the product/service",
    "Create an abstract or conceptual representation",
  ];

  for (let i = 0; i < Math.min(count, variations.length); i++) {
    const enhancedParams = {
      ...params,
      copyText: `${params.copyText}\n\nImage Style Variation: ${variations[i]}`,
    };

    const suggestion = await suggestImagesForCopy(enhancedParams);
    suggestions.push(...suggestion);
  }

  return suggestions.slice(0, count);
}
