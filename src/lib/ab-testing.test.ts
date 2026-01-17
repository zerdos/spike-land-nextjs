import { describe, expect, it } from "vitest";
import { calculateChiSquared, chiSquaredToPValue } from "./ab-testing";

describe("A/B Testing Utilities", () => {
  describe("calculateChiSquared", () => {
    it("should return 0 if there are no visitors", () => {
      const variants = [
        { visitors: 0, conversions: 0 },
        { visitors: 0, conversions: 0 },
      ];
      expect(calculateChiSquared(variants)).toBe(0);
    });

    it("should calculate the chi-squared statistic correctly", () => {
      const variants = [
        { visitors: 100, conversions: 10 }, // 10% conversion rate
        { visitors: 100, conversions: 20 }, // 20% conversion rate
      ];
      // Expected chi-squared value for this data is approximately 3.92
      expect(calculateChiSquared(variants)).toBeCloseTo(3.92, 2);
    });

    it("should handle cases with zero conversions", () => {
      const variants = [
        { visitors: 100, conversions: 0 },
        { visitors: 100, conversions: 0 },
      ];
      expect(calculateChiSquared(variants)).toBe(0);
    });
  });

  describe("chiSquaredToPValue", () => {
    it("should return the correct p-value for a given chi-squared statistic", () => {
      // For a chi-squared value of 3.841 with 1 df, the p-value is approx 0.05
      expect(chiSquaredToPValue(3.841)).toBeCloseTo(0.05);

      // For a chi-squared value of 6.635 with 1 df, the p-value is approx 0.01
      expect(chiSquaredToPValue(6.635)).toBeCloseTo(0.01);

      // For a chi-squared value of 10.827 with 1 df, the p-value is approx 0.001
      expect(chiSquaredToPValue(10.827)).toBeCloseTo(0.001);

      // For a small chi-squared value, the p-value should be close to 1.0
      expect(chiSquaredToPValue(0.5)).toBeCloseTo(0.4795);
    });
  });
});
