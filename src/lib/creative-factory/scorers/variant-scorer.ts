import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";

export interface ScoreVariantParams {
  headline: string;
  bodyText: string;
  callToAction?: string;
  targetAudience?: string;
  platform?: string;
}

export interface VariantScore {
  predictedCTR: number; // 0-100 (percentage)
  predictedER: number; // Engagement Rate 0-100
  predictedCR: number; // Conversion Rate 0-100
  confidenceScore: number; // 0-100
  factorsAnalyzed: {
    clarity: number; // 0-10
    persuasion: number; // 0-10
    relevance: number; // 0-10
    urgency: number; // 0-10
    explanation: string;
  };
}

export async function scoreVariant(
  params: ScoreVariantParams,
): Promise<VariantScore> {
  logger.info("Scoring variant");

  const systemPrompt = `You are an expert ad performance analyst.
Your job is to predict the performance of ad creatives based on copy, audience, and platform best practices.
You provide realistic estimates for CTR (Click-Through Rate), ER (Engagement Rate), and CR (Conversion Rate).
Note: Average industry CTR is around 1-3%, ER 1-5%. Adjust based on quality.`;

  const prompt = `
Analyze the following ad creative:

---
Headline: "${params.headline}"
Body: "${params.bodyText}"
CTA: "${params.callToAction || "N/A"}"
${params.targetAudience ? `Audience: ${params.targetAudience}` : ""}
${params.platform ? `Platform: ${params.platform}` : ""}
---

Predict the performance metrics and analyze key factors.
Provide:
1. Predicted CTR (e.g., 2.5 for 2.5%)
2. Predicted Engagement Rate
3. Predicted Conversion Rate
4. Confidence in your prediction (0-100)
5. Analysis of factors: Clarity, Persuasion, Relevance, Urgency (0-10 scale) and a brief explanation.

Output must be valid JSON matching the VariantScore interface.
`;

  try {
    return await generateStructuredResponse<VariantScore>({
      prompt,
      systemPrompt,
      temperature: 0.1, // Low temperature for consistent scoring
    });
  } catch (error) {
    logger.error("Failed to score variant", { error });
    // Return a default/fallback score instead of crashing
    return {
      predictedCTR: 0,
      predictedER: 0,
      predictedCR: 0,
      confidenceScore: 0,
      factorsAnalyzed: {
        clarity: 0,
        persuasion: 0,
        relevance: 0,
        urgency: 0,
        explanation: "Scoring failed",
      },
    };
  }
}
