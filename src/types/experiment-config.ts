/**
 * Experiment Configuration Types
 * Epic #516
 *
 * Configuration schemas for different experiment types and adapters.
 */

import type { WinnerStrategy } from "@prisma/client";

// =============================================================================
// Base Configuration
// =============================================================================

export interface BaseExperimentConfig {
  significanceLevel: number; // e.g., 0.95 for 95% confidence
  minimumSampleSize: number; // Minimum visitors/impressions per variant
  maxDurationDays?: number; // Maximum experiment duration
  minDurationDays?: number; // Minimum experiment duration before winner selection
  winnerStrategy: WinnerStrategy;
  autoSelectWinner: boolean;
}

// =============================================================================
// Adapter Configurations
// =============================================================================

/**
 * Social Post Adapter Config
 */
export interface SocialPostAdapterConfig {
  platform: "TWITTER" | "LINKEDIN" | "FACEBOOK" | "INSTAGRAM";
  accountId: string; // Social account to use
  publishImmediately: boolean;
  scheduledFor?: Date;
  trackingParams?: Record<string, string>; // UTM params for links
}

/**
 * Email Campaign Adapter Config
 */
export interface EmailCampaignAdapterConfig {
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  segmentId?: string; // Target audience segment
  sendTime?: Date; // When to send
  testSplitPercentage?: number; // % of list to use for test (default 20%)
  winnerRolloutDelay?: number; // Hours to wait before sending winner to rest
}

/**
 * Landing Page Adapter Config
 */
export interface LandingPageAdapterConfig {
  url: string; // Base URL of the landing page
  trafficSource: "organic" | "paid" | "social" | "email" | "direct";
  cookieDuration: number; // Days to persist variant assignment (default 30)
  respectDNT: boolean; // Respect Do Not Track (default true)
  fallbackVariant?: string; // Variant to show if tracking fails
}

/**
 * Generic Content Adapter Config
 */
export interface GenericContentAdapterConfig {
  deliveryMethod: "api" | "webhook" | "manual";
  webhookUrl?: string;
  apiEndpoint?: string;
  authToken?: string;
  customFields?: Record<string, unknown>;
}

// =============================================================================
// Statistical Configuration
// =============================================================================

export interface StatisticalConfig {
  method: "frequentist" | "bayesian" | "sequential";

  // Frequentist options
  testType?: "chi_squared" | "z_test" | "t_test";
  alpha?: number; // Significance level (default 0.05)
  power?: number; // Statistical power (default 0.8)

  // Bayesian options
  priorAlpha?: number; // Beta distribution prior (default 1)
  priorBeta?: number; // Beta distribution prior (default 1)
  mcmcSamples?: number; // MCMC samples for Bayesian inference (default 10000)

  // Sequential testing options
  alphaSpending?: "obrien_fleming" | "pocock" | "linear"; // Alpha spending function
  maxLooks?: number; // Maximum interim analyses (default 5)
}

// =============================================================================
// Winner Selection Configuration
// =============================================================================

export interface WinnerSelectionRules {
  strategy: WinnerStrategy;

  // IMMEDIATE strategy
  immediateThreshold?: number; // Min confidence to select (default 0.95)

  // CONSERVATIVE strategy
  confirmationDays?: number; // Days to wait for confirmation (default 3)
  confirmationChecks?: number; // Number of checks during confirmation (default 3)

  // ECONOMIC strategy
  valueMetric?: string; // Which metric to optimize (default "totalValue")
  minValueGain?: number; // Minimum $ gain required (default 100)
  costPerVariant?: number; // Cost to run each variant

  // SAFETY_FIRST strategy
  minConfidence?: number; // Minimum confidence (default 0.99)
  minSampleMultiplier?: number; // Multiple of minimum sample size (default 2)
  requireAllVariantsComplete?: boolean; // Wait for all variants to reach min sample
}

// =============================================================================
// Template Configuration
// =============================================================================

export interface TemplateConfig {
  id: string;
  name: string;
  contentType: string;
  baseConfig: BaseExperimentConfig;
  adapterConfig: Record<string, unknown>;
  statisticalConfig: StatisticalConfig;
  winnerRules: WinnerSelectionRules;
}

// =============================================================================
// Experiment Creation Defaults
// =============================================================================

export const DEFAULT_EXPERIMENT_CONFIG: BaseExperimentConfig = {
  significanceLevel: 0.95,
  minimumSampleSize: 100,
  maxDurationDays: 30,
  minDurationDays: 3,
  winnerStrategy: "CONSERVATIVE",
  autoSelectWinner: false,
};

export const DEFAULT_STATISTICAL_CONFIG: StatisticalConfig = {
  method: "frequentist",
  testType: "z_test",
  alpha: 0.05,
  power: 0.8,
};

export const DEFAULT_WINNER_RULES: Record<
  WinnerStrategy,
  WinnerSelectionRules
> = {
  IMMEDIATE: {
    strategy: "IMMEDIATE",
    immediateThreshold: 0.95,
  },
  CONSERVATIVE: {
    strategy: "CONSERVATIVE",
    confirmationDays: 3,
    confirmationChecks: 3,
  },
  ECONOMIC: {
    strategy: "ECONOMIC",
    valueMetric: "totalValue",
    minValueGain: 100,
  },
  SAFETY_FIRST: {
    strategy: "SAFETY_FIRST",
    minConfidence: 0.99,
    minSampleMultiplier: 2,
    requireAllVariantsComplete: true,
  },
};
