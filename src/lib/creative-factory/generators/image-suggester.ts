import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";

export interface ImageSuggestionParams {
  copyText: string;
  targetAudience?: string;
  count?: number;
  style?: string; // e.g., "photorealistic", "illustration"
}

export interface ImageSuggestion {
  imagePrompt: string;
  style: string;
  reasoning: string;
}

interface ImageSuggestionResponse {
  suggestions: ImageSuggestion[];
}

export async function suggestImagesForCopy(
  params: ImageSuggestionParams,
): Promise<ImageSuggestion[]> {
  const count = params.count || 3;

  logger.info("Generating image suggestions", { count });

  const systemPrompt = `You are an expert creative director.
Your goal is to suggest visual concepts that complement ad copy and resonate with the target audience.
You provide detailed image generation prompts that can be used with AI image generators.`;

  const prompt = `
Analyze the following ad copy and suggest ${count} visual concepts (images) that would work well with it:

---
Copy: "${params.copyText}"
${params.targetAudience ? `Target Audience: ${params.targetAudience}` : ""}
${params.style ? `Preferred Style: ${params.style}` : ""}
---

For each suggestion, provide:
1. A detailed image generation prompt (descriptive, including lighting, composition, style)
2. The style category (e.g., "photorealistic", "minimalist vector", "lifestyle photography")
3. Reasoning for why this visual fits the copy and audience

The output must be a JSON object with a "suggestions" array.
`;

  try {
    const response = await generateStructuredResponse<ImageSuggestionResponse>({
      prompt,
      systemPrompt,
      temperature: 0.7,
    });

    if (!response?.suggestions) {
      throw new Error("Invalid response: missing suggestions array");
    }

    return response.suggestions;
  } catch (error) {
    logger.error("Failed to generate image suggestions", { error });
    throw new Error("Failed to generate image suggestions");
  }
}
