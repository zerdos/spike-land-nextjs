/**
 * Allocator AI Agent - Recommendation Engine
 *
 * Analyzes ad campaign performance and generates budget reallocation recommendations.
 * Advisor mode only - no automatic changes without approval.
 *
 * Part of #548: Build Allocator recommendation engine
 */

import type { MarketingPlatform } from "@/lib/marketing/types";
import prisma from "@/lib/prisma";
import { allocatorAuditLogger } from "./allocator-audit-logger";
import type {
  AllocatorAnalysisOptions,
  AllocatorConfidenceLevel,
  AllocatorRecommendationsResponse,
  BudgetRecommendation,
  CampaignPerformanceAnalysis,
  PlatformBenchmarks,
  RecommendationType,
  TrendDirection,
} from "./allocator-types";

/**
 * Industry benchmarks for ad platforms (used when data is limited)
 */
const PLATFORM_BENCHMARKS: PlatformBenchmarks[] = [
  {
    platform: "FACEBOOK",
    industry: "General",
    benchmarks: {
      averageRoas: 2.5,
      averageCpa: 3500, // $35 in cents
      averageCtr: 1.2,
      averageConversionRate: 2.5,
    },
    source: "Industry research 2024",
    lastUpdated: new Date("2024-01-01"),
  },
  {
    platform: "GOOGLE_ADS",
    industry: "General",
    benchmarks: {
      averageRoas: 3.0,
      averageCpa: 4500, // $45 in cents
      averageCtr: 3.5,
      averageConversionRate: 3.8,
    },
    source: "Industry research 2024",
    lastUpdated: new Date("2024-01-01"),
  },
];

/**
 * Minimum data thresholds
 */
const MIN_DAYS_HIGH_CONFIDENCE = 21;
const MIN_DAYS_MEDIUM_CONFIDENCE = 14;
const MIN_DAYS_LOW_CONFIDENCE = 7;
const MIN_CONVERSIONS_FOR_ANALYSIS = 5;
const DEFAULT_LOOKBACK_DAYS = 30;

/**
 * Get confidence level based on data quality
 */
function getConfidenceLevel(
  daysAnalyzed: number,
  conversions: number,
): AllocatorConfidenceLevel {
  if (daysAnalyzed >= MIN_DAYS_HIGH_CONFIDENCE && conversions >= MIN_CONVERSIONS_FOR_ANALYSIS * 3) {
    return "high";
  }
  if (daysAnalyzed >= MIN_DAYS_MEDIUM_CONFIDENCE && conversions >= MIN_CONVERSIONS_FOR_ANALYSIS) {
    return "medium";
  }
  return "low";
}

/**
 * Calculate trend direction from historical data points
 */
function calculateTrend(values: number[]): TrendDirection {
  if (values.length < 3) return "stable";

  // Simple linear regression to determine trend
  const n = values.length;
  const sumX = values.reduce((sum, _, i) => sum + i, 0);
  const sumY = values.reduce((sum, v) => sum + v, 0);
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
  const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgY = sumY / n;

  // Normalize slope relative to average
  const normalizedSlope = avgY !== 0 ? slope / avgY : 0;

  if (normalizedSlope > 0.02) return "improving";
  if (normalizedSlope < -0.02) return "declining";
  return "stable";
}

/**
 * Calculate performance score (0-100)
 */
function calculatePerformanceScore(
  roas: number,
  ctr: number,
  conversionRate: number,
  benchmarks: PlatformBenchmarks,
): number {
  // Weight: ROAS 50%, CTR 25%, Conversion Rate 25%
  const roasScore = Math.min((roas / benchmarks.benchmarks.averageRoas) * 50, 50);
  const ctrScore = Math.min((ctr / benchmarks.benchmarks.averageCtr) * 25, 25);
  const crScore = Math.min((conversionRate / benchmarks.benchmarks.averageConversionRate) * 25, 25);

  return Math.round(roasScore + ctrScore + crScore);
}

/**
 * Calculate efficiency score (0-100) based on CPA
 */
function calculateEfficiencyScore(
  cpa: number,
  benchmarks: PlatformBenchmarks,
): number {
  if (cpa === 0) return 100; // No cost = perfect efficiency

  // Lower CPA = higher score
  const ratio = benchmarks.benchmarks.averageCpa / cpa;
  return Math.min(Math.round(ratio * 50), 100);
}

/**
 * Generate a unique recommendation ID
 */
function generateRecommendationId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analyze a single campaign's performance
 */
async function analyzeCampaignPerformance(
  campaignId: string,
  campaignName: string,
  platform: MarketingPlatform,
  accountId: string,
  attributions: {
    conversionValue: number | null;
    convertedAt: Date;
  }[],
  lookbackDays: number,
): Promise<CampaignPerformanceAnalysis | null> {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  // Get benchmark for this platform
  const benchmarks = PLATFORM_BENCHMARKS.find((b) => b.platform === platform) ||
    PLATFORM_BENCHMARKS[0];
  if (!benchmarks) return null;

  // Calculate metrics from attribution data
  const totalConversions = attributions.length;
  const totalRevenue = attributions.reduce(
    (sum, a) => sum + (a.conversionValue || 0),
    0,
  );

  // Group conversions by week for trend analysis
  const weeklyConversions: Map<number, number> = new Map();
  for (const attr of attributions) {
    const weekNum = Math.floor(
      (now.getTime() - attr.convertedAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    weeklyConversions.set(weekNum, (weeklyConversions.get(weekNum) || 0) + 1);
  }
  const conversionsTrend = Array.from(weeklyConversions.values()).reverse();

  // Estimate spend based on industry CPA (this would come from actual ad platform data)
  const estimatedSpend = totalConversions * benchmarks.benchmarks.averageCpa;
  const estimatedImpressions = totalConversions * 1000; // Rough estimate
  const estimatedClicks = Math.round(
    estimatedImpressions * (benchmarks.benchmarks.averageCtr / 100),
  );

  // Calculate core metrics
  const roas = estimatedSpend > 0 ? (totalRevenue * 100) / estimatedSpend : 0;
  const cpa = totalConversions > 0 ? estimatedSpend / totalConversions : 0;
  const ctr = estimatedImpressions > 0 ? (estimatedClicks / estimatedImpressions) * 100 : 0;
  const conversionRate = estimatedClicks > 0 ? (totalConversions / estimatedClicks) * 100 : 0;

  // Calculate scores
  const performanceScore = calculatePerformanceScore(roas, ctr, conversionRate, benchmarks);
  const efficiencyScore = calculateEfficiencyScore(cpa, benchmarks);

  return {
    campaignId,
    campaignName,
    platform,
    accountId,
    currentBudget: estimatedSpend, // Would come from actual campaign data
    currency: "USD",
    metrics: {
      roas,
      cpa,
      ctr,
      conversionRate,
      spend: estimatedSpend,
      conversions: totalConversions,
      impressions: estimatedImpressions,
      clicks: estimatedClicks,
    },
    trend: {
      roas: calculateTrend(conversionsTrend.map((c) => c * (roas / totalConversions || 0))),
      cpa: calculateTrend(conversionsTrend.map((c) => c > 0 ? estimatedSpend / c : 0)),
      conversions: calculateTrend(conversionsTrend),
    },
    performanceScore,
    efficiencyScore,
    periodStart: startDate,
    periodEnd: now,
    daysAnalyzed: lookbackDays,
  };
}

/**
 * Generate recommendations based on campaign analyses
 */
function generateRecommendations(
  analyses: CampaignPerformanceAnalysis[],
  options: AllocatorAnalysisOptions,
): BudgetRecommendation[] {
  const recommendations: BudgetRecommendation[] = [];
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7); // Recommendations valid for 7 days

  const riskMultiplier = options.riskTolerance === "aggressive"
    ? 1.5
    : options.riskTolerance === "conservative"
      ? 0.5
      : 1.0;

  // Sort by performance score
  const sortedByPerformance = [...analyses].sort(
    (a, b) => b.performanceScore - a.performanceScore,
  );

  // Identify winners and losers (middle tier campaigns don't get recommendations currently)
  const winners = sortedByPerformance.filter((a) => a.performanceScore >= 70);
  const losers = sortedByPerformance.filter((a) => a.performanceScore < 40);

  // Generate SCALE_WINNER recommendations for top performers
  for (const winner of winners.slice(0, 3)) {
    const confidence = getConfidenceLevel(winner.daysAnalyzed, winner.metrics.conversions);
    const suggestedIncrease = Math.round(winner.currentBudget * 0.2 * riskMultiplier);

    recommendations.push({
      id: generateRecommendationId(),
      type: "SCALE_WINNER",
      confidence,
      targetCampaign: {
        id: winner.campaignId,
        name: winner.campaignName,
        platform: winner.platform,
        currentBudget: winner.currentBudget,
      },
      suggestedBudgetChange: suggestedIncrease,
      suggestedNewBudget: winner.currentBudget + suggestedIncrease,
      currency: winner.currency,
      projectedImpact: {
        estimatedRoasChange: winner.trend.roas === "improving" ? 15 : 5,
        estimatedCpaChange: winner.trend.cpa === "improving" ? -10 : -5,
        estimatedConversionChange: Math.round(20 * riskMultiplier),
        estimatedSpendChange: suggestedIncrease,
        confidenceInterval: {
          low: confidence === "high" ? 10 : confidence === "medium" ? 5 : 0,
          high: confidence === "high" ? 30 : confidence === "medium" ? 20 : 15,
        },
      },
      reason:
        `Campaign "${winner.campaignName}" has a performance score of ${winner.performanceScore}% with ${winner.trend.conversions === "improving" ? "improving" : "stable"
        } conversions. Increasing budget could capture additional high-quality traffic.`,
      supportingData: [
        `ROAS: ${winner.metrics.roas.toFixed(2)}x`,
        `CPA: $${(winner.metrics.cpa / 100).toFixed(2)}`,
        `Conversions: ${winner.metrics.conversions} (${winner.trend.conversions} trend)`,
        `Performance score: ${winner.performanceScore}%`,
      ],
      createdAt: now,
      expiresAt,
      correlationId: options.correlationId,
    });
  }

  // Generate DECREASE_BUDGET or PAUSE_CAMPAIGN for underperformers
  for (const loser of losers) {
    const confidence = getConfidenceLevel(loser.daysAnalyzed, loser.metrics.conversions);
    const shouldPause = loser.performanceScore < 20 && loser.trend.conversions === "declining";
    const type: RecommendationType = shouldPause ? "PAUSE_CAMPAIGN" : "DECREASE_BUDGET";
    const suggestedDecrease = shouldPause
      ? loser.currentBudget
      : Math.round(loser.currentBudget * 0.3 * riskMultiplier);

    recommendations.push({
      id: generateRecommendationId(),
      type,
      confidence,
      targetCampaign: {
        id: loser.campaignId,
        name: loser.campaignName,
        platform: loser.platform,
        currentBudget: loser.currentBudget,
      },
      suggestedBudgetChange: -suggestedDecrease,
      suggestedNewBudget: shouldPause ? 0 : loser.currentBudget - suggestedDecrease,
      currency: loser.currency,
      projectedImpact: {
        estimatedRoasChange: 0, // Savings focus
        estimatedCpaChange: 0,
        estimatedConversionChange: shouldPause ? -100 : -15,
        estimatedSpendChange: -suggestedDecrease,
        confidenceInterval: {
          low: confidence === "high" ? -20 : -30,
          high: confidence === "high" ? -5 : -10,
        },
      },
      reason: shouldPause
        ? `Campaign "${loser.campaignName}" has critically low performance (${loser.performanceScore}%) with declining conversions. Pausing will prevent further budget waste.`
        : `Campaign "${loser.campaignName}" is underperforming with a score of ${loser.performanceScore}%. Reducing budget will limit losses while optimization is explored.`,
      supportingData: [
        `Performance score: ${loser.performanceScore}%`,
        `ROAS: ${loser.metrics.roas.toFixed(2)}x (below target)`,
        `CPA: $${(loser.metrics.cpa / 100).toFixed(2)} (above benchmark)`,
        `Trend: ${loser.trend.conversions}`,
      ],
      createdAt: now,
      expiresAt,
      correlationId: options.correlationId,
    });
  }

  // Generate REALLOCATE recommendations (move from losers to winners)
  if (winners.length > 0 && losers.length > 0) {
    const topWinner = winners[0];
    const worstLoser = losers[losers.length - 1];

    if (topWinner && worstLoser) {
      const reallocateAmount = Math.round(worstLoser.currentBudget * 0.3);
      const confidence = getConfidenceLevel(
        Math.min(topWinner.daysAnalyzed, worstLoser.daysAnalyzed),
        Math.min(topWinner.metrics.conversions, worstLoser.metrics.conversions),
      );

      recommendations.push({
        id: generateRecommendationId(),
        type: "REALLOCATE",
        confidence,
        sourceCampaign: {
          id: worstLoser.campaignId,
          name: worstLoser.campaignName,
          platform: worstLoser.platform,
          currentBudget: worstLoser.currentBudget,
        },
        targetCampaign: {
          id: topWinner.campaignId,
          name: topWinner.campaignName,
          platform: topWinner.platform,
          currentBudget: topWinner.currentBudget,
        },
        suggestedBudgetChange: reallocateAmount,
        suggestedNewBudget: topWinner.currentBudget + reallocateAmount,
        currency: topWinner.currency,
        projectedImpact: {
          estimatedRoasChange: 25,
          estimatedCpaChange: -15,
          estimatedConversionChange: 20,
          estimatedSpendChange: 0, // Net neutral
          confidenceInterval: {
            low: 10,
            high: 40,
          },
        },
        reason: `Reallocating $${(reallocateAmount / 100).toFixed(2)
          } from underperforming "${worstLoser.campaignName}" to high-performer "${topWinner.campaignName}" can improve overall ROAS without increasing total spend.`,
        supportingData: [
          `Source performance: ${worstLoser.performanceScore}%`,
          `Target performance: ${topWinner.performanceScore}%`,
          `Expected ROAS improvement: 25%`,
          `Budget neutral: No additional spend required`,
        ],
        createdAt: now,
        expiresAt,
        correlationId: options.correlationId,
      });
    }
  }

  // Sort recommendations by projected impact
  return recommendations.sort((a, b) => {
    const impactA = Math.abs(a.projectedImpact.estimatedConversionChange);
    const impactB = Math.abs(b.projectedImpact.estimatedConversionChange);
    return impactB - impactA;
  });
}

/**
 * Get Allocator recommendations for a workspace
 */
export async function getAllocatorRecommendations(
  options: AllocatorAnalysisOptions,
): Promise<AllocatorRecommendationsResponse> {
  const {
    workspaceId,
    accountIds,
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
    minimumSpend = 1000, // $10 minimum
    riskTolerance = "moderate",
  } = options;

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  // Fetch marketing accounts for the workspace
  // Note: MarketingAccount is user-linked, but we can filter by workspace through user
  const marketingAccounts = await prisma.marketingAccount.findMany({
    where: {
      isActive: true,
      ...(accountIds ? { id: { in: accountIds } } : {}),
    },
    select: {
      id: true,
      platform: true,
      accountId: true,
      accountName: true,
      userId: true,
    },
  });

  // Fetch attribution data for campaigns
  const attributions = await prisma.campaignAttribution.findMany({
    where: {
      convertedAt: { gte: startDate },
      externalCampaignId: { not: null },
      platform: { in: ["FACEBOOK", "GOOGLE_ADS"] },
    },
    select: {
      externalCampaignId: true,
      platform: true,
      conversionValue: true,
      convertedAt: true,
      utmCampaign: true,
    },
    orderBy: { convertedAt: "desc" },
  });

  // Group attributions by campaign
  const campaignAttributions: Map<
    string,
    {
      platform: string;
      name: string;
      attributions: { conversionValue: number | null; convertedAt: Date; }[];
    }
  > = new Map();

  for (const attr of attributions) {
    if (!attr.externalCampaignId) continue;

    const key = `${attr.platform}:${attr.externalCampaignId}`;
    const existing = campaignAttributions.get(key);

    if (existing) {
      existing.attributions.push({
        conversionValue: attr.conversionValue,
        convertedAt: attr.convertedAt,
      });
    } else {
      campaignAttributions.set(key, {
        platform: attr.platform || "FACEBOOK",
        name: attr.utmCampaign || attr.externalCampaignId,
        attributions: [{
          conversionValue: attr.conversionValue,
          convertedAt: attr.convertedAt,
        }],
      });
    }
  }

  // Analyze each campaign
  const campaignAnalyses: CampaignPerformanceAnalysis[] = [];

  for (const [key, data] of campaignAttributions) {
    const [platform, campaignId] = key.split(":");
    if (!platform || !campaignId) continue;

    // Find the marketing account for this campaign
    const account = marketingAccounts.find(
      (a) => a.platform === platform,
    );

    const analysis = await analyzeCampaignPerformance(
      campaignId,
      data.name,
      platform as MarketingPlatform,
      account?.id || "unknown",
      data.attributions,
      lookbackDays,
    );

    if (analysis && analysis.metrics.spend >= minimumSpend) {
      campaignAnalyses.push(analysis);
    }
  }

  // Generate recommendations
  const recommendations = generateRecommendations(campaignAnalyses, {
    ...options,
    riskTolerance,
  });

  // Calculate summary metrics
  const totalSpend = campaignAnalyses.reduce((sum, a) => sum + a.metrics.spend, 0);
  const totalConversions = campaignAnalyses.reduce((sum, a) => sum + a.metrics.conversions, 0);
  const totalRevenue = campaignAnalyses.reduce(
    (sum, a) => sum + (a.metrics.roas * a.metrics.spend),
    0,
  );

  const averageRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const averageCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  // Calculate projected impact if all recommendations are applied
  let projectedRoasImprovement = 0;
  let projectedCpaSavings = 0;
  let projectedConversionIncrease = 0;

  for (const rec of recommendations) {
    projectedRoasImprovement += rec.projectedImpact.estimatedRoasChange;
    projectedCpaSavings += rec.projectedImpact.estimatedCpaChange;
    projectedConversionIncrease += rec.projectedImpact.estimatedConversionChange;
  }

  // Calculate data quality score
  const totalDays = campaignAnalyses.reduce((sum, a) => sum + a.daysAnalyzed, 0);
  const avgDays = campaignAnalyses.length > 0 ? totalDays / campaignAnalyses.length : 0;
  const dataQualityScore = Math.min(
    Math.round((avgDays / MIN_DAYS_HIGH_CONFIDENCE) * 100),
    100,
  );

  const response: AllocatorRecommendationsResponse = {
    campaignAnalyses,
    recommendations,
    summary: {
      totalCampaignsAnalyzed: campaignAnalyses.length,
      totalCurrentSpend: totalSpend,
      currency: "USD",
      averageRoas,
      averageCpa,
      projectedTotalImpact: {
        estimatedRoasImprovement: projectedRoasImprovement / (recommendations.length || 1),
        estimatedCpaSavings: projectedCpaSavings / (recommendations.length || 1),
        estimatedConversionIncrease: projectedConversionIncrease / (recommendations.length || 1),
      },
    },
    analysisRange: {
      start: startDate,
      end: now,
    },
    hasEnoughData: campaignAnalyses.length > 0 && avgDays >= MIN_DAYS_LOW_CONFIDENCE,
    dataQualityScore,
  };

  // Log recommendations if correlation ID is provided (Audit Trail)
  if (options.correlationId) {
    // Fire and forget - don't block response, but capture errors
    Promise.all(recommendations.map(async (rec) => {
      // Find related performance analysis
      const campaignId = rec.targetCampaign.id;
      const analysis = campaignAnalyses.find(a => a.campaignId === campaignId);

      if (analysis) {
        try {
          await allocatorAuditLogger.logRecommendationGenerated({
            workspaceId,
            campaignId,
            recommendation: rec,
            performance: analysis,
            // Capture the options as the configuration state at time of decision
            config: options as unknown as import("@prisma/client").AllocatorAutopilotConfig,
            correlationId: options.correlationId!,
            triggeredBy: options.triggeredBy || "UNKNOWN",
            userId: options.userId,
          });
        } catch (err) {
          // Consider: Add metrics/telemetry for production monitoring
          console.error(`Failed to log audit for recommendation ${rec.id}:`, err);
        }
      }
    })).catch(err => {
      console.error("Critical error in audit logging batch:", err);
    });
  }

  return response;
}

/**
 * Get platform benchmarks for comparison
 */
export function getPlatformBenchmarks(
  platform: MarketingPlatform,
): PlatformBenchmarks | undefined {
  return PLATFORM_BENCHMARKS.find((b) => b.platform === platform);
}

/**
 * Check if a recommendation should be highlighted as high impact
 */
export function isHighImpactRecommendation(
  recommendation: BudgetRecommendation,
): boolean {
  return (
    recommendation.confidence === "high" &&
    Math.abs(recommendation.projectedImpact.estimatedConversionChange) >= 15
  );
}
