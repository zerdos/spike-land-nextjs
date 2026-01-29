/**
 * Copy variant generation service using Claude API
 *
 * Generates marketing copy variations with different tones, lengths, and CTAs.
 * Resolves #551
 */

import logger from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import type {
  CopyTone,
  CopyLength,
  CtaStyle,
  CopyVariant,
  VariantGenerationParams,
  BrandVoiceParams,
} from "@/types/variant-generator";

const CLAUDE_API_URL =
  "https://gateway.ai.cloudflare.com/v1/1f98921051196545ebe79a450d3c71ed/z1/anthropic/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 2048;

/**
 * Character count ranges for each length category
 */
const LENGTH_RANGES: Record<CopyLength, [number, number]> = {
  short: [100, 140],
  medium: [140, 200],
  long: [200, 280],
};

/**
 * Get copy length range for a specific length category
 */
function getLengthRange(length: CopyLength): [number, number] {
  return LENGTH_RANGES[length];
}

/**
 * Build system prompt with brand voice if provided
 */
function buildSystemPrompt(brandVoice?: BrandVoiceParams): string {
  let systemPrompt = `You are an expert marketing copywriter specializing in creating engaging, conversion-focused content for social media and digital advertising.

Your task is to generate copy variants that:
1. Maintain the core message and intent
2. Match the requested tone and style
3. Stay within character limits
4. Include strong calls-to-action when appropriate
5. Are optimized for social media engagement`;

  if (brandVoice) {
    systemPrompt += `\n\nBrand Voice Guidelines:`;
    if (brandVoice.voiceDescription) {
      systemPrompt += `\n- Voice: ${brandVoice.voiceDescription}`;
    }
    if (brandVoice.industry) {
      systemPrompt += `\n- Industry: ${brandVoice.industry}`;
    }
    if (brandVoice.targetAudience) {
      systemPrompt += `\n- Target Audience: ${brandVoice.targetAudience}`;
    }
  }

  return systemPrompt;
}

/**
 * Build user prompt for variant generation
 */
function buildVariantPrompt(
  seedContent: string,
  tone: CopyTone,
  length: CopyLength,
  ctaStyle?: CtaStyle,
): string {
  const [minChars, maxChars] = getLengthRange(length);

  let prompt = `Generate a marketing copy variant based on this seed content:

"${seedContent}"

Requirements:
- Tone: ${tone}
- Length: ${minChars}-${maxChars} characters
`;

  if (ctaStyle) {
    const ctaGuidelines: Record<CtaStyle, string> = {
      action: "End with a strong action-oriented CTA (e.g., 'Get Started', 'Try Now', 'Shop Today')",
      question: "End with an engaging question that prompts interaction (e.g., 'Ready to transform?', 'What are you waiting for?')",
      urgency: "Include urgency-driven language (e.g., 'Limited time', 'Don't miss out', 'Act now')",
    };
    prompt += `- CTA Style: ${ctaGuidelines[ctaStyle]}\n`;
  }

  prompt += `\nTone Guidelines:
`;

  const toneGuidelines: Record<CopyTone, string> = {
    professional: "Use formal, business-appropriate language. Authoritative and trustworthy. Avoid slang or emojis.",
    casual: "Use conversational, friendly language. Approachable and relatable. Emojis are okay but not required.",
    urgent: "Use compelling, time-sensitive language. Create a sense of FOMO. Include urgency markers.",
    friendly: "Use warm, personable language. Like talking to a friend. Encouraging and supportive.",
    playful: "Use fun, creative language. Light-hearted and entertaining. Emojis welcome. Be creative with wordplay.",
  };

  prompt += `${toneGuidelines[tone]}\n`;

  prompt += `\nReturn ONLY the generated copy text, nothing else. No explanations, no quotes, just the raw copy.`;

  return prompt;
}

/**
 * Call Claude API to generate a single variant
 */
async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const requestBody = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  };

  const { data: response, error } = await tryCatch(
    fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    }),
  );

  if (error) {
    logger.error("[COPY_GENERATOR] API request failed:", { error });
    throw new Error(
      `Failed to call Claude API: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("[COPY_GENERATOR] API returned error:", {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const { data: responseData, error: parseError } = await tryCatch(
    response.json(),
  );

  if (parseError) {
    logger.error("[COPY_GENERATOR] Failed to parse response:", { parseError });
    throw new Error("Failed to parse Claude API response");
  }

  // Extract text from response
  const generatedText = responseData.content?.[0]?.text;
  if (!generatedText) {
    throw new Error("No text content in Claude API response");
  }

  return generatedText.trim();
}

/**
 * Generate a single copy variant
 */
async function generateSingleVariant(
  seedContent: string,
  tone: CopyTone,
  length: CopyLength,
  ctaStyle?: CtaStyle,
  brandVoice?: BrandVoiceParams,
): Promise<CopyVariant> {
  const systemPrompt = buildSystemPrompt(brandVoice);
  const userPrompt = buildVariantPrompt(seedContent, tone, length, ctaStyle);

  logger.info("[COPY_GENERATOR] Generating variant", {
    tone,
    length,
    ctaStyle,
  });

  const generatedText = await callClaudeAPI(systemPrompt, userPrompt);

  const variant: CopyVariant = {
    text: generatedText,
    tone,
    length,
    characterCount: generatedText.length,
    ctaStyle,
    aiPrompt: userPrompt,
    aiModel: MODEL,
    variationType: ctaStyle ? "composite" : "tone",
  };

  logger.info("[COPY_GENERATOR] Variant generated successfully", {
    characterCount: variant.characterCount,
    targetRange: getLengthRange(length),
  });

  return variant;
}

/**
 * Generate multiple copy variants based on parameters
 *
 * @param params - Variant generation parameters
 * @param brandVoice - Optional brand voice configuration
 * @returns Array of generated copy variants
 */
export async function generateCopyVariants(
  params: VariantGenerationParams,
  brandVoice?: BrandVoiceParams,
): Promise<CopyVariant[]> {
  const {
    seedContent,
    tones = ["professional", "casual"],
    lengths = ["medium"],
    ctaStyles,
    count,
  } = params;

  logger.info("[COPY_GENERATOR] Starting copy variant generation", {
    requestedCount: count,
    tones,
    lengths,
    ctaStyles,
  });

  const variants: CopyVariant[] = [];
  const combinations: Array<{
    tone: CopyTone;
    length: CopyLength;
    ctaStyle?: CtaStyle;
  }> = [];

  // Generate all combinations
  for (const tone of tones) {
    for (const length of lengths) {
      if (ctaStyles && ctaStyles.length > 0) {
        for (const ctaStyle of ctaStyles) {
          combinations.push({ tone, length, ctaStyle });
        }
      } else {
        combinations.push({ tone, length });
      }
    }
  }

  // Limit to requested count
  const selectedCombinations = combinations.slice(0, count);

  logger.info("[COPY_GENERATOR] Generated combinations", {
    totalCombinations: combinations.length,
    selectedCount: selectedCombinations.length,
  });

  // Generate variants sequentially to avoid rate limits
  for (const combo of selectedCombinations) {
    try {
      const variant = await generateSingleVariant(
        seedContent,
        combo.tone,
        combo.length,
        combo.ctaStyle,
        brandVoice,
      );
      variants.push(variant);
    } catch (error) {
      logger.error("[COPY_GENERATOR] Failed to generate variant", {
        combo,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with other variants even if one fails
    }
  }

  logger.info("[COPY_GENERATOR] Copy variant generation completed", {
    successCount: variants.length,
    requestedCount: count,
  });

  return variants;
}

/**
 * Check if Claude API is configured
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
