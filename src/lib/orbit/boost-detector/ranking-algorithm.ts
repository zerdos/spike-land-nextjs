/**
 * Performance Ranking Algorithm
 *
 * Calculates performance scores for organic posts using weighted metrics
 * to identify top performers worthy of boosting.
 *
 * Resolves #521
 */

import type { PerformanceRankingConfig } from "@/generated/prisma";

/**
 * Post metrics for performance calculation
 */
export interface PostMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}

/**
 * Performance score result
 */
export interface PerformanceScore {
  score: number;
  engagementRate: number;
  normalizedMetrics: {
    impressions: number;
    reach: number;
    shares: number;
    clicks: number;
  };
}

/**
 * Calculate engagement rate from metrics
 */
export function calculateEngagementRate(metrics: PostMetrics): number {
  const { impressions, likes, comments, shares } = metrics;

  if (impressions === 0) {
    return 0;
  }

  const totalEngagements = likes + comments + shares;
  return totalEngagements / impressions;
}

/**
 * Normalize a metric value using min-max normalization
 * @param value - Current value
 * @param min - Minimum value in dataset
 * @param max - Maximum value in dataset
 * @returns Normalized value between 0 and 1
 */
export function normalizeMetric(
  value: number,
  min: number,
  max: number,
): number {
  if (max === min) {
    return 0;
  }
  return (value - min) / (max - min);
}

/**
 * Calculate performance score using weighted metrics
 * @param metrics - Post metrics
 * @param config - Ranking algorithm configuration
 * @param metricRanges - Min/max values for normalization
 * @returns Performance score between 0 and 1
 */
export function calculatePerformanceScore(
  metrics: PostMetrics,
  config: PerformanceRankingConfig,
  metricRanges: {
    impressions: { min: number; max: number; };
    reach: { min: number; max: number; };
    shares: { min: number; max: number; };
    clicks: { min: number; max: number; };
    engagementRate: { min: number; max: number; };
  },
): PerformanceScore {
  // Calculate engagement rate
  const engagementRate = calculateEngagementRate(metrics);

  // Normalize all metrics to 0-1 scale
  const normalizedImpressions = normalizeMetric(
    metrics.impressions,
    metricRanges.impressions.min,
    metricRanges.impressions.max,
  );

  const normalizedReach = normalizeMetric(
    metrics.reach,
    metricRanges.reach.min,
    metricRanges.reach.max,
  );

  const normalizedShares = normalizeMetric(
    metrics.shares,
    metricRanges.shares.min,
    metricRanges.shares.max,
  );

  const normalizedClicks = normalizeMetric(
    metrics.clicks,
    metricRanges.clicks.min,
    metricRanges.clicks.max,
  );

  const normalizedEngagementRate = normalizeMetric(
    engagementRate,
    metricRanges.engagementRate.min,
    metricRanges.engagementRate.max,
  );

  // Convert Decimal weights to numbers
  const engagementWeight = Number(config.engagementRateWeight);
  const impressionsWeight = Number(config.impressionsWeight);
  const reachWeight = Number(config.reachWeight);
  const sharesWeight = Number(config.sharesWeight);
  const clicksWeight = Number(config.clicksWeight);

  // Calculate weighted score
  const score =
    normalizedEngagementRate * engagementWeight +
    normalizedImpressions * impressionsWeight +
    normalizedReach * reachWeight +
    normalizedShares * sharesWeight +
    normalizedClicks * clicksWeight;

  return {
    score,
    engagementRate,
    normalizedMetrics: {
      impressions: normalizedImpressions,
      reach: normalizedReach,
      shares: normalizedShares,
      clicks: normalizedClicks,
    },
  };
}

/**
 * Calculate percentile rank for a score
 * @param score - Current score
 * @param allScores - All scores in the dataset (sorted ascending)
 * @returns Percentile rank between 0 and 1
 */
export function calculatePercentileRank(
  score: number,
  allScores: number[],
): number {
  if (allScores.length === 0) {
    return 0;
  }

  // Count scores below current score
  const belowCount = allScores.filter((s) => s < score).length;

  // Percentile rank
  return belowCount / allScores.length;
}

/**
 * Determine if a post is a top performer based on percentile
 * @param percentileRank - Percentile rank (0-1)
 * @param config - Ranking configuration
 * @returns True if top performer
 */
export function isTopPerformer(
  percentileRank: number,
  config: PerformanceRankingConfig,
): boolean {
  const threshold = Number(config.topPerformerPercentile);
  return percentileRank >= threshold;
}

/**
 * Check if a post meets minimum thresholds for ranking
 * @param metrics - Post metrics
 * @param config - Ranking configuration
 * @returns True if meets thresholds
 */
export function meetsMinimumThresholds(
  metrics: PostMetrics,
  config: PerformanceRankingConfig,
): boolean {
  const engagementRate = calculateEngagementRate(metrics);
  const minEngagementRate = Number(config.minEngagementRate);

  return (
    metrics.impressions >= config.minImpressions &&
    engagementRate >= minEngagementRate
  );
}
