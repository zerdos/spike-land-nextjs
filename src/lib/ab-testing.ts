import jStat from "jstat";

// src/lib/ab-testing.ts
type Variant = {
  id: string;
  name: string;
  visitors: number;
  conversions: number;
};

/**
 * Calculates the chi-squared statistic for an A/B test.
 *
 * @param variants - An array of variants, each with visitors and conversions.
 * @returns The chi-squared statistic.
 */
export function calculateChiSquared(
  variants: { visitors: number; conversions: number }[],
) {
  const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

  if (totalVisitors === 0) {
    return 0;
  }

  const overallConversionRate = totalConversions / totalVisitors;

  let chiSquared = 0;
  for (const variant of variants) {
    const expectedConversions = variant.visitors * overallConversionRate;
    const expectedNonConversions =
      variant.visitors * (1 - overallConversionRate);

    const observedConversions = variant.conversions;
    const observedNonConversions = variant.visitors - variant.conversions;

    if (expectedConversions > 0) {
      chiSquared +=
        Math.pow(observedConversions - expectedConversions, 2) /
        expectedConversions;
    }
    if (expectedNonConversions > 0) {
      chiSquared +=
        Math.pow(observedNonConversions - expectedNonConversions, 2) /
        expectedNonConversions;
    }
  }

  return chiSquared;
}

/**
 * A simplified function to get the p-value from a chi-squared statistic.
 * For a real-world application, a more robust library would be used.
 * This implementation is for a chi-squared distribution with 1 degree of freedom,
 * which is common for A/B tests with two variants.
 *
 * @param chiSquared - The chi-squared statistic.
 * @param df - The degrees of freedom.
 * @returns The p-value.
 */
export function chiSquaredToPValue(chiSquared: number, df: number = 1) {
  // This is a simplified lookup table for a chi-squared distribution with 1 df.
  // A proper implementation would use a gamma function or a more extensive table.
  if (df === 1) {
    if (chiSquared > 10.83) return 0.001;
    if (chiSquared > 6.63) return 0.01;
    if (chiSquared > 5.41) return 0.02;
    if (chiSquared > 3.84) return 0.05;
    if (chiSquared > 2.71) return 0.1;
  }
  return 1.0;
}

/**
 * Calculates the required sample size for an A/B test.
 *
 * @param baselineConversionRate - The conversion rate of the control variant.
 * @param minimumDetectableEffect - The minimum relative effect size you want to detect.
 * @param alpha - The significance level (e.g., 0.05 for 95% confidence).
 * @param power - The statistical power (e.g., 0.8 for 80% power).
 * @returns The required sample size per variant.
 */
export function calculateRequiredSampleSize(
  baselineConversionRate: number,
  minimumDetectableEffect: number,
  alpha: number = 0.05,
  power: number = 0.8,
): number {
  if (
    baselineConversionRate <= 0 ||
    baselineConversionRate >= 1 ||
    minimumDetectableEffect <= 0
  ) {
    return Infinity;
  }

  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const zBeta = jStat.normal.inv(power, 0, 1);
  const p1 = baselineConversionRate;
  const p2 = baselineConversionRate * (1 + minimumDetectableEffect);

  const n =
    ((zAlpha * Math.sqrt(2 * p1 * (1 - p1))) / (p2 - p1)) ** 2 +
    ((zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) / (p2 - p1)) ** 2;

  return Math.ceil(n);
}

/**
 * Determines the winner of an A/B test.
 *
 * @param variants - An array of variants with their performance data.
 * @param alpha - The significance level.
 * @returns The winning variant or null if there is no statistically significant winner.
 */
export function getWinner(
  variants: Variant[],
  alpha: number = 0.05,
): Variant | null {
  if (variants.length < 2) {
    return null;
  }

  const chiSquared = calculateChiSquared(variants);
  const df = variants.length - 1;
  const pValue = 1 - jStat.chisquare.cdf(chiSquared, df);

  if (pValue < alpha) {
    return variants.reduce((best, current) => {
      const bestConversionRate = best.visitors > 0
        ? best.conversions / best.visitors
        : 0;
      const currentConversionRate = current.visitors > 0
        ? current.conversions / current.visitors
        : 0;
      return currentConversionRate > bestConversionRate ? current : best;
    });
  }

  return null;
}
