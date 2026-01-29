/**
 * Tests for variant scoring service
 * Resolves #551
 */

import { describe, it, expect } from "vitest";
import { scoreVariant, scoreAndRankVariants } from "./variant-scorer";
import type { CopyVariant, HistoricalPerformanceData } from "@/types/variant-generator";

describe("variant-scorer", () => {
  const baseVariant: CopyVariant = {
    text: "Transform your business with our amazing solution! Get started today.",
    tone: "professional",
    length: "medium",
    characterCount: 67,
    aiPrompt: "test prompt",
    aiModel: "claude-sonnet-4-5",
    variationType: "tone",
  };

  describe("scoreVariant", () => {
    it("should score a variant with default parameters", () => {
      const score = scoreVariant(baseVariant);

      expect(score).toHaveProperty("predictedCTR");
      expect(score).toHaveProperty("predictedER");
      expect(score).toHaveProperty("predictedCR");
      expect(score).toHaveProperty("confidenceScore");
      expect(score).toHaveProperty("factorsAnalyzed");

      expect(score.predictedCTR).toBeGreaterThanOrEqual(0);
      expect(score.predictedCTR).toBeLessThanOrEqual(1);
      expect(score.confidenceScore).toBeGreaterThan(0);
      expect(score.confidenceScore).toBeLessThanOrEqual(100);
    });

    it("should give higher score for optimal length", () => {
      const shortVariant: CopyVariant = {
        ...baseVariant,
        characterCount: 130, // Optimal range
      };

      const longVariant: CopyVariant = {
        ...baseVariant,
        characterCount: 300, // Too long
      };

      const shortScore = scoreVariant(shortVariant);
      const longScore = scoreVariant(longVariant);

      expect(shortScore.factorsAnalyzed.lengthScore!).toBeGreaterThan(
        longScore.factorsAnalyzed.lengthScore!,
      );
    });

    it("should give higher score for variants with CTA", () => {
      const withCTA: CopyVariant = {
        ...baseVariant,
        text: "Transform your business! Get started now!",
        ctaStyle: "action",
      };

      const withoutCTA: CopyVariant = {
        ...baseVariant,
        text: "Our business solution is great.",
      };

      const withCTAScore = scoreVariant(withCTA);
      const withoutCTAScore = scoreVariant(withoutCTA);

      expect(withCTAScore.factorsAnalyzed.ctaScore!).toBeGreaterThan(
        withoutCTAScore.factorsAnalyzed.ctaScore!,
      );
    });

    it("should use historical data when provided", () => {
      const historicalData: HistoricalPerformanceData = {
        platform: "instagram",
        avgCTR: 0.03,
        avgEngagementRate: 0.05,
        avgConversionRate: 0.01,
        optimalLengthRange: [120, 150],
        bestTones: ["professional", "friendly"],
        sampleSize: 150,
      };

      const scoreWithData = scoreVariant(baseVariant, historicalData);
      const scoreWithoutData = scoreVariant(baseVariant);

      expect(scoreWithData.confidenceScore).toBeGreaterThan(
        scoreWithoutData.confidenceScore,
      );
    });

    it("should boost score for tone matching historical best", () => {
      const historicalData: HistoricalPerformanceData = {
        platform: "instagram",
        avgCTR: 0.03,
        avgEngagementRate: 0.05,
        avgConversionRate: 0.01,
        bestTones: ["professional"],
        sampleSize: 100,
      };

      const matchingTone: CopyVariant = {
        ...baseVariant,
        tone: "professional",
      };

      const nonMatchingTone: CopyVariant = {
        ...baseVariant,
        tone: "playful",
      };

      const matchingScore = scoreVariant(matchingTone, historicalData);
      const nonMatchingScore = scoreVariant(nonMatchingTone, historicalData);

      expect(matchingScore.factorsAnalyzed.toneScore!).toBeGreaterThan(
        nonMatchingScore.factorsAnalyzed.toneScore!,
      );
    });

    it("should consider platform-specific optimal lengths", () => {
      const variant: CopyVariant = {
        ...baseVariant,
        characterCount: 120, // Good for Twitter
      };

      const twitterScore = scoreVariant(variant, undefined, "twitter");
      const facebookScore = scoreVariant(variant, undefined, "facebook");

      // Twitter optimal is 100-140, Facebook is 100-250
      // Both should score well for 120 characters
      expect(twitterScore.factorsAnalyzed.lengthScore!).toBeGreaterThan(70);
      expect(facebookScore.factorsAnalyzed.lengthScore!).toBeGreaterThan(70);
    });
  });

  describe("scoreAndRankVariants", () => {
    it("should score and rank multiple variants", () => {
      const variants: CopyVariant[] = [
        {
          ...baseVariant,
          text: "Great product!",
          characterCount: 14,
        },
        {
          ...baseVariant,
          text: "Transform your business with our solution. Get started today!",
          characterCount: 61,
          ctaStyle: "action",
        },
        {
          ...baseVariant,
          text: "This is a very long copy that goes on and on about features and benefits in great detail...",
          characterCount: 93,
        },
      ];

      const scores = scoreAndRankVariants(variants);

      expect(scores).toHaveLength(3);
      // Scores should be sorted by predictedCTR descending
      expect(scores[0]?.predictedCTR).toBeGreaterThanOrEqual(
        scores[1]?.predictedCTR ?? 0,
      );
      expect(scores[1]?.predictedCTR).toBeGreaterThanOrEqual(
        scores[2]?.predictedCTR ?? 0,
      );
    });

    it("should rank variant with CTA higher", () => {
      const variants: CopyVariant[] = [
        {
          ...baseVariant,
          text: "Our product is amazing.",
          characterCount: 23,
        },
        {
          ...baseVariant,
          text: "Our product is amazing. Buy now!",
          characterCount: 32,
          ctaStyle: "action",
        },
      ];

      const scores = scoreAndRankVariants(variants);

      // Variant with CTA should rank higher
      expect(scores[0]?.factorsAnalyzed.ctaScore!).toBeGreaterThan(
        scores[1]?.factorsAnalyzed.ctaScore!,
      );
    });
  });
});
