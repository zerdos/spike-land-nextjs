/**
 * TypeScript types for Variant Generator feature
 *
 * Defines interfaces for AI-powered variant generation, scoring, and A/B testing.
 * Resolves #551
 */

import type { JobStatus } from "@prisma/client";

/**
 * Tone variations for copy generation
 */
export type CopyTone =
  | "professional"
  | "casual"
  | "urgent"
  | "friendly"
  | "playful";

/**
 * Length variations for copy (character counts)
 */
export type CopyLength = "short" | "medium" | "long";

/**
 * Call-to-action styles
 */
export type CtaStyle = "action" | "question" | "urgency";

/**
 * Variation types supported by the generator
 */
export type VariationType =
  | "tone"
  | "length"
  | "cta"
  | "emoji"
  | "composite";

/**
 * Parameters for generating copy variants
 */
export interface VariantGenerationParams {
  /** Original seed content to generate variants from */
  seedContent: string;
  /** Target audience description/parameters */
  targetAudience?: Record<string, unknown>;
  /** Tone variations to generate */
  tones?: CopyTone[];
  /** Length variations to generate */
  lengths?: CopyLength[];
  /** CTA styles to generate */
  ctaStyles?: CtaStyle[];
  /** Total number of variants requested */
  count: number;
  /** Optional link to campaign brief */
  briefId?: string;
  /** Workspace ID for the variant generation */
  workspaceId: string;
}

/**
 * A single generated copy variant
 */
export interface CopyVariant {
  /** Generated copy text */
  text: string;
  /** Tone used for this variant */
  tone: CopyTone;
  /** Length category of this variant */
  length: CopyLength;
  /** Character count */
  characterCount: number;
  /** CTA style if applicable */
  ctaStyle?: CtaStyle;
  /** AI prompt used to generate this variant */
  aiPrompt: string;
  /** AI model used */
  aiModel: string;
  /** Variation type */
  variationType: VariationType;
}

/**
 * Image suggestion for a copy variant
 */
export interface ImageSuggestion {
  /** Image generation prompt based on copy */
  prompt: string;
  /** Visual theme suggested */
  theme: string;
  /** Description of suggested image */
  description: string;
  /** Recommended aspect ratio */
  aspectRatio?: string;
  /** Whether to include people */
  includePeople?: boolean;
  /** Suggested color palette */
  colorPalette?: string[];
}

/**
 * Performance prediction scores
 */
export interface VariantScore {
  /** Variant ID being scored */
  variantId: string;
  /** Predicted click-through rate (0-1) */
  predictedCTR: number;
  /** Predicted engagement rate (0-1) */
  predictedER: number;
  /** Predicted conversion rate (0-1) */
  predictedCR: number;
  /** Confidence in prediction (0-100) */
  confidenceScore: number;
  /** Factors that contributed to the score */
  factorsAnalyzed: {
    /** Copy length factor */
    lengthScore?: number;
    /** CTA presence score */
    ctaScore?: number;
    /** Tone match score */
    toneScore?: number;
    /** Historical pattern match */
    historicalScore?: number;
    /** Other factors */
    [key: string]: number | undefined;
  };
}

/**
 * Batch generation request for multiple formats
 */
export interface BatchGenerationRequest {
  /** Campaign brief ID */
  briefId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Ad formats to generate for */
  formats: string[];
  /** Variation configuration */
  variations: {
    tones?: CopyTone[];
    lengths?: CopyLength[];
    ctaStyles?: CtaStyle[];
    count: number;
  };
}

/**
 * Batch generation response
 */
export interface BatchGenerationResponse {
  /** Job ID for tracking */
  jobId: string;
  /** Estimated completion time in seconds */
  estimatedTime: number;
  /** Job status */
  status: JobStatus;
}

/**
 * Job status response
 */
export interface VariantGenerationJobStatus {
  /** Job ID */
  id: string;
  /** Current status */
  status: JobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Generated variants (if completed) */
  variants?: CopyVariant[];
  /** Error message if failed */
  errorMessage?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
}

/**
 * Statistical significance calculation for A/B testing
 */
export interface StatisticalSignificance {
  /** Whether the result is statistically significant */
  isSignificant: boolean;
  /** Confidence level (0-1) */
  confidenceLevel: number;
  /** P-value from chi-square test */
  pValue: number;
  /** Z-score */
  zScore: number;
  /** Winner variant ID (if significant) */
  winnerVariantId?: string;
  /** Recommended sample size for test */
  recommendedSampleSize: number;
}

/**
 * A/B test variant metrics
 */
export interface AbTestVariantMetrics {
  /** Variant ID */
  variantId: string;
  /** Number of impressions */
  impressions: number;
  /** Number of engagements */
  engagements: number;
  /** Number of clicks */
  clicks: number;
  /** Number of conversions */
  conversions: number;
  /** Calculated CTR */
  ctr: number;
  /** Calculated engagement rate */
  engagementRate: number;
  /** Calculated conversion rate */
  conversionRate: number;
}

/**
 * A/B test configuration
 */
export interface AbTestConfig {
  /** Test name */
  name: string;
  /** Workspace ID */
  workspaceId: string;
  /** Variant IDs to test */
  variantIds: string[];
  /** Significance level (default: 0.95) */
  significanceLevel?: number;
  /** Test duration in days */
  durationDays?: number;
  /** Minimum sample size per variant */
  minSampleSize?: number;
}

/**
 * Historical performance data for scoring
 */
export interface HistoricalPerformanceData {
  /** Platform (e.g., "facebook", "instagram", "twitter") */
  platform: string;
  /** Average CTR */
  avgCTR: number;
  /** Average engagement rate */
  avgEngagementRate: number;
  /** Average conversion rate */
  avgConversionRate: number;
  /** Optimal copy length range */
  optimalLengthRange?: [number, number];
  /** Best performing tones */
  bestTones?: CopyTone[];
  /** Sample size */
  sampleSize: number;
}

/**
 * Brand voice adaptation parameters
 */
export interface BrandVoiceParams {
  /** Workspace ID with brand profile */
  workspaceId: string;
  /** Optional brand voice override */
  voiceDescription?: string;
  /** Industry/vertical */
  industry?: string;
  /** Target audience description */
  targetAudience?: string;
}
