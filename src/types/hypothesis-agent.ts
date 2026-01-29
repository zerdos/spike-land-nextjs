/**
 * TypeScript types for Hypothesis Agent - Experimentation Framework
 * Epic #516
 *
 * Defines interfaces for experiments, variants, events, and adapters.
 */

import type {
  Experiment,
  ExperimentVariant,
  ExperimentEvent,
  ExperimentResult,
  ExperimentStatus,
  WinnerStrategy,
} from "@prisma/client";

// =============================================================================
// Core Experiment Types
// =============================================================================

export interface ExperimentWithRelations extends Experiment {
  variants: ExperimentVariant[];
  events?: ExperimentEvent[];
  results?: ExperimentResult[];
}

export interface ExperimentVariantWithMetrics extends ExperimentVariant {
  conversionRate: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  lift?: number; // Compared to control
  isWinner?: boolean;
}

export interface ExperimentResultWithVariant extends ExperimentResult {
  variant: ExperimentVariant;
}

// =============================================================================
// Adapter System
// =============================================================================

/**
 * Base adapter interface that all content adapters must implement
 */
export interface ContentAdapter<TContent = unknown, TConfig = unknown> {
  /**
   * Unique identifier for the adapter (e.g., "social_post", "email")
   */
  readonly contentType: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Validate content structure
   */
  validateContent(content: TContent): boolean;

  /**
   * Validate adapter configuration
   */
  validateConfig(config: TConfig): boolean;

  /**
   * Assign a variant to a visitor/session
   */
  assignVariant(
    experimentId: string,
    variants: ExperimentVariant[],
    visitorId: string
  ): Promise<ExperimentVariant>;

  /**
   * Deliver the variant content to the user
   */
  deliverVariant(
    variant: ExperimentVariant,
    context: DeliveryContext
  ): Promise<void>;

  trackEvent(
    experimentId: string,
    variantId: string,
    event: ExperimentEventData
  ): Promise<void>;

  /**
   * Get human-readable description of the experimental change
   */
  getDescription?(): string;
}

export interface DeliveryContext {
  experimentId: string;
  variantId: string;
  visitorId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ExperimentEventData {
  eventType: "impression" | "click" | "conversion" | "custom";
  eventName?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  visitorId?: string;
  userId?: string;
}

// =============================================================================
// Content-Specific Types
// =============================================================================

/**
 * Social Post content structure
 */
export interface SocialPostContent {
  platform: "TWITTER" | "LINKEDIN" | "FACEBOOK" | "INSTAGRAM";
  content: string;
  mediaUrls?: string[];
  variationType: "headline" | "cta" | "emoji" | "hashtags" | "tone";
}

/**
 * Email Campaign content structure
 */
export interface EmailCampaignContent {
  subject: string;
  preheader?: string;
  bodyHtml: string;
  bodyText?: string;
  ctaText?: string;
  ctaUrl?: string;
  variationType: "subject" | "cta" | "layout" | "copy";
}

/**
 * Landing Page content structure
 */
export interface LandingPageContent {
  headline: string;
  subheadline?: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  heroImageUrl?: string;
  variationType: "headline" | "hero" | "cta" | "layout";
}

/**
 * Generic content (flexible structure)
 */
export interface GenericContent {
  title?: string;
  content: Record<string, unknown>;
  variationType: string;
}

// =============================================================================
// Statistical Analysis
// =============================================================================

export interface StatisticalResult {
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;

  // Confidence interval (Wilson score)
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number; // 0.95 for 95% confidence
  };

  // Frequentist statistics
  zScore?: number;
  pValue?: number;
  isSignificant: boolean;

  // Bayesian statistics (if enabled)
  bayesian?: {
    probability: number; // Probability of being the best
    expectedLift: number;
    credibleInterval: {
      lower: number;
      upper: number;
    };
  };

  // Economic metrics
  totalValue?: number;
  avgValue?: number;
  expectedValue?: number;
}

export interface ExperimentAnalysis {
  experimentId: string;
  status: ExperimentStatus;
  variants: StatisticalResult[];
  winner: StatisticalResult | null;
  recommendedAction: "continue" | "select_winner" | "stop" | "needs_more_data";
  reasoning: string;
  calculatedAt: Date;
}

// =============================================================================
// Winner Selection
// =============================================================================

export interface WinnerSelectionConfig {
  strategy: WinnerStrategy;
  minimumSampleSize: number;
  significanceLevel: number;
  confirmationPeriodDays?: number; // For CONSERVATIVE strategy
  valueThreshold?: number; // For ECONOMIC strategy
  minConfidenceLevel?: number; // For SAFETY_FIRST strategy (e.g., 0.99)
}

export interface WinnerCandidate {
  variantId: string;
  variantName: string;
  conversionRate: number;
  confidenceLevel: number;
  lift: number;
  totalValue?: number;
  meetsThreshold: boolean;
  reasoning: string;
}

// =============================================================================
// Experiment Templates
// =============================================================================

export interface ExperimentTemplate {
  id: string;
  name: string;
  description: string;
  contentType: string;
  category: "marketing" | "product" | "content" | "growth";
  hypothesis: string;
  suggestedVariants: {
    name: string;
    description: string;
    isControl: boolean;
  }[];
  config: {
    significanceLevel: number;
    minimumSampleSize: number;
    winnerStrategy: WinnerStrategy;
    durationDays?: number;
  };
  tags: string[];
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateExperimentRequest {
  name: string;
  description?: string;
  hypothesis?: string;
  contentType: string;
  adapterConfig?: Record<string, unknown>;
  significanceLevel?: number;
  minimumSampleSize?: number;
  winnerStrategy?: WinnerStrategy;
  autoSelectWinner?: boolean;
  variants: {
    name: string;
    description?: string;
    content: Record<string, unknown>;
    splitPercentage?: number;
    isControl?: boolean;
  }[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateExperimentRequest {
  name?: string;
  description?: string;
  hypothesis?: string;
  status?: ExperimentStatus;
  significanceLevel?: number;
  winnerStrategy?: WinnerStrategy;
  autoSelectWinner?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExperimentResultsResponse {
  experiment: ExperimentWithRelations;
  analysis: ExperimentAnalysis;
  recommendations: string[];
}

export interface SelectWinnerRequest {
  variantId: string;
  reason?: string;
}

// =============================================================================
// Experiment Events
// =============================================================================

export interface TrackEventRequest {
  experimentId: string;
  variantId: string;
  eventType: "impression" | "click" | "conversion" | "custom";
  eventName?: string;
  value?: number;
  visitorId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Export all types from Prisma
// =============================================================================

export type {
  Experiment,
  ExperimentVariant,
  ExperimentEvent,
  ExperimentResult,
  ExperimentStatus,
  WinnerStrategy,
};
