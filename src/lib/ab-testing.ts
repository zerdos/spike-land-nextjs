// @ts-ignore
import jStat from 'jstat';

/**
 * Calculates the chi-squared statistic for an A/B test.
 *
 * @param variants - An array of variants, each with visitors and conversions.
 * @returns The chi-squared statistic.
 */
export function calculateChiSquared(
  variants: { visitors: number; conversions: number; }[],
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
 * Calculates the p-value from a chi-squared statistic using the jStat library.
 *
 * @param chiSquared - The chi-squared statistic.
 * @param df - The degrees of freedom.
 * @returns The p-value.
 */
export function chiSquaredToPValue(chiSquared: number, df: number = 1): number {
  return 1 - jStat.chisquare.cdf(chiSquared, df);
}
