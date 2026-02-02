import { describe, expect, it } from "vitest";
import { calculateConfidenceInterval, isStatisticallySignificant } from "./ab-testing";

describe("A/B Testing Utils", () => {
  describe("calculateConfidenceInterval", () => {
    it("should calculate correct interval", () => {
      const interval = calculateConfidenceInterval(50, 1000, 0.95);
      expect(interval.lower).toBeLessThan(0.05);
      expect(interval.upper).toBeGreaterThan(0.05);
    });
  });

  describe("isStatisticallySignificant", () => {
    it("should return false for minimal difference", () => {
      const result = isStatisticallySignificant([
        { visitors: 1000, conversions: 50 },
        { visitors: 1000, conversions: 51 },
      ], 0.05); // alpha = 0.05
      expect(result).toBe(false);
    });

    it("should return true for large difference", () => {
      const result = isStatisticallySignificant([
        { visitors: 1000, conversions: 50 }, // 5%
        { visitors: 1000, conversions: 100 }, // 10%
      ], 0.05);
      expect(result).toBe(true);
    });
  });
});
