/**
 * Allocator AI Agent Types
 *
 * Types for the budget allocation recommendation engine.
 * Part of #548: Build Allocator recommendation engine
 */

import type { MarketingPlatform } from "@/lib/marketing/types";

/**
 * Confidence level for recommendations
 */
export type AllocatorConfidenceLevel = "high" | "medium" | "low";

/**
 * Recommendation type
 */
export type RecommendationType =
  | "INCREASE_BUDGET" // Increase budget for high-performing campaign
  | "DECREASE_BUDGET" // Decrease budget for underperforming campaign
  | "REALLOCATE" // Move budget from one campaign to another
  | "PAUSE_CAMPAIGN" // Pause underperforming campaign
  | "RESUME_CAMPAIGN" // Resume a paused campaign with potential
  | "SCALE_WINNER"; // Scale a proven high-performer

/**
 * Performance trend direction
 */
export type TrendDirection = "improving" | "stable" | "declining";

/**
 * Campaign performance analysis
 */
export interface CampaignPerformanceAnalysis {
  campaignId: string;
  campaignName: string;
  platform: MarketingPlatform;
  accountId: string;
  currentBudget: number; // in cents
  currency: string;

  // Performance metrics (normalized to percentages where applicable)
  metrics: {
    roas: number; // Return on Ad Spend (revenue / spend)
    cpa: number; // Cost Per Acquisition (in cents)
    ctr: number; // Click-through rate (percentage)
    conversionRate: number; // Conversions / Clicks (percentage)
    spend: number; // Total spend (in cents)
    conversions: number;
    impressions: number;
    clicks: number;
  };

  // Trend analysis
  trend: {
    roas: TrendDirection;
    cpa: TrendDirection;
    conversions: TrendDirection;
  };

  // Performance scores (0-100)
  performanceScore: number;
  efficiencyScore: number;

  // Analysis period
  periodStart: Date;
  periodEnd: Date;
  daysAnalyzed: number;
}

/**
 * Budget reallocation recommendation
 */
export interface BudgetRecommendation {
  id: string;
  type: RecommendationType;
  confidence: AllocatorConfidenceLevel;

  // Source campaign (for reallocations)
  sourceCampaign?: {
    id: string;
    name: string;
    platform: MarketingPlatform;
    currentBudget: number;
  };

  // Target campaign
  targetCampaign: {
    id: string;
    name: string;
    platform: MarketingPlatform;
    currentBudget: number;
  };

  // Recommendation details
  suggestedBudgetChange: number; // positive = increase, negative = decrease (in cents)
  suggestedNewBudget: number; // in cents
  currency: string;

  // Impact projections
  projectedImpact: {
    estimatedRoasChange: number; // percentage change
    estimatedCpaChange: number; // percentage change (negative is better)
    estimatedConversionChange: number; // percentage change
    estimatedSpendChange: number; // in cents
    confidenceInterval: {
      low: number; // lower bound percentage
      high: number; // upper bound percentage
    };
  };

  // Reasoning
  reason: string;
  supportingData: string[];

  // Timing
  createdAt: Date;
  expiresAt: Date; // Recommendation validity

  // Audit Context
  correlationId?: string;
}

/**
 * Allocator analysis options
 */
export interface AllocatorAnalysisOptions {
  workspaceId: string;
  accountIds?: string[]; // Filter to specific marketing accounts
  lookbackDays?: number; // Days of data to analyze (default: 30)
  minimumSpend?: number; // Minimum spend in cents to consider a campaign
  targetRoas?: number; // Target ROAS for recommendations
  riskTolerance?: "conservative" | "moderate" | "aggressive";

  // Audit Context
  correlationId?: string; // If provided, recommendations will be auditable
  triggeredBy?: string; // "CRON", "API", "MANUAL"
  userId?: string; // If triggered by user
}

/**
 * Complete Allocator recommendations response
 */
export interface AllocatorRecommendationsResponse {
  // Campaign performance analysis
  campaignAnalyses: CampaignPerformanceAnalysis[];

  // Recommendations sorted by projected impact
  recommendations: BudgetRecommendation[];

  // Summary metrics
  summary: {
    totalCampaignsAnalyzed: number;
    totalCurrentSpend: number; // in cents
    currency: string;
    averageRoas: number;
    averageCpa: number;

    // If all recommendations were applied
    projectedTotalImpact: {
      estimatedRoasImprovement: number; // percentage
      estimatedCpaSavings: number; // percentage
      estimatedConversionIncrease: number; // percentage
    };
  };

  // Analysis metadata
  analysisRange: {
    start: Date;
    end: Date;
  };

  // Health indicators
  hasEnoughData: boolean;
  dataQualityScore: number; // 0-100
}

/**
 * Platform benchmark data for comparison
 */
export interface PlatformBenchmarks {
  platform: MarketingPlatform;
  industry: string;
  benchmarks: {
    averageRoas: number;
    averageCpa: number; // in cents
    averageCtr: number; // percentage
    averageConversionRate: number; // percentage
  };
  source: string;
  lastUpdated: Date;
}

/**
 * Seasonality factor for recommendations
 */
export interface SeasonalityFactor {
  month: number; // 1-12
  dayOfWeek?: number; // 0-6 (optional)
  multiplier: number; // 1.0 = normal, >1 = high season, <1 = low season
  description: string;
}
