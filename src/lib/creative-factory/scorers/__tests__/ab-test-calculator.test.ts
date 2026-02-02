import { describe, it, expect } from "vitest";
import { calculateSignificance } from "../ab-test-calculator";

describe("calculateSignificance", () => {
  it("should identify a significant winner", () => {
    // Control: 10% conversion (100/1000)
    // Variant: 15% conversion (150/1000)
    const result = calculateSignificance(
      { visitors: 1000, conversions: 100 },
      { visitors: 1000, conversions: 150 }
    );

    expect(result.isSignificant).toBe(true);
    expect(result.winner).toBe("variant");
    expect(result.confidenceLevel).toBeGreaterThan(0.99);
    expect(result.lift).toBeCloseTo(0.5); // 50% lift
  });

  it("should identify no significance for small differences", () => {
    // Control: 10%
    // Variant: 10.5%
    const result = calculateSignificance(
      { visitors: 1000, conversions: 100 },
      { visitors: 1000, conversions: 105 }
    );

    expect(result.isSignificant).toBe(false);
    expect(result.winner).toBe(null);
  });

  it("should handle edge cases", () => {
    const result = calculateSignificance(
      { visitors: 0, conversions: 0 },
      { visitors: 1000, conversions: 100 }
    );
    expect(result.isSignificant).toBe(false);
  });
});
