/**
 * Confidence Interval Calculations for A/B Testing
 * Epic #516
 *
 * Implements Wilson score confidence intervals for proportion-based metrics.
 * More accurate than normal approximation for small sample sizes.
 */

/**
 * Calculate Wilson score confidence interval for a proportion.
 *
 * Wilson score is more accurate than normal approximation, especially for:
 * - Small sample sizes
 * - Proportions near 0 or 1
 * - Unequal sample sizes
 *
 * @param successes - Number of conversions/successes
 * @param total - Total number of trials/impressions
 * @param confidenceLevel - Confidence level (e.g., 0.95 for 95%)
 * @returns Object with lower and upper bounds
 */
export function wilsonScoreInterval(
  successes: number,
  total: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  if (total === 0) {
    return { lower: 0, upper: 0 };
  }

  const p = successes / total;
  const z = getZScore(confidenceLevel);
  const z2 = z * z;

  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / denominator;

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/**
 * Get z-score for a given confidence level.
 *
 * @param confidenceLevel - Confidence level (e.g., 0.95)
 * @returns Z-score
 */
function getZScore(confidenceLevel: number): number {
  // Common confidence levels and their z-scores
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
    0.999: 3.291,
  };

  return zScores[confidenceLevel] ?? 1.96; // Default to 95%
}

/**
 * Calculate confidence interval for the difference between two proportions.
 *
 * This is useful for comparing two variants directly.
 *
 * @param p1 - Conversion rate of variant 1
 * @param n1 - Sample size of variant 1
 * @param p2 - Conversion rate of variant 2
 * @param n2 - Sample size of variant 2
 * @param confidenceLevel - Confidence level
 * @returns Confidence interval for (p1 - p2)
 */
export function proportionDifferenceInterval(
  p1: number,
  n1: number,
  p2: number,
  n2: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  if (n1 === 0 || n2 === 0) {
    return { lower: 0, upper: 0 };
  }

  const z = getZScore(confidenceLevel);
  const diff = p1 - p2;

  // Standard error of the difference
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);

  const margin = z * se;

  return {
    lower: diff - margin,
    upper: diff + margin,
  };
}

/**
 * Calculate confidence interval for lift (relative improvement).
 *
 * Lift = (variant - control) / control
 *
 * @param variantRate - Conversion rate of variant
 * @param variantN - Sample size of variant
 * @param controlRate - Conversion rate of control
 * @param controlN - Sample size of control
 * @param confidenceLevel - Confidence level
 * @returns Confidence interval for lift percentage
 */
export function liftInterval(
  variantRate: number,
  variantN: number,
  controlRate: number,
  controlN: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number; lift: number } {
  if (controlRate === 0 || variantN === 0 || controlN === 0) {
    return { lower: 0, upper: 0, lift: 0 };
  }

  const lift = (variantRate - controlRate) / controlRate;

  // Using delta method for lift CI
  const z = getZScore(confidenceLevel);

  const varVariant = (variantRate * (1 - variantRate)) / variantN;
  const varControl = (controlRate * (1 - controlRate)) / controlN;

  // Variance of lift using delta method
  const varLift =
    (1 / (controlRate * controlRate)) *
    (varVariant + (variantRate * variantRate * varControl) / (controlRate * controlRate));

  const margin = z * Math.sqrt(varLift);

  return {
    lower: lift - margin,
    upper: lift + margin,
    lift,
  };
}

/**
 * Check if confidence intervals overlap (suggesting no significant difference).
 *
 * @param ci1 - Confidence interval for variant 1
 * @param ci2 - Confidence interval for variant 2
 * @returns True if intervals overlap
 */
export function intervalsOverlap(
  ci1: { lower: number; upper: number },
  ci2: { lower: number; upper: number }
): boolean {
  return ci1.lower <= ci2.upper && ci2.lower <= ci1.upper;
}

/**
 * Calculate minimum sample size needed to detect a given effect size.
 *
 * @param baselineRate - Control conversion rate
 * @param effectSize - Minimum detectable effect (e.g., 0.1 for 10% relative improvement)
 * @param alpha - Significance level (default 0.05)
 * @param power - Statistical power (default 0.8)
 * @returns Minimum sample size per variant
 */
export function calculateMinimumSampleSize(
  baselineRate: number,
  effectSize: number,
  alpha: number = 0.05,
  power: number = 0.8
): number {
  if (baselineRate <= 0 || baselineRate >= 1 || effectSize <= 0) {
    return Infinity;
  }

  const zAlpha = getZScore(1 - alpha / 2);
  const zBeta = getZScore(power);

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + effectSize);

  if (p2 >= 1) {
    return Infinity;
  }

  const pBar = (p1 + p2) / 2;

  const n =
    ((zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) **
      2) /
    (p2 - p1) ** 2;

  return Math.ceil(n);
}

/**
 * Estimate statistical power for a given sample size.
 *
 * @param baselineRate - Control conversion rate
 * @param effectSize - Expected effect size
 * @param sampleSize - Sample size per variant
 * @param alpha - Significance level
 * @returns Estimated statistical power (0-1)
 */
export function estimatePower(
  baselineRate: number,
  effectSize: number,
  sampleSize: number,
  alpha: number = 0.05
): number {
  if (baselineRate <= 0 || baselineRate >= 1 || effectSize <= 0 || sampleSize <= 0) {
    return 0;
  }

  const zAlpha = getZScore(1 - alpha / 2);

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + effectSize);

  if (p2 >= 1) {
    return 0;
  }

  const pBar = (p1 + p2) / 2;

  const zBeta =
    ((p2 - p1) * Math.sqrt(sampleSize) - zAlpha * Math.sqrt(2 * pBar * (1 - pBar))) /
    Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));

  // Approximate power using normal CDF
  return normalCDF(zBeta);
}

/**
 * Cumulative Distribution Function for standard normal distribution.
 * Approximation using error function.
 *
 * @param x - The z-score
 * @returns Cumulative probability
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation (Abramowitz and Stegun).
 *
 * @param x - Input value
 * @returns Error function result
 */
function erf(x: number): number {
  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save sign of x
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  // Abramowitz and Stegun formula
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}
