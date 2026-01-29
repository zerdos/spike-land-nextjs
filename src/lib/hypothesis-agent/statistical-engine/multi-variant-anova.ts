/**
 * Multi-Variant ANOVA for A/B/n Testing
 * Epic #516
 *
 * Performs one-way ANOVA to test if there are significant differences
 * among multiple variants (more than 2).
 */

/**
 * ANOVA result structure.
 */
export interface ANOVAResult {
  fStatistic: number;
  pValue: number;
  isSignificant: boolean;
  degreesOfFreedomBetween: number;
  degreesOfFreedomWithin: number;
  meanSquareBetween: number;
  meanSquareWithin: number;
}

/**
 * Variant data for ANOVA.
 */
export interface VariantData {
  id: string;
  conversions: number;
  total: number;
}

/**
 * Perform one-way ANOVA for multiple proportions.
 *
 * Tests null hypothesis: All variants have the same conversion rate.
 *
 * @param variants - Array of variant data
 * @param alpha - Significance level (default 0.05)
 * @returns ANOVA result
 */
export function oneWayANOVA(
  variants: VariantData[],
  alpha: number = 0.05
): ANOVAResult {
  if (variants.length < 2) {
    return {
      fStatistic: 0,
      pValue: 1,
      isSignificant: false,
      degreesOfFreedomBetween: 0,
      degreesOfFreedomWithin: 0,
      meanSquareBetween: 0,
      meanSquareWithin: 0,
    };
  }

  // Calculate conversion rates
  const rates = variants.map((v) => (v.total > 0 ? v.conversions / v.total : 0));

  // Calculate overall mean
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
  const totalSamples = variants.reduce((sum, v) => sum + v.total, 0);
  const grandMean = totalSamples > 0 ? totalConversions / totalSamples : 0;

  // Calculate sum of squares between groups (SSB)
  let ssb = 0;
  for (let i = 0; i < variants.length; i++) {
    const rate = rates[i];
    const variant = variants[i];
    if (rate !== undefined && variant !== undefined) {
      ssb += variant.total * Math.pow(rate - grandMean, 2);
    }
  }

  // Calculate sum of squares within groups (SSW)
  // For proportions, variance = p(1-p)
  let ssw = 0;
  for (let i = 0; i < variants.length; i++) {
    const rate = rates[i];
    const variant = variants[i];
    if (rate !== undefined && variant !== undefined) {
      ssw += variant.total * rate * (1 - rate);
    }
  }

  // Degrees of freedom
  const k = variants.length; // Number of groups
  const N = totalSamples; // Total sample size
  const dfBetween = k - 1;
  const dfWithin = N - k;

  // Mean squares
  const msb = dfBetween > 0 ? ssb / dfBetween : 0;
  const msw = dfWithin > 0 ? ssw / dfWithin : 0;

  // F-statistic
  const fStatistic = msw > 0 ? msb / msw : 0;

  // P-value from F-distribution
  const pValue = fCDF(fStatistic, dfBetween, dfWithin);

  return {
    fStatistic,
    pValue: 1 - pValue, // Right-tail probability
    isSignificant: 1 - pValue < alpha,
    degreesOfFreedomBetween: dfBetween,
    degreesOfFreedomWithin: dfWithin,
    meanSquareBetween: msb,
    meanSquareWithin: msw,
  };
}

/**
 * Perform post-hoc pairwise comparisons using Bonferroni correction.
 *
 * After finding significant ANOVA result, this identifies which
 * specific pairs of variants differ.
 *
 * @param variants - Array of variant data
 * @param alpha - Family-wise error rate (default 0.05)
 * @returns Matrix of pairwise comparisons
 */
export function pairwiseComparisons(
  variants: VariantData[],
  alpha: number = 0.05
): Array<{
  variant1: string;
  variant2: string;
  pValue: number;
  isSignificant: boolean;
  difference: number;
}> {
  const results: Array<{
    variant1: string;
    variant2: string;
    pValue: number;
    isSignificant: boolean;
    difference: number;
  }> = [];

  // Bonferroni correction: divide alpha by number of comparisons
  const numComparisons = (variants.length * (variants.length - 1)) / 2;
  const adjustedAlpha = alpha / numComparisons;

  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const v1 = variants[i];
      const v2 = variants[j];

      if (!v1 || !v2 || v1.total === 0 || v2.total === 0) {
        continue;
      }

      const p1 = v1.conversions / v1.total;
      const p2 = v2.conversions / v2.total;

      // Two-proportion z-test
      const pooled = (v1.conversions + v2.conversions) / (v1.total + v2.total);
      const se = Math.sqrt(pooled * (1 - pooled) * (1 / v1.total + 1 / v2.total));
      const z = se > 0 ? (p1 - p2) / se : 0;

      // Two-tailed p-value
      const pValue = 2 * (1 - normalCDF(Math.abs(z)));

      results.push({
        variant1: v1.id,
        variant2: v2.id,
        pValue,
        isSignificant: pValue < adjustedAlpha,
        difference: p1 - p2,
      });
    }
  }

  return results;
}

/**
 * Identify the best performing variant(s) after ANOVA.
 *
 * @param variants - Array of variant data
 * @returns Best variant(s) with confidence
 */
export function identifyBestVariant(variants: VariantData[]): {
  bestVariantId: string;
  conversionRate: number;
  significantlyBetterThan: string[]; // IDs of variants it beats
} {
  // Calculate conversion rates
  const rates = variants.map((v) => ({
    id: v.id,
    rate: v.total > 0 ? v.conversions / v.total : 0,
  }));

  // Sort by conversion rate
  rates.sort((a, b) => b.rate - a.rate);

  const best = rates[0];

  if (!best) {
    return {
      bestVariantId: "",
      conversionRate: 0,
      significantlyBetterThan: [],
    };
  }

  // Perform pairwise comparisons to find which variants the best beats
  const comparisons = pairwiseComparisons(variants);
  const significantlyBetterThan = comparisons
    .filter(
      (c) =>
        (c.variant1 === best.id || c.variant2 === best.id) &&
        c.isSignificant &&
        c.difference > 0
    )
    .map((c) => (c.variant1 === best.id ? c.variant2 : c.variant1));

  return {
    bestVariantId: best.id,
    conversionRate: best.rate,
    significantlyBetterThan,
  };
}

// =============================================================================
// F-Distribution CDF (Approximation)
// =============================================================================

/**
 * Cumulative distribution function for F-distribution.
 * Uses incomplete beta function approximation.
 *
 * @param f - F-statistic
 * @param df1 - Degrees of freedom (numerator)
 * @param df2 - Degrees of freedom (denominator)
 * @returns Cumulative probability P(F <= f)
 */
function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  if (df1 <= 0 || df2 <= 0) return 0;

  // Transform to beta distribution
  const x = df2 / (df2 + df1 * f);

  // F-CDF = 1 - I_x(df2/2, df1/2)
  return 1 - incompleteBeta(x, df2 / 2, df1 / 2);
}

/**
 * Regularized incomplete beta function.
 * Simplified implementation for F-distribution.
 *
 * @param x - Value between 0 and 1
 * @param a - First parameter
 * @param b - Second parameter
 * @returns I_x(a, b)
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;
  if (x < 0 || x > 1) return 0;

  // Use series expansion for small x
  if (x < 0.5) {
    return betaSeries(x, a, b);
  } else {
    // Use symmetry relation
    return 1 - betaSeries(1 - x, b, a);
  }
}

/**
 * Beta series expansion.
 */
function betaSeries(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const tolerance = 1e-10;

  let term = 1.0;
  let sum = 1.0;
  let n = 0;

  while (n < maxIterations) {
    n++;
    term *= ((a + b + n - 1) / n) * x;
    sum += term;

    if (Math.abs(term) < tolerance) break;
  }

  // Multiply by x^a * (1-x)^b / (a * B(a,b))
  const logBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const prefix = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta - Math.log(a));

  return prefix * sum;
}

/**
 * Log Gamma function (Stirling's approximation).
 */
function logGamma(x: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);

  let ser = 1.000000000190015;
  for (let i = 0; i < coefficients.length; i++) {
    const coeff = coefficients[i];
    if (coeff !== undefined) {
      ser += coeff / ++y;
    }
  }

  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/**
 * Normal CDF for z-tests.
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function.
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}
