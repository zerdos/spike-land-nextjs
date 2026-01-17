import { describe, expect, it } from "vitest";
import {
  calculateChiSquared,
  chiSquaredToPValue,
  calculatePValue,
  isStatisticallySignificant,
} from "./ab-testing";

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
      // For 1 degree of freedom
      expect(chiSquaredToPValue(3.841, 1)).toBeCloseTo(0.05, 3);
      expect(chiSquaredToPValue(6.635, 1)).toBeCloseTo(0.01, 3);
      expect(chiSquaredToPValue(10.827, 1)).toBeCloseTo(0.001, 3);
    });
  });

  describe("calculatePValue", () => {
    it("should calculate the p-value correctly for a set of variants", () => {
      const variants = [
        { visitors: 100, conversions: 10 },
        { visitors: 100, conversions: 20 },
      ];
      // For this data, chi-squared is ~3.92 and df is 1, so p-value is ~0.047
      expect(calculatePValue(variants)).toBeCloseTo(0.047, 3);
    });
  });

  describe("isStatisticallySignificant", () => {
    it("should return true if the p-value is less than the significance level", () => {
      const variants = [
        { visitors: 100, conversions: 10 },
        { visitors: 100, conversions: 20 },
      ];
      expect(isStatisticallySignificant(variants, 0.05)).toBe(true);
    });

    it("should return false if the p-value is greater than the significance level", () => {
      const variants = [
        { visitors: 100, conversions: 10 },
        { visitors: 100, conversions: 12 },
      ];
      expect(isStatisticallySignificant(variants, 0.05)).toBe(false);
    });
  });
});
