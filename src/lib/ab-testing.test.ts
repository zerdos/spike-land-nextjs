import { describe, expect, it } from "vitest";
import {
  calculateChiSquared,
  calculatePValue,
  calculateRequiredSampleSize,
  chiSquaredToPValue,
  getWinner,
  isStatisticallySignificant,
  type Variant,
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
      // For a chi-squared value of 3.841 with 1 df, the p-value is approx 0.05
      expect(chiSquaredToPValue(3.841, 1)).toBeCloseTo(0.05, 2);

      // For a chi-squared value of 6.635 with 1 df, the p-value is approx 0.01
      expect(chiSquaredToPValue(6.635, 1)).toBeCloseTo(0.01, 2);

      // For a chi-squared value of 10.827 with 1 df, the p-value is approx 0.001
      expect(chiSquaredToPValue(10.827)).toBeCloseTo(0.001, 3);

      // For a small chi-squared value, the p-value should be close to 0.48
      expect(chiSquaredToPValue(0.5)).toBeCloseTo(0.4795, 2);
    });
  });

  describe("calculatePValue", () => {
    it("should calculate the p-value correctly for a set of variants", () => {
      const variants = [
        { visitors: 100, conversions: 10 },
        { visitors: 100, conversions: 20 },
      ];
      // For this data, chi-squared is ~3.92 and df is 1, so p-value is ~0.047
      expect(calculatePValue(variants)).toBeCloseTo(0.047, 2);
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

  describe("calculateRequiredSampleSize", () => {
    it("should return Infinity for invalid inputs", () => {
      expect(calculateRequiredSampleSize(0, 0.1)).toBe(Infinity);
      expect(calculateRequiredSampleSize(1, 0.1)).toBe(Infinity);
      expect(calculateRequiredSampleSize(0.1, 0)).toBe(Infinity);
    });

    it("should calculate the required sample size correctly", () => {
      // Baseline 5% conversion, 10% MDE -> expect ~30_000 per variant
      const sampleSize = calculateRequiredSampleSize(0.05, 0.1);
      expect(sampleSize).toBeGreaterThan(30000);
      expect(sampleSize).toBeLessThan(32000);
    });
  });

  describe("getWinner", () => {
    const variants: Variant[] = [
      { id: "A", name: "Control", visitors: 1000, conversions: 100 }, // 10%
      { id: "B", name: "Variant", visitors: 1000, conversions: 150 }, // 15%
    ];

    it("should return the winning variant if the result is statistically significant", () => {
      const winner = getWinner(variants, 0.05);
      expect(winner).not.toBeNull();
      expect(winner?.id).toBe("B");
    });

    it("should return null if the result is not statistically significant", () => {
      const insignificantVariants: Variant[] = [
        { id: "A", name: "Control", visitors: 100, conversions: 10 }, // 10%
        { id: "B", name: "Variant", visitors: 100, conversions: 12 }, // 12%
      ];
      const winner = getWinner(insignificantVariants, 0.05);
      expect(winner).toBeNull();
    });

    it("should return null if there are fewer than two variants", () => {
      const winner = getWinner([variants[0]!]);
      expect(winner).toBeNull();
    });
  });
});
