/**
 * Bayesian A/B Testing Analysis
 * Epic #516
 *
 * Implements Bayesian inference for A/B testing using Beta distributions.
 * Provides probability of being best, expected loss, and credible intervals.
 */

/**
 * Beta distribution parameters after observing data.
 *
 * Using conjugate prior: Beta(α, β) → Beta(α + successes, β + failures)
 */
export interface BetaDistribution {
  alpha: number; // α parameter (successes + prior)
  beta: number; // β parameter (failures + prior)
}

/**
 * Bayesian analysis result for a variant.
 */
export interface BayesianResult {
  variantId: string;
  probabilityBest: number; // P(variant is best)
  expectedValue: number; // E[conversion rate]
  credibleInterval: {
    // 95% credible interval
    lower: number;
    upper: number;
  };
  expectedLoss: number; // Expected loss if we choose this variant
}

/**
 * Calculate posterior Beta distribution parameters.
 *
 * @param successes - Number of conversions
 * @param failures - Number of non-conversions
 * @param priorAlpha - Prior α (default 1 = uniform prior)
 * @param priorBeta - Prior β (default 1 = uniform prior)
 * @returns Beta distribution parameters
 */
export function posteriorBeta(
  successes: number,
  failures: number,
  priorAlpha: number = 1,
  priorBeta: number = 1
): BetaDistribution {
  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
  };
}

/**
 * Calculate probability that variant A is better than variant B.
 *
 * Uses Monte Carlo simulation for accurate estimation.
 *
 * @param distA - Beta distribution for variant A
 * @param distB - Beta distribution for variant B
 * @param samples - Number of Monte Carlo samples (default 10000)
 * @returns P(A > B)
 */
export function probabilityABetterThanB(
  distA: BetaDistribution,
  distB: BetaDistribution,
  samples: number = 10000
): number {
  let countABetter = 0;

  for (let i = 0; i < samples; i++) {
    const sampleA = sampleBeta(distA.alpha, distA.beta);
    const sampleB = sampleBeta(distB.alpha, distB.beta);

    if (sampleA > sampleB) {
      countABetter++;
    }
  }

  return countABetter / samples;
}

/**
 * Calculate probability that each variant is the best among all variants.
 *
 * @param distributions - Beta distributions for all variants
 * @param samples - Number of Monte Carlo samples
 * @returns Array of probabilities (one per variant)
 */
export function probabilityBest(
  distributions: BetaDistribution[],
  samples: number = 10000
): number[] {
  const counts = new Array(distributions.length).fill(0);

  for (let i = 0; i < samples; i++) {
    const samplesThisRound = distributions.map((dist) =>
      sampleBeta(dist.alpha, dist.beta)
    );

    const maxIndex = samplesThisRound.indexOf(Math.max(...samplesThisRound));
    counts[maxIndex]++;
  }

  return counts.map((count) => count / samples);
}

/**
 * Calculate expected value (mean) of Beta distribution.
 *
 * E[X] = α / (α + β)
 *
 * @param dist - Beta distribution
 * @returns Expected value
 */
export function expectedValue(dist: BetaDistribution): number {
  return dist.alpha / (dist.alpha + dist.beta);
}

/**
 * Calculate credible interval for Beta distribution.
 *
 * @param dist - Beta distribution
 * @param level - Credible level (default 0.95)
 * @returns Credible interval bounds
 */
export function credibleInterval(
  dist: BetaDistribution,
  level: number = 0.95
): { lower: number; upper: number } {
  const tail = (1 - level) / 2;

  return {
    lower: betaQuantile(dist.alpha, dist.beta, tail),
    upper: betaQuantile(dist.alpha, dist.beta, 1 - tail),
  };
}

/**
 * Calculate expected loss for choosing a variant.
 *
 * Expected loss = E[max(other variants) - this variant]
 *
 * @param distributions - All Beta distributions
 * @param variantIndex - Index of variant to calculate loss for
 * @param samples - Number of Monte Carlo samples
 * @returns Expected loss
 */
export function expectedLoss(
  distributions: BetaDistribution[],
  variantIndex: number,
  samples: number = 10000
): number {
  let totalLoss = 0;

  for (let i = 0; i < samples; i++) {
    const samplesThisRound = distributions.map((dist) =>
      sampleBeta(dist.alpha, dist.beta)
    );

    const maxSample = Math.max(...samplesThisRound);
    const loss = Math.max(0, maxSample - samplesThisRound[variantIndex]);

    totalLoss += loss;
  }

  return totalLoss / samples;
}

/**
 * Perform complete Bayesian analysis for multiple variants.
 *
 * @param variants - Array of variant data
 * @param priorAlpha - Prior α parameter
 * @param priorBeta - Prior β parameter
 * @param samples - Monte Carlo samples
 * @returns Bayesian analysis for each variant
 */
export function analyzeBayesian(
  variants: Array<{
    id: string;
    conversions: number;
    impressions: number;
  }>,
  priorAlpha: number = 1,
  priorBeta: number = 1,
  samples: number = 10000
): BayesianResult[] {
  // Calculate posterior distributions
  const distributions = variants.map((v) =>
    posteriorBeta(v.conversions, v.impressions - v.conversions, priorAlpha, priorBeta)
  );

  // Calculate probabilities of being best
  const probabilities = probabilityBest(distributions, samples);

  // Calculate results for each variant
  return variants.map((v, i) => ({
    variantId: v.id,
    probabilityBest: probabilities[i],
    expectedValue: expectedValue(distributions[i]),
    credibleInterval: credibleInterval(distributions[i]),
    expectedLoss: expectedLoss(distributions, i, samples),
  }));
}

// =============================================================================
// Beta Distribution Sampling and Quantiles
// =============================================================================

/**
 * Sample from Beta distribution using rejection sampling.
 *
 * @param alpha - α parameter
 * @param beta - β parameter
 * @returns Random sample from Beta(α, β)
 */
function sampleBeta(alpha: number, beta: number): number {
  // For small α and β, use simple rejection sampling
  if (alpha <= 1 && beta <= 1) {
    return sampleBetaRejection(alpha, beta);
  }

  // For larger parameters, use Gamma distribution method
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

/**
 * Rejection sampling for Beta distribution (small parameters).
 */
function sampleBetaRejection(alpha: number, beta: number): number {
  while (true) {
    const u = Math.random();
    const v = Math.random();

    const x = Math.pow(u, 1 / alpha);
    const y = Math.pow(v, 1 / beta);

    if (x + y <= 1) {
      return x / (x + y);
    }
  }
}

/**
 * Sample from Gamma distribution using Marsaglia and Tsang method.
 *
 * @param shape - Shape parameter (α)
 * @param scale - Scale parameter (default 1)
 * @returns Random sample from Gamma(shape, scale)
 */
function sampleGamma(shape: number, scale: number = 1): number {
  if (shape < 1) {
    // Use rejection method for shape < 1
    return sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = randomNormal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (
      u < 1 - 0.0331 * x * x * x * x ||
      Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))
    ) {
      return scale * d * v;
    }
  }
}

/**
 * Generate random sample from standard normal distribution.
 * Uses Box-Muller transform.
 *
 * @returns Random sample from N(0, 1)
 */
function randomNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Approximate Beta distribution quantile using numerical methods.
 *
 * @param alpha - α parameter
 * @param beta - β parameter
 * @param p - Cumulative probability
 * @returns x such that P(X ≤ x) = p
 */
function betaQuantile(alpha: number, beta: number, p: number): number {
  // Use bisection method to find quantile
  let low = 0;
  let high = 1;
  const tolerance = 1e-6;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const cdf = incompleteBeta(mid, alpha, beta);

    if (cdf < p) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Regularized incomplete beta function I_x(α, β).
 * Approximation using continued fractions.
 *
 * @param x - Value between 0 and 1
 * @param alpha - α parameter
 * @param beta - β parameter
 * @returns I_x(α, β)
 */
function incompleteBeta(x: number, alpha: number, beta: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use symmetry relation if needed for better convergence
  if (x > alpha / (alpha + beta)) {
    return 1 - incompleteBeta(1 - x, beta, alpha);
  }

  // Continued fraction approximation
  const lnBeta = logBeta(alpha, beta);
  const front = Math.exp(
    alpha * Math.log(x) + beta * Math.log(1 - x) - lnBeta
  ) / alpha;

  const cf = continuedFractionBeta(x, alpha, beta);

  return front * cf;
}

/**
 * Continued fraction for incomplete beta function.
 */
function continuedFractionBeta(x: number, alpha: number, beta: number): number {
  const maxIterations = 100;
  const tolerance = 1e-10;

  let c = 1;
  let d = 1 - ((alpha + beta) * x) / (alpha + 1);

  if (Math.abs(d) < tolerance) d = tolerance;
  d = 1 / d;

  let h = d;

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;

    // Even iteration
    let aa = (m * (beta - m) * x) / ((alpha + m2 - 1) * (alpha + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tolerance) d = tolerance;
    c = 1 + aa / c;
    if (Math.abs(c) < tolerance) c = tolerance;
    d = 1 / d;
    h *= d * c;

    // Odd iteration
    aa = -((alpha + m) * (alpha + beta + m) * x) / ((alpha + m2) * (alpha + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tolerance) d = tolerance;
    c = 1 + aa / c;
    if (Math.abs(c) < tolerance) c = tolerance;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < tolerance) break;
  }

  return h;
}

/**
 * Log of Beta function: ln(B(α, β)) = ln(Γ(α)) + ln(Γ(β)) - ln(Γ(α + β))
 */
function logBeta(alpha: number, beta: number): number {
  return logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
}

/**
 * Log Gamma function approximation (Stirling's approximation).
 */
function logGamma(x: number): number {
  // Stirling's approximation for log(Γ(x))
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);

  let ser = 1.000000000190015;
  for (let i = 0; i < coefficients.length; i++) {
    ser += coefficients[i] / ++y;
  }

  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
