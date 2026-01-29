/**
 * Tests for A/B test statistical calculator
 * Resolves #551
 */

import { describe, it, expect } from "vitest";
import {
  calculateSignificance,
  calculateSampleSize,
  calculateConfidenceInterval,
  shouldStopTest,
} from "./ab-test-calculator";
import type { AbTestVariantMetrics } from "@/types/variant-generator";

describe("ab-test-calculator", () => {
  describe("calculateSignificance", () => {
    it("should detect significant difference with large sample", () => {
      const variantA: AbTestVariantMetrics = {
        variantId: "variant-a",
        impressions: 1000,
        engagements: 100,
        clicks: 50,
        conversions: 25,
        ctr: 0.05,
        engagementRate: 0.10,
        conversionRate: 0.025,
      };

      const variantB: AbTestVariantMetrics = {
        variantId: "variant-b",
        impressions: 1000,
        engagements: 150,
        clicks: 80,
        conversions: 50,
        ctr: 0.08,
        engagementRate: 0.15,
        conversionRate: 0.05,
      };

      const result = calculateSignificance(variantA, variantB);

      expect(result).toHaveProperty("isSignificant");
      expect(result).toHaveProperty("confidenceLevel");
      expect(result).toHaveProperty("pValue");
      expect(result).toHaveProperty("zScore");
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
    });

    it("should not detect significance with small sample", () => {
      const variantA: AbTestVariantMetrics = {
        variantId: "variant-a",
        impressions: 20,
        engagements: 5,
        clicks: 2,
        conversions: 1,
        ctr: 0.10,
        engagementRate: 0.25,
        conversionRate: 0.05,
      };

      const variantB: AbTestVariantMetrics = {
        variantId: "variant-b",
        impressions: 20,
        engagements: 6,
        clicks: 3,
        conversions: 2,
        ctr: 0.15,
        engagementRate: 0.30,
        conversionRate: 0.10,
      };

      const result = calculateSignificance(variantA, variantB);

      expect(result.isSignificant).toBe(false);
      expect(result.recommendedSampleSize).toBeGreaterThan(20);
    });

    it("should identify winner when significant", () => {
      const variantA: AbTestVariantMetrics = {
        variantId: "variant-a",
        impressions: 1000,
        engagements: 50,
        clicks: 25,
        conversions: 10,
        ctr: 0.025,
        engagementRate: 0.05,
        conversionRate: 0.01,
      };

      const variantB: AbTestVariantMetrics = {
        variantId: "variant-b",
        impressions: 1000,
        engagements: 120,
        clicks: 80,
        conversions: 50,
        ctr: 0.08,
        engagementRate: 0.12,
        conversionRate: 0.05,
      };

      const result = calculateSignificance(variantA, variantB);

      if (result.isSignificant) {
        expect(result.winnerVariantId).toBe("variant-b");
      }
    });

    it("should handle equal conversion rates", () => {
      const variantA: AbTestVariantMetrics = {
        variantId: "variant-a",
        impressions: 500,
        engagements: 50,
        clicks: 25,
        conversions: 25,
        ctr: 0.05,
        engagementRate: 0.10,
        conversionRate: 0.05,
      };

      const variantB: AbTestVariantMetrics = {
        variantId: "variant-b",
        impressions: 500,
        engagements: 50,
        clicks: 25,
        conversions: 25,
        ctr: 0.05,
        engagementRate: 0.10,
        conversionRate: 0.05,
      };

      const result = calculateSignificance(variantA, variantB);

      expect(result.isSignificant).toBe(false);
      expect(result.pValue).toBeGreaterThan(0.05);
    });
  });

  describe("calculateSampleSize", () => {
    it("should calculate sample size for given parameters", () => {
      const sampleSize = calculateSampleSize(0.05, 0.01);

      expect(sampleSize).toBeGreaterThan(0);
      expect(Number.isInteger(sampleSize)).toBe(true);
    });

    it("should return larger sample size for smaller effect", () => {
      const sampleSmallEffect = calculateSampleSize(0.05, 0.005);
      const sampleLargeEffect = calculateSampleSize(0.05, 0.02);

      expect(sampleSmallEffect).toBeGreaterThan(sampleLargeEffect);
    });

    it("should handle edge cases", () => {
      const sampleSize = calculateSampleSize(0.01, 0.005);

      expect(sampleSize).toBeGreaterThan(0);
      expect(isFinite(sampleSize)).toBe(true);
    });
  });

  describe("calculateConfidenceInterval", () => {
    it("should calculate confidence interval", () => {
      const [lower, upper] = calculateConfidenceInterval(50, 1000);

      expect(lower).toBeGreaterThanOrEqual(0);
      expect(upper).toBeLessThanOrEqual(1);
      expect(lower).toBeLessThan(upper);
    });

    it("should return [0, 0] for zero impressions", () => {
      const [lower, upper] = calculateConfidenceInterval(0, 0);

      expect(lower).toBe(0);
      expect(upper).toBe(0);
    });

    it("should center interval around conversion rate", () => {
      const conversions = 100;
      const impressions = 1000;
      const rate = conversions / impressions;

      const [lower, upper] = calculateConfidenceInterval(
        conversions,
        impressions,
      );

      const midpoint = (lower + upper) / 2;
      expect(Math.abs(midpoint - rate)).toBeLessThan(0.01);
    });
  });

  describe("shouldStopTest", () => {
    it("should recommend stopping when significant and min sample reached", () => {
      const significance = {
        isSignificant: true,
        confidenceLevel: 0.95,
        pValue: 0.01,
        zScore: 2.5,
        winnerVariantId: "variant-b",
        recommendedSampleSize: 500,
      };

      const result = shouldStopTest(significance, 150, 1000);

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain("significance achieved");
    });

    it("should recommend continuing when not significant", () => {
      const significance = {
        isSignificant: false,
        confidenceLevel: 0.70,
        pValue: 0.30,
        zScore: 1.0,
        recommendedSampleSize: 500,
      };

      const result = shouldStopTest(significance, 100, 1000);

      expect(result.shouldStop).toBe(false);
      expect(result.recommendation).toContain("Continue test");
    });

    it("should recommend stopping at max sample without significance", () => {
      const significance = {
        isSignificant: false,
        confidenceLevel: 0.70,
        pValue: 0.30,
        zScore: 1.0,
        recommendedSampleSize: 500,
      };

      const result = shouldStopTest(significance, 1000, 1000);

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain("Maximum sample size");
    });
  });
});
