import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import type {
  AnalyzeAudienceResponse,
  AudienceInsights,
} from "@spike-npm-land/shared/validations";
import { AnalyzeAudienceResponseSchema } from "@spike-npm-land/shared/validations";

/**
 * Error thrown when audience data is incomplete or missing required fields
 */
export class IncompleteAudienceDataError extends Error {
  public readonly missingFields: string[];

  constructor(missingFields: string[]) {
    super(`Incomplete audience data: missing ${missingFields.join(", ")}`);
    this.name = "IncompleteAudienceDataError";
    this.missingFields = missingFields;
  }
}

/**
 * Error thrown when a campaign brief is not found
 */
export class BriefNotFoundError extends Error {
  constructor(briefId: string) {
    super(`Campaign brief not found: ${briefId}`);
    this.name = "BriefNotFoundError";
  }
}

/**
 * Result of audience analysis including score, insights, and suggestions
 */
export interface AnalyzeAudienceResult {
  /** Quality score from 0-100 */
  score: number;
  /** Structured insights about the audience */
  insights: AudienceInsights;
  /** Array of actionable suggestions */
  suggestions: string[];
  /** Raw analysis text from AI (for debugging) */
  rawAnalysis: string;
}

/**
 * Timeout for Gemini API requests (30 seconds)
 */
const ANALYSIS_TIMEOUT_MS = 30 * 1000;

/**
 * System prompt for audience analysis
 */
const AUDIENCE_ANALYSIS_SYSTEM_PROMPT = `You are an expert marketing analyst specializing in audience targeting and segmentation.
Analyze the provided target audience data and provide actionable insights.

Your analysis should evaluate:
1. Demographic completeness and relevance
2. Interest alignment and potential conflicts
3. Behavioral patterns and targeting opportunities
4. Recommendations for refinement and expansion

Format your response as JSON with this exact structure:
{
  "score": <0-100 quality score>,
  "insights": {
    "demographicAnalysis": {
      "ageRangeAssessment": "detailed assessment of age targeting",
      "genderDistribution": "analysis of gender targeting",
      "locationRelevance": "evaluation of location targeting"
    },
    "interestAlignment": {
      "primaryInterests": ["interest 1", "interest 2"],
      "secondaryInterests": ["interest 3"],
      "conflictingInterests": ["conflict 1"]
    },
    "behaviorPatterns": {
      "identifiedBehaviors": ["behavior 1", "behavior 2"],
      "targetingOpportunities": ["opportunity 1"]
    },
    "recommendations": {
      "refinements": ["refinement 1"],
      "expansions": ["expansion 1"],
      "warnings": ["warning 1"]
    }
  },
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

/**
 * Validates that audience data has required fields for analysis
 */
function validateAudienceData(audienceData: {
  ageMin?: number | null;
  ageMax?: number | null;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
}): void {
  const missingFields: string[] = [];

  // Check for at least some demographic data
  if (!audienceData.ageMin && !audienceData.ageMax) {
    missingFields.push("age range");
  }

  if (!audienceData.genders || audienceData.genders.length === 0) {
    missingFields.push("genders");
  }

  if (!audienceData.locations || audienceData.locations.length === 0) {
    missingFields.push("locations");
  }

  if (!audienceData.interests || audienceData.interests.length === 0) {
    missingFields.push("interests");
  }

  if (missingFields.length > 0) {
    throw new IncompleteAudienceDataError(missingFields);
  }
}

/**
 * Formats audience data into a human-readable prompt for AI analysis
 */
function formatAudiencePrompt(audienceData: {
  ageMin?: number | null;
  ageMax?: number | null;
  genders?: string[];
  locations?: string[];
  interests?: string[];
  behaviors?: string[];
}): string {
  let prompt = "Analyze the following target audience:\n\n";

  prompt += `Demographics:\n`;
  prompt += `- Age Range: ${audienceData.ageMin || "no min"} to ${audienceData.ageMax || "no max"}\n`;
  prompt += `- Genders: ${audienceData.genders?.join(", ") || "not specified"}\n`;
  prompt += `- Locations: ${audienceData.locations?.join(", ") || "not specified"}\n\n`;

  prompt += `Interests:\n`;
  prompt += audienceData.interests?.map((i) => `- ${i}`).join("\n") || "None specified";
  prompt += "\n\n";

  if (audienceData.behaviors && audienceData.behaviors.length > 0) {
    prompt += `Behaviors:\n`;
    prompt += audienceData.behaviors.map((b) => `- ${b}`).join("\n");
    prompt += "\n\n";
  }

  prompt += `Provide a comprehensive analysis of this audience targeting strategy.`;

  return prompt;
}

/**
 * Analyzes a campaign brief's target audience using Gemini AI.
 * Returns detailed insights, quality score, and actionable suggestions.
 *
 * @param briefId - The ID of the campaign brief to analyze
 * @returns Analysis result with score, insights, and suggestions
 * @throws {BriefNotFoundError} If the campaign brief doesn't exist
 * @throws {IncompleteAudienceDataError} If audience data is missing required fields
 * @throws {Error} If Gemini API fails or times out
 */
export async function analyzeAudience(
  briefId: string,
): Promise<AnalyzeAudienceResult> {
  logger.info("[AUDIENCE_ANALYSIS] Starting analysis", { briefId });

  // Fetch campaign brief with typed audience data
  const brief = await prisma.campaignBrief.findUnique({
    where: { id: briefId },
    include: {
      targetAudienceTyped: true,
      audienceAnalysis: true,
    },
  });

  if (!brief) {
    throw new BriefNotFoundError(briefId);
  }

  // Check if we have cached analysis
  if (brief.audienceAnalysis) {
    logger.info("[AUDIENCE_ANALYSIS] Returning cached analysis", { briefId });
    return {
      score: brief.audienceAnalysis.score || 0,
      insights: brief.audienceAnalysis.insights as AudienceInsights,
      suggestions: brief.audienceAnalysis.suggestions as string[],
      rawAnalysis: "cached",
    };
  }

  // Validate audience data exists and is complete
  if (!brief.targetAudienceTyped) {
    throw new IncompleteAudienceDataError([
      "No typed audience data found. Please update the campaign brief.",
    ]);
  }

  validateAudienceData(brief.targetAudienceTyped);

  // Format audience data into prompt
  const audiencePrompt = formatAudiencePrompt(brief.targetAudienceTyped);

  logger.info("[AUDIENCE_ANALYSIS] Calling Gemini API", { briefId });

  // Call Gemini API with timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Audience analysis timed out after ${ANALYSIS_TIMEOUT_MS / 1000}s`,
        ),
      );
    }, ANALYSIS_TIMEOUT_MS);
  });

  const analysisPromise = generateStructuredResponse<AnalyzeAudienceResponse>({
    prompt: audiencePrompt,
    systemPrompt: AUDIENCE_ANALYSIS_SYSTEM_PROMPT,
    maxTokens: 4096,
    temperature: 0.3,
  });

  let rawResponse: AnalyzeAudienceResponse;
  try {
    rawResponse = await Promise.race([analysisPromise, timeoutPromise]);
  } catch (error) {
    logger.error("[AUDIENCE_ANALYSIS] Gemini API error", {
      briefId,
      error,
    });
    throw error;
  }

  // Validate the response structure
  const validationResult = AnalyzeAudienceResponseSchema.safeParse(rawResponse);

  if (!validationResult.success) {
    logger.error("[AUDIENCE_ANALYSIS] Invalid response structure", {
      briefId,
      errors: validationResult.error.errors,
    });
    throw new Error(
      `Invalid analysis response: ${validationResult.error.message}`,
    );
  }

  const analysisData = validationResult.data;

  logger.info("[AUDIENCE_ANALYSIS] Analysis complete", {
    briefId,
    score: analysisData.score,
    suggestionsCount: analysisData.suggestions.length,
  });

  // Store results in database
  await prisma.audienceAnalysis.create({
    data: {
      briefId,
      score: analysisData.score,
      insights: analysisData.insights as unknown as Record<string, unknown>,
      suggestions: analysisData.suggestions as unknown as Record<
        string,
        unknown
      >,
    },
  });

  return {
    score: analysisData.score,
    insights: analysisData.insights,
    suggestions: analysisData.suggestions,
    rawAnalysis: JSON.stringify(rawResponse),
  };
}
