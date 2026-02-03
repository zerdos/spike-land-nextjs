export interface VariantStats {
  visitors: number;
  conversions: number;
}

export interface SignificanceResult {
  isSignificant: boolean;
  confidenceLevel: number; // 0-1
  winner: "control" | "variant" | null;
  lift: number; // Percentage improvement
  pValue: number;
}

/**
 * Calculates statistical significance for A/B testing using Z-test for proportions.
 */
export function calculateSignificance(
  control: VariantStats,
  variant: VariantStats,
): SignificanceResult {
  const n1 = control.visitors;
  const n2 = variant.visitors;

  // Handle edge cases (divide by zero)
  if (n1 === 0 || n2 === 0) {
    return {
      isSignificant: false,
      confidenceLevel: 0,
      winner: null,
      lift: 0,
      pValue: 1,
    };
  }

  const p1 = control.conversions / control.visitors;
  const p2 = variant.conversions / variant.visitors;

  // Lift
  const lift = p1 === 0 ? 0 : (p2 - p1) / p1;

  // Pooled probability
  const pPool = (control.conversions + variant.conversions) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));

  // Z-score
  const z = (p2 - p1) / se;

  // P-value (two-tailed)
  // Approx for normal distribution
  let pValue = 1;
  const absZ = Math.abs(z);

  if (!isNaN(absZ)) {
    pValue = 2 * (1 - cdf(absZ));
  }

  const confidenceLevel = 1 - pValue;
  const isSignificant = confidenceLevel >= 0.95;

  let winner: "control" | "variant" | null = null;
  if (isSignificant) {
    winner = lift > 0 ? "variant" : "control";
  }

  return {
    isSignificant,
    confidenceLevel,
    winner,
    lift,
    pValue,
  };
}

// Cumulative Distribution Function for Standard Normal Distribution
function cdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob = d *
    t *
    (0.3193815 +
      t *
        (-0.3565638 +
          t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) return 1 - prob;
  return prob;
}
