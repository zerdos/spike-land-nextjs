/**
 * Scout Suggestion Generator
 *
 * AI-powered content suggestion generator using Claude API.
 */

import Anthropic from "@anthropic-ai/sdk";

import type {
  BrandVoiceContext,
  CompetitorData,
  ContentSuggestion,
  ContentType,
  ScoringWeights,
  SuggestionGenerationInput,
  SuggestionGenerationResult,
  SuggestionPlatform,
  TopicData,
  TrendData,
} from "./types";

/**
 * Configuration for the suggestion generator
 */
export interface SuggestionGeneratorConfig {
  maxSuggestions: number;
  minRelevanceScore: number;
  expirationHours: number;
  scoringWeights: ScoringWeights;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: SuggestionGeneratorConfig = {
  maxSuggestions: 10,
  minRelevanceScore: 0.5,
  expirationHours: 48,
  scoringWeights: {
    relevance: 0.4,
    timeliness: 0.3,
    brandAlignment: 0.3,
  },
};

/**
 * Raw suggestion from AI
 */
interface RawAISuggestion {
  title: string;
  description: string;
  draftContent: string;
  contentType: ContentType;
  suggestedPlatforms: SuggestionPlatform[];
  relevanceScore: number;
  timelinessScore: number;
  brandAlignmentScore: number;
  trendSources: string[];
}

/**
 * Generate content suggestions using AI
 */
export async function generateSuggestions(
  input: SuggestionGenerationInput,
  config: SuggestionGeneratorConfig = DEFAULT_CONFIG,
): Promise<SuggestionGenerationResult> {
  const startTime = Date.now();

  // Build context for AI
  const context = buildAIContext(input);

  // Generate suggestions via Claude
  const rawSuggestions = await callClaudeForSuggestions(
    context,
    input.maxSuggestions ?? config.maxSuggestions,
  );

  // Transform and score suggestions
  const suggestions = rawSuggestions
    .map((raw) => transformToSuggestion(raw, input, config))
    .filter((s) => s.overallScore >= config.minRelevanceScore)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, config.maxSuggestions);

  return {
    suggestions,
    generatedCount: suggestions.length,
    processingTimeMs: Date.now() - startTime,
    topicsAnalyzed: input.topics?.length ?? 0,
    competitorsAnalyzed: input.competitors?.length ?? 0,
  };
}

/**
 * Build context string for AI prompt
 */
export function buildAIContext(input: SuggestionGenerationInput): string {
  const parts: string[] = [];

  // Brand voice context
  if (input.brandVoice) {
    parts.push(formatBrandVoiceContext(input.brandVoice));
  }

  // Topic monitoring data
  if (input.topics && input.topics.length > 0) {
    parts.push(formatTopicContext(input.topics));
  }

  // Competitor tracking data
  if (input.competitors && input.competitors.length > 0) {
    parts.push(formatCompetitorContext(input.competitors));
  }

  // Content type preferences
  if (input.contentTypes && input.contentTypes.length > 0) {
    parts.push(`Preferred content types: ${input.contentTypes.join(", ")}`);
  }

  // Platform preferences
  if (input.platforms && input.platforms.length > 0) {
    parts.push(`Target platforms: ${input.platforms.join(", ")}`);
  }

  return parts.join("\n\n");
}

/**
 * Format brand voice for AI context
 */
function formatBrandVoiceContext(voice: BrandVoiceContext): string {
  const lines = ["## Brand Voice Guidelines"];

  lines.push(`Tone: ${voice.tone}`);
  lines.push(`Style: ${voice.style}`);

  if (voice.values.length > 0) {
    lines.push(`Core values: ${voice.values.join(", ")}`);
  }

  if (voice.keywords.length > 0) {
    lines.push(`Key themes/keywords: ${voice.keywords.join(", ")}`);
  }

  if (voice.avoidWords.length > 0) {
    lines.push(`Words/phrases to avoid: ${voice.avoidWords.join(", ")}`);
  }

  if (voice.samplePosts && voice.samplePosts.length > 0) {
    lines.push("\nSample posts in brand voice:");
    voice.samplePosts.slice(0, 3).forEach((post, i) => {
      lines.push(`${i + 1}. "${post}"`);
    });
  }

  return lines.join("\n");
}

/**
 * Format topic data for AI context
 */
function formatTopicContext(topics: TopicData[]): string {
  const lines = ["## Trending Topics from Monitoring"];

  const sortedTopics = [...topics].sort((a, b) => b.volume - a.volume);

  sortedTopics.slice(0, 10).forEach((topic) => {
    const trendEmoji = topic.trend === "RISING" ? "📈" : topic.trend === "DECLINING" ? "📉" : "➡️";
    lines.push(
      `- ${topic.keyword} ${trendEmoji} (volume: ${topic.volume}, sentiment: ${topic.sentiment})`,
    );
    if (topic.relatedHashtags && topic.relatedHashtags.length > 0) {
      lines.push(`  Related hashtags: ${topic.relatedHashtags.slice(0, 5).join(", ")}`);
    }
  });

  return lines.join("\n");
}

/**
 * Format competitor data for AI context
 */
function formatCompetitorContext(competitors: CompetitorData[]): string {
  const lines = ["## Competitor Content Analysis"];

  competitors.slice(0, 5).forEach((competitor) => {
    lines.push(`\n### ${competitor.platform} Account (ID: ${competitor.accountId})`);
    lines.push(`Engagement rate: ${(competitor.engagementRate * 100).toFixed(1)}%`);

    if (competitor.topPerformingContent && competitor.topPerformingContent.length > 0) {
      lines.push("Top performing content themes:");
      competitor.topPerformingContent.slice(0, 3).forEach((content) => {
        lines.push(`- ${content}`);
      });
    }

    if (competitor.recentPosts.length > 0) {
      lines.push("Recent high-engagement posts:");
      competitor.recentPosts
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 3)
        .forEach((post) => {
          lines.push(`- "${post.content.slice(0, 100)}..." (engagement: ${post.engagementScore})`);
        });
    }
  });

  return lines.join("\n");
}

/**
 * Call Claude API to generate suggestions
 */
async function callClaudeForSuggestions(
  context: string,
  maxSuggestions: number,
): Promise<RawAISuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt =
    `You are an expert social media content strategist. Based on the provided context including brand voice guidelines, trending topics, and competitor analysis, generate creative and engaging content suggestions.

Each suggestion should:
1. Align with the brand voice and values
2. Leverage current trends or competitor insights
3. Be timely and relevant
4. Include ready-to-use draft content
5. Specify the best platforms for the content

Respond with a JSON array of suggestions in this exact format:
{
  "suggestions": [
    {
      "title": "Brief title for the suggestion",
      "description": "Why this content idea is valuable and timely",
      "draftContent": "Ready-to-post content draft",
      "contentType": "POST|THREAD|STORY|REEL|ARTICLE",
      "suggestedPlatforms": ["TWITTER", "INSTAGRAM", ...],
      "relevanceScore": 0.0-1.0,
      "timelinessScore": 0.0-1.0,
      "brandAlignmentScore": 0.0-1.0,
      "trendSources": ["description of trend/insight used"]
    }
  ]
}`;

  const userPrompt =
    `Based on the following context, generate ${maxSuggestions} content suggestions:

${context}

Generate diverse, creative content ideas that leverage the trends and insights while staying true to the brand voice. Ensure each suggestion has practical, ready-to-use draft content.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  // Extract text content
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(textContent.text);
    return parsed.suggestions ?? [];
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = textContent.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed.suggestions ?? [];
    }
    throw new Error("Failed to parse AI response as JSON");
  }
}

/**
 * Transform raw AI suggestion to ContentSuggestion
 */
function transformToSuggestion(
  raw: RawAISuggestion,
  input: SuggestionGenerationInput,
  config: SuggestionGeneratorConfig,
): ContentSuggestion {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.expirationHours * 60 * 60 * 1000);

  // Calculate overall score using weights
  const weights = config.scoringWeights;
  const overallScore = raw.relevanceScore * weights.relevance +
    raw.timelinessScore * weights.timeliness +
    raw.brandAlignmentScore * weights.brandAlignment;

  // Build trend data from sources
  const trendData: TrendData[] = raw.trendSources.map((source) => ({
    source: inferTrendSource(source, input),
    description: source,
  }));

  return {
    id: generateSuggestionId(),
    workspaceId: input.workspaceId,
    title: raw.title,
    description: raw.description,
    draftContent: raw.draftContent,
    contentType: raw.contentType,
    suggestedPlatforms: raw.suggestedPlatforms,
    trendData,
    relevanceScore: raw.relevanceScore,
    timelinessScore: raw.timelinessScore,
    brandAlignmentScore: raw.brandAlignmentScore,
    overallScore,
    status: "PENDING",
    generatedAt: now,
    expiresAt,
  };
}

/**
 * Infer trend source from description
 */
function inferTrendSource(
  description: string,
  input: SuggestionGenerationInput,
): TrendData["source"] {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes("competitor") || lowerDesc.includes("rival")) {
    return "COMPETITOR_TRACKING";
  }
  if (lowerDesc.includes("hashtag") || lowerDesc.includes("#")) {
    return "HASHTAG_TREND";
  }
  if (lowerDesc.includes("news") || lowerDesc.includes("article")) {
    return "NEWS";
  }
  if (lowerDesc.includes("analytic") || lowerDesc.includes("data")) {
    return "INTERNAL_ANALYTICS";
  }

  // Default to topic monitoring if topics were provided
  if (input.topics && input.topics.length > 0) {
    return "TOPIC_MONITORING";
  }

  return "TOPIC_MONITORING";
}

/**
 * Generate unique suggestion ID
 */
function generateSuggestionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sug_${timestamp}${random}`;
}

/**
 * Calculate score for a suggestion based on weights
 */
export function calculateOverallScore(
  relevance: number,
  timeliness: number,
  brandAlignment: number,
  weights: ScoringWeights = DEFAULT_CONFIG.scoringWeights,
): number {
  return (
    relevance * weights.relevance +
    timeliness * weights.timeliness +
    brandAlignment * weights.brandAlignment
  );
}
