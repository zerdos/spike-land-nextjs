// src/lib/ab-testing.ts

export interface Variant {
  visitors: number;
  conversions: number;
}

/**
 * Calculates the chi-squared statistic for an A/B test.
 *
 * @param variants - An array of variants, each with visitors and conversions.
 * @returns The chi-squared statistic.
 */
export function calculateChiSquared(
  variants: Variant[],
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
    const expectedNonConversions = variant.visitors *
      (1 - overallConversionRate);

    const observedConversions = variant.conversions;
    const observedNonConversions = variant.visitors - variant.conversions;

    if (expectedConversions > 0) {
      chiSquared += Math.pow(observedConversions - expectedConversions, 2) /
        expectedConversions;
    }
    if (expectedNonConversions > 0) {
      chiSquared += Math.pow(observedNonConversions - expectedNonConversions, 2) /
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
