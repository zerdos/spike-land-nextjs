/**
 * Scout Content Suggestions Types
 *
 * Types for AI-powered content suggestion system.
 */

/**
 * Content suggestion status
 */
export type SuggestionStatus = "PENDING" | "ACCEPTED" | "DISMISSED" | "USED";

/**
 * Content type for suggestions
 */
export type ContentType = "POST" | "THREAD" | "STORY" | "REEL" | "ARTICLE";

/**
 * Platform for content suggestions
 */
export type SuggestionPlatform = "TWITTER" | "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TIKTOK";

/**
 * Source of trend data
 */
export type TrendSource =
  | "TOPIC_MONITORING"
  | "COMPETITOR_TRACKING"
  | "HASHTAG_TREND"
  | "NEWS"
  | "INTERNAL_ANALYTICS";

/**
 * Trend data supporting a suggestion
 */
export interface TrendData {
  source: TrendSource;
  keyword?: string;
  hashtag?: string;
  competitorAccountId?: string;
  volume?: number;
  growthRate?: number;
  sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  timeframe?: string;
  description: string;
}

/**
 * Content suggestion from Scout
 */
export interface ContentSuggestion {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  draftContent: string;
  contentType: ContentType;
  suggestedPlatforms: SuggestionPlatform[];
  trendData: TrendData[];
  relevanceScore: number;
  timelinessScore: number;
  brandAlignmentScore: number;
  overallScore: number;
  status: SuggestionStatus;
  generatedAt: Date;
  expiresAt?: Date;
  usedAt?: Date;
  dismissedAt?: Date;
  dismissalReason?: string;
  feedback?: string;
}

/**
 * Input for generating content suggestions
 */
export interface SuggestionGenerationInput {
  workspaceId: string;
  brandVoice?: BrandVoiceContext;
  topics?: TopicData[];
  competitors?: CompetitorData[];
  maxSuggestions?: number;
  contentTypes?: ContentType[];
  platforms?: SuggestionPlatform[];
}

/**
 * Brand voice context for AI generation
 */
export interface BrandVoiceContext {
  tone: string;
  style: string;
  values: string[];
  keywords: string[];
  avoidWords: string[];
  samplePosts?: string[];
}

/**
 * Topic data from monitoring
 */
export interface TopicData {
  id: string;
  keyword: string;
  volume: number;
  trend: "RISING" | "STABLE" | "DECLINING";
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  relatedHashtags?: string[];
}

/**
 * Competitor data from tracking
 */
export interface CompetitorData {
  id: string;
  accountId: string;
  platform: SuggestionPlatform;
  recentPosts: CompetitorPost[];
  engagementRate: number;
  topPerformingContent?: string[];
}

/**
 * Competitor post data
 */
export interface CompetitorPost {
  id: string;
  content: string;
  engagementScore: number;
  postedAt: Date;
  hashtags?: string[];
}

/**
 * Suggestion feedback for improvement
 */
export interface SuggestionFeedback {
  suggestionId: string;
  helpful: boolean;
  reason?: string;
  improvementSuggestions?: string;
}

/**
 * Result of generating suggestions
 */
export interface SuggestionGenerationResult {
  suggestions: ContentSuggestion[];
  generatedCount: number;
  processingTimeMs: number;
  topicsAnalyzed: number;
  competitorsAnalyzed: number;
}

/**
 * Query options for fetching suggestions
 */
export interface SuggestionQueryOptions {
  workspaceId: string;
  status?: SuggestionStatus[];
  contentTypes?: ContentType[];
  platforms?: SuggestionPlatform[];
  minScore?: number;
  limit?: number;
  offset?: number;
  sortBy?: "score" | "generatedAt" | "expiresAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Suggestion scoring weights
 */
export interface ScoringWeights {
  relevance: number;
  timeliness: number;
  brandAlignment: number;
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  relevance: 0.4,
  timeliness: 0.3,
  brandAlignment: 0.3,
};
