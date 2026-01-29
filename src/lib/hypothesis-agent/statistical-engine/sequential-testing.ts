/**
 * Sequential Testing for A/B Tests
 * Epic #516
 *
 * Implements sequential probability ratio test (SPRT) for early stopping.
 * Allows peeking at results without inflating Type I error.
 */

/**
 * Sequential test configuration.
 */
export interface SequentialTestConfig {
  alpha: number; // Type I error rate (false positive)
  beta: number; // Type II error rate (false negative)
  minimumEffect: number; // Minimum effect size to detect
}

/**
 * Sequential test result.
 */
export interface SequentialTestResult {
  decision: "continue" | "stop_variant_wins" | "stop_no_difference";
  llr: number; // Log-likelihood ratio
  upperBound: number; // Upper threshold for stopping
  lowerBound: number; // Lower threshold for stopping
  samplesAnalyzed: number;
}

/**
 * Perform Sequential Probability Ratio Test (SPRT).
 *
 * This test allows for continuous monitoring of experiments without
 * inflating the false positive rate.
 *
 * @param controlConversions - Conversions in control
 * @param controlTotal - Total impressions in control
 * @param variantConversions - Conversions in variant
 * @param variantTotal - Total impressions in variant
 * @param config - Sequential test configuration
 * @returns Test result with decision
 */
export function sequentialTest(
  controlConversions: number,
  controlTotal: number,
  variantConversions: number,
  variantTotal: number,
  config: SequentialTestConfig
): SequentialTestResult {
  const { alpha, beta, minimumEffect } = config;

  // Calculate log-likelihood ratio
  const llr = calculateLLR(
    controlConversions,
    controlTotal,
    variantConversions,
    variantTotal,
    minimumEffect
  );

  // Calculate thresholds
  const upperBound = Math.log((1 - beta) / alpha);
  const lowerBound = Math.log(beta / (1 - alpha));

  // Make decision
  let decision: "continue" | "stop_variant_wins" | "stop_no_difference" = "continue";

  if (llr >= upperBound) {
    decision = "stop_variant_wins";
  } else if (llr <= lowerBound) {
    decision = "stop_no_difference";
  }

  return {
    decision,
    llr,
    upperBound,
    lowerBound,
    samplesAnalyzed: controlTotal + variantTotal,
  };
}

/**
 * Calculate log-likelihood ratio for sequential test.
 *
 * LLR = log(P(data | H1) / P(data | H0))
 *
 * Where:
 * - H0: No difference between variants
 * - H1: Variant is better by minimumEffect
 *
 * @param c0 - Control conversions
 * @param n0 - Control total
 * @param c1 - Variant conversions
 * @param n1 - Variant total
 * @param effect - Minimum effect size
 * @returns Log-likelihood ratio
 */
function calculateLLR(
  c0: number,
  n0: number,
  c1: number,
  n1: number,
  effect: number
): number {
  if (n0 === 0 || n1 === 0) return 0;

  // Under H0: both variants have same conversion rate
  const pooled = (c0 + c1) / (n0 + n1);

  // Under H1: variant has conversion rate increased by effect
  const p0H1 = pooled / (1 + effect);
  const p1H1 = p0H1 * (1 + effect);

  // Clamp probabilities to valid range
  const p0H1Clamped = Math.max(0.001, Math.min(0.999, p0H1));
  const p1H1Clamped = Math.max(0.001, Math.min(0.999, p1H1));
  const pooledClamped = Math.max(0.001, Math.min(0.999, pooled));

  // Log-likelihood under H1
  const llH1 =
    c0 * Math.log(p0H1Clamped) +
    (n0 - c0) * Math.log(1 - p0H1Clamped) +
    c1 * Math.log(p1H1Clamped) +
    (n1 - c1) * Math.log(1 - p1H1Clamped);

  // Log-likelihood under H0
  const llH0 =
    c0 * Math.log(pooledClamped) +
    (n0 - c0) * Math.log(1 - pooledClamped) +
    c1 * Math.log(pooledClamped) +
    (n1 - c1) * Math.log(1 - pooledClamped);

  return llH1 - llH0;
}

/**
 * Calculate alpha spending function for interim analyses.
 *
 * This controls Type I error when performing multiple looks at data.
 *
 * @param t - Information fraction (0 to 1, where 1 is final analysis)
 * @param alpha - Overall Type I error rate
 * @param method - Spending function method
 * @returns Alpha to use at this interim analysis
 */
export function alphaSpending(
  t: number,
  alpha: number,
  method: "obrien_fleming" | "pocock" | "linear" = "obrien_fleming"
): number {
  if (t <= 0) return 0;
  if (t >= 1) return alpha;

  switch (method) {
    case "obrien_fleming":
      // O'Brien-Fleming: Conservative early, liberal late
      return 2 * (1 - normalCDF(getZAlpha(alpha / 2) / Math.sqrt(t)));

    case "pocock":
      // Pocock: Equal alpha spending at each look
      return alpha * Math.log(1 + (Math.E - 1) * t);

    case "linear":
      // Linear: Proportional to information fraction
      return alpha * t;

    default:
      return alpha * t;
  }
}

/**
 * Get z-score for a given alpha level.
 */
function getZAlpha(alpha: number): number {
  // Common alpha levels
  const zScores: Record<string, number> = {
    "0.025": 1.96, // 95% CI (two-tailed)
    "0.05": 1.645, // 90% CI (two-tailed)
    "0.005": 2.576, // 99% CI (two-tailed)
  };

  return zScores[alpha.toFixed(3)] ?? 1.96;
}

/**
 * Normal CDF approximation.
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation.
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

/**
 * Estimate required sample size for sequential test.
 *
 * Sequential tests typically require fewer samples than fixed-sample tests.
 *
 * @param baselineRate - Control conversion rate
 * @param effect - Expected effect size
 * @param alpha - Type I error
 * @param beta - Type II error
 * @returns Expected sample size per variant
 */
export function estimateSequentialSampleSize(
  baselineRate: number,
  effect: number,
  alpha: number = 0.05,
  beta: number = 0.2
): number {
  if (baselineRate <= 0 || baselineRate >= 1 || effect <= 0) {
    return Infinity;
  }

  // Wald's approximation for SPRT sample size
  const p0 = baselineRate;
  const p1 = baselineRate * (1 + effect);

  if (p1 >= 1) return Infinity;

  // Average sample number under H1
  const asn =
    ((1 - beta) * Math.log((1 - beta) / alpha) + beta * Math.log(beta / (1 - alpha))) /
    (p1 * Math.log(p1 / p0) + (1 - p1) * Math.log((1 - p1) / (1 - p0)));

  return Math.ceil(asn);
}
