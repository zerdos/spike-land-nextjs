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
      expect(chiSquaredToPValue(4.0)).toBe(0.05);
      expect(chiSquaredToPValue(7.0)).toBe(0.01);
      expect(chiSquaredToPValue(11.0)).toBe(0.001);
      expect(chiSquaredToPValue(0.5)).toBe(1.0);
    });
  });
});
