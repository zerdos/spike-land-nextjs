import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";

export interface CopyGenerationParams {
  seedContent: string;
  tone?: string; // e.g., "professional", "casual", "urgent"
  targetLength?: "short" | "medium" | "long";
  count?: number;
  targetAudience?: string;
  platform?: string; // e.g., "linkedin", "facebook"
}

export interface GeneratedCopyVariant {
  headline: string;
  bodyText: string;
  callToAction: string;
  tone: string;
  length: "short" | "medium" | "long";
  explanation: string; // Why this variant was generated
}

interface CopyGenerationResponse {
  variants: GeneratedCopyVariant[];
}

export async function generateCopyVariants(
  params: CopyGenerationParams,
): Promise<GeneratedCopyVariant[]> {
  const count = params.count || 3;
  const tone = params.tone || "balanced";
  const length = params.targetLength || "medium";

  logger.info("Generating copy variants", { count, tone, length });

  const systemPrompt = `You are an expert marketing copywriter.
Your goal is to generate high-converting ad copy variations based on seed content.
You adapt the tone and length to match the user's requirements.
Ensure each variant is distinct and persuasive.`;

  const prompt = `
Generate ${count} distinct ad copy variants based on the following content:

---
${params.seedContent}
---

Requirements:
- Tone: ${tone}
- Length: ${length}
${params.targetAudience ? `- Target Audience: ${params.targetAudience}` : ""}
${params.platform ? `- Platform: ${params.platform}` : ""}

For each variant, provide:
1. A catchy headline
2. The main body text
3. A strong call to action (CTA)
4. The tone used (should match "${tone}")
5. The length category ("short", "medium", "long")
6. Brief explanation of why this copy works

The output must be a JSON object with a "variants" array.
`;

  try {
    const response = await generateStructuredResponse<CopyGenerationResponse>({
      prompt,
      systemPrompt,
      temperature: 0.7, // Slightly higher for creativity
    });

    if (!response?.variants) {
      throw new Error("Invalid response: missing variants array");
    }

    return response.variants;
  } catch (error) {
    logger.error("Failed to generate copy variants", { error });
    throw new Error("Failed to generate copy variants");
  }
}
