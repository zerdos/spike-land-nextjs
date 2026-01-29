/**
 * A/B test statistical significance calculator
 *
 * Calculates statistical significance for variant testing using chi-square test.
 * Resolves #551
 */

import logger from "@/lib/logger";
import type {
  StatisticalSignificance,
  AbTestVariantMetrics,
} from "@/types/variant-generator";

/**
 * Calculate z-score for two proportions
 */
function calculateZScore(
  p1: number,
  n1: number,
  p2: number,
  n2: number,
): number {
  // Pooled proportion
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  // Z-score
  const zScore = (p1 - p2) / se;

  return zScore;
}

/**
 * Calculate p-value from z-score (two-tailed test)
 */
function calculatePValue(zScore: number): number {
  // Absolute value for two-tailed test
  const absZ = Math.abs(zScore);

  // Approximation of cumulative distribution function
  // Using error function approximation
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp((-absZ * absZ) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  // Two-tailed p-value
  return 2 * p;
}

/**
 * Calculate recommended sample size for desired power
 *
 * @param baselineRate - Baseline conversion rate (e.g., 0.05 for 5%)
 * @param minimumDetectableEffect - Minimum effect to detect (e.g., 0.01 for 1% absolute increase)
 * @param alpha - Significance level (default: 0.05)
 * @param power - Statistical power (default: 0.80)
 * @returns Recommended sample size per variant
 */
export function calculateSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  _alpha: number = 0.05,
  _power: number = 0.80,
): number {
  // Z-scores for alpha and beta
  const zAlpha = 1.96; // For alpha = 0.05 (two-tailed)
  const zBeta = 0.84; // For power = 0.80

  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pAvg = (p1 + p2) / 2;

  // Sample size formula for two proportions
  const n =
    (Math.pow(zAlpha + zBeta, 2) * 2 * pAvg * (1 - pAvg)) /
    Math.pow(p2 - p1, 2);

  return Math.ceil(n);
}

/**
 * Calculate statistical significance between two variants
 *
 * @param variantA - Metrics for variant A
 * @param variantB - Metrics for variant B
 * @param significanceLevel - Desired confidence level (default: 0.95)
 * @returns Statistical significance result
 */
export function calculateSignificance(
  variantA: AbTestVariantMetrics,
  variantB: AbTestVariantMetrics,
  significanceLevel: number = 0.95,
): StatisticalSignificance {
  logger.info("[AB_TEST_CALCULATOR] Calculating statistical significance", {
    variantA: variantA.variantId,
    variantB: variantB.variantId,
    significanceLevel,
  });

  // Use conversion rate for significance testing
  const crA = variantA.conversionRate;
  const crB = variantB.conversionRate;
  const nA = variantA.impressions;
  const nB = variantB.impressions;

  // Minimum sample size check
  const MIN_SAMPLE_SIZE = 30;
  if (nA < MIN_SAMPLE_SIZE || nB < MIN_SAMPLE_SIZE) {
    logger.warn("[AB_TEST_CALCULATOR] Insufficient sample size", {
      sampleA: nA,
      sampleB: nB,
      minRequired: MIN_SAMPLE_SIZE,
    });

    return {
      isSignificant: false,
      confidenceLevel: 0,
      pValue: 1,
      zScore: 0,
      recommendedSampleSize: Math.max(
        MIN_SAMPLE_SIZE,
        calculateSampleSize(Math.max(crA, crB), 0.01),
      ),
    };
  }

  // Calculate z-score
  const zScore = calculateZScore(crA, nA, crB, nB);

  // Calculate p-value
  const pValue = calculatePValue(zScore);

  // Determine if significant
  const alpha = 1 - significanceLevel;
  const isSignificant = pValue < alpha;

  // Determine winner if significant
  let winnerVariantId: string | undefined;
  if (isSignificant) {
    winnerVariantId = crA > crB ? variantA.variantId : variantB.variantId;
  }

  // Calculate confidence level
  const confidenceLevel = 1 - pValue;

  // Recommended sample size for future tests
  const baselineRate = Math.max(crA, crB);
  const recommendedSampleSize = calculateSampleSize(baselineRate, 0.01);

  const result: StatisticalSignificance = {
    isSignificant,
    confidenceLevel: Math.max(0, Math.min(1, confidenceLevel)),
    pValue,
    zScore,
    winnerVariantId,
    recommendedSampleSize,
  };

  logger.info("[AB_TEST_CALCULATOR] Significance calculated", {
    isSignificant: result.isSignificant,
    pValue: result.pValue.toFixed(4),
    zScore: result.zScore.toFixed(4),
    winner: result.winnerVariantId,
  });

  return result;
}

/**
 * Calculate confidence intervals for a conversion rate
 *
 * @param conversions - Number of conversions
 * @param impressions - Total impressions
 * @param confidenceLevel - Desired confidence level (default: 0.95)
 * @returns [lower bound, upper bound] of confidence interval
 */
export function calculateConfidenceInterval(
  conversions: number,
  impressions: number,
  confidenceLevel: number = 0.95,
): [number, number] {
  if (impressions === 0) return [0, 0];

  const rate = conversions / impressions;

  // Z-score for confidence level (1.96 for 95%)
  const zScore = confidenceLevel === 0.95 ? 1.96 : 2.576; // 95% or 99%

  // Standard error
  const se = Math.sqrt((rate * (1 - rate)) / impressions);

  // Margin of error
  const margin = zScore * se;

  return [Math.max(0, rate - margin), Math.min(1, rate + margin)];
}

/**
 * Determine if test should continue or can be stopped early
 *
 * @param significance - Statistical significance result
 * @param currentSampleSize - Current sample size per variant
 * @param maxSampleSize - Maximum planned sample size
 * @returns Recommendation object
 */
export function shouldStopTest(
  significance: StatisticalSignificance,
  currentSampleSize: number,
  maxSampleSize: number,
): {
  shouldStop: boolean;
  reason: string;
  recommendation: string;
} {
  // Stop if statistically significant and minimum sample reached
  if (significance.isSignificant && currentSampleSize >= 100) {
    return {
      shouldStop: true,
      reason: "Statistical significance achieved",
      recommendation: `Winner: ${significance.winnerVariantId}. Confidence: ${(significance.confidenceLevel * 100).toFixed(1)}%`,
    };
  }

  // Stop if max sample size reached without significance
  if (currentSampleSize >= maxSampleSize && !significance.isSignificant) {
    return {
      shouldStop: true,
      reason: "Maximum sample size reached without significance",
      recommendation:
        "No clear winner. Consider the variants equivalent or run a new test with larger differences.",
    };
  }

  // Continue test
  const remaining = significance.recommendedSampleSize - currentSampleSize;
  return {
    shouldStop: false,
    reason: "Insufficient data for conclusion",
    recommendation: `Continue test. Need approximately ${remaining > 0 ? remaining : 0} more samples per variant.`,
  };
}
