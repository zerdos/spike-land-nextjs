import { describe, expect, it } from "vitest";
import { calculateSignificance } from "./significance-calculator";

describe("Significance Calculator", () => {
  it("should return insignificant result for insufficient data", () => {
    const variants = [
      { id: "A", impressions: 50, clicks: 5 },
      { id: "B", impressions: 50, clicks: 6 },
    ];
    const result = calculateSignificance(variants);
    expect(result.isSignificant).toBe(false);
    expect(result.metrics.every(m => m.zScore === 0)).toBe(true);
  });

  it("should return insignificant result when conversion rates are identical", () => {
    const variants = [
      { id: "A", impressions: 1000, clicks: 100 },
      { id: "B", impressions: 1000, clicks: 100 },
    ];
    const result = calculateSignificance(variants);
    expect(result.isSignificant).toBe(false);
  });

  it("should detect significant difference with large sample size and obvious winner", () => {
    const variants = [
      { id: "A", impressions: 10000, clicks: 1000 }, // 10%
      { id: "B", impressions: 10000, clicks: 2000 }, // 20%
    ];
    const result = calculateSignificance(variants);
    expect(result.isSignificant).toBe(true);
    expect(result.winnerVariantId).toBe("B");
    expect(result.confidenceLevel).toBeGreaterThan(0.99);
  });

  it("should handle edge case with 0 clicks", () => {
    const variants = [
      { id: "A", impressions: 1000, clicks: 0 },
      { id: "B", impressions: 1000, clicks: 100 },
    ];
    const result = calculateSignificance(variants);
    expect(result.isSignificant).toBe(true);
    expect(result.winnerVariantId).toBe("B");
  });

  it("should strictly respect significance level", () => {
    // A case that is significant at 90% but not 99%
    // Example: A=1000/100 (10%), B=1000/130 (13%)
    // z approx (0.13-0.10) / sqrt(0.115*0.885*(2/1000))
    // se approx 0.0142
    // z approx 2.1
    // p approx 0.035
    // Significant at 0.05 (95%), Not significant at 0.01 (99%)

    const variants = [
      { id: "A", impressions: 1000, clicks: 100 },
      { id: "B", impressions: 1000, clicks: 130 },
    ];

    // Default is 95% -> should be significant
    expect(calculateSignificance(variants).isSignificant).toBe(true);

    // 99% -> should NOT be significant
    expect(calculateSignificance(variants, 0.99).isSignificant).toBe(false);
  });

  it("should handle single variant gracefully", () => {
    const variants = [
      { id: "A", impressions: 1000, clicks: 100 },
    ];
    const result = calculateSignificance(variants);
    expect(result.isSignificant).toBe(false);
    expect(result.winnerVariantId).toBe(null);
  });
});
