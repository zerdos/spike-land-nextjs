import { describe, expect, it } from "vitest";
import {
  calculateChiSquared,
  calculateConfidenceInterval,
  calculateEffectSize,
  calculatePValue,
  calculateRequiredSampleSize,
  getWinner,
  interpretEffectSize,
  isStatisticallySignificant,
} from "./ab-testing";

describe("A/B Testing Utils", () => {
  describe("calculateChiSquared", () => {
    it("should calculate correct chi-squared for simple 2x2", () => {
      const data = [
        { visitors: 100, conversions: 10 },
        { visitors: 100, conversions: 20 },
      ];
      const chi = calculateChiSquared(data);
      expect(chi).toBeGreaterThan(0);
    });

    it("should return 0 for identical variants", () => {
      const data = [
        { visitors: 100, conversions: 10 },
        { visitors: 100, conversions: 10 },
      ];
      expect(calculateChiSquared(data)).toBe(0);
    });
  });

  describe("calculatePValue", () => {
    it("should return high p-value for similar result", () => {
      const p = calculatePValue([
        { visitors: 1000, conversions: 50 },
        { visitors: 1000, conversions: 51 },
      ]);
      expect(p).toBeGreaterThan(0.05);
    });

    it("should return low p-value for very different result", () => {
      const p = calculatePValue([
        { visitors: 1000, conversions: 50 },
        { visitors: 1000, conversions: 100 },
      ]);
      expect(p).toBeLessThan(0.05);
    });
  });

  describe("calculateConfidenceInterval", () => {
    it("should calculate correct interval", () => {
      const interval = calculateConfidenceInterval(50, 1000, 0.95);
      expect(interval.lower).toBeLessThan(0.05);
      expect(interval.upper).toBeGreaterThan(0.05);
    });

    it("should handle 0 visitors", () => {
      const interval = calculateConfidenceInterval(0, 0, 0.95);
      expect(interval.lower).toBe(0);
      expect(interval.upper).toBe(0);
    });
  });

  describe("isStatisticallySignificant", () => {
    it("should return false for minimal difference", () => {
      const result = isStatisticallySignificant([
        { visitors: 1000, conversions: 50 },
        { visitors: 1000, conversions: 51 },
      ], 0.05);
      expect(result).toBe(false);
    });

    it("should return true for large difference", () => {
      const result = isStatisticallySignificant([
        { visitors: 1000, conversions: 50 },
        { visitors: 1000, conversions: 100 },
      ], 0.05);
      expect(result).toBe(true);
    });
  });

  describe("calculateRequiredSampleSize", () => {
    it("should calculate reasonable sample size", () => {
      const size = calculateRequiredSampleSize(0.05, 0.2, 0.05, 0.8);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(100000);
    });

    it("should return Infinity for invalid inputs", () => {
      expect(calculateRequiredSampleSize(0, 0.2)).toBe(Infinity);
      expect(calculateRequiredSampleSize(0.05, 0)).toBe(Infinity);
    });
  });

  describe("getWinner", () => {
    it("should return winner if significant", () => {
      const variants = [
        { id: "v1", name: "A", visitors: 1000, conversions: 50 },
        { id: "v2", name: "B", visitors: 1000, conversions: 100 },
      ];
      const winner = getWinner(variants, 0.05);
      expect(winner?.id).toBe("v2");
    });

    it("should return null if not significant", () => {
      const variants = [
        { id: "v1", name: "A", visitors: 1000, conversions: 50 },
        { id: "v2", name: "B", visitors: 1000, conversions: 51 },
      ];
      const winner = getWinner(variants, 0.05);
      expect(winner).toBeNull();
    });
  });

  describe("calculateEffectSize", () => {
    it("should calculate correct Cohen's h", () => {
      const h = calculateEffectSize(0.1, 0.2);
      expect(h).toBeGreaterThan(0);
    });
  });

  describe("interpretEffectSize", () => {
    it("should interpret small, medium, large", () => {
      expect(interpretEffectSize(0.1)).toBe("SMALL");
      expect(interpretEffectSize(0.3)).toBe("MEDIUM");
      expect(interpretEffectSize(0.6)).toBe("LARGE");
    });
  });
});
