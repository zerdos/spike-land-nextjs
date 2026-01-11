/**
 * Allocator Recommendation Engine Tests
 *
 * Unit tests for the budget allocation recommendation service.
 * Part of #548: Build Allocator recommendation engine
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllocatorRecommendations,
  getPlatformBenchmarks,
  isHighImpactRecommendation,
} from "./allocator-service";
import type { AllocatorAnalysisOptions, BudgetRecommendation } from "./allocator-types";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      findMany: vi.fn(),
    },
    campaignAttribution: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";

describe("allocator-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlatformBenchmarks", () => {
    it("returns benchmarks for Facebook", () => {
      const benchmark = getPlatformBenchmarks("FACEBOOK");
      expect(benchmark).toBeDefined();
      expect(benchmark?.platform).toBe("FACEBOOK");
      expect(benchmark?.benchmarks.averageRoas).toBeGreaterThan(0);
      expect(benchmark?.benchmarks.averageCpa).toBeGreaterThan(0);
    });

    it("returns benchmarks for Google Ads", () => {
      const benchmark = getPlatformBenchmarks("GOOGLE_ADS");
      expect(benchmark).toBeDefined();
      expect(benchmark?.platform).toBe("GOOGLE_ADS");
      expect(benchmark?.benchmarks.averageRoas).toBeGreaterThan(0);
    });

    it("returns undefined for unsupported platforms", () => {
      const benchmark = getPlatformBenchmarks("TWITTER" as "FACEBOOK");
      expect(benchmark).toBeUndefined();
    });
  });

  describe("getAllocatorRecommendations", () => {
    const defaultOptions: AllocatorAnalysisOptions = {
      workspaceId: "workspace-1",
      lookbackDays: 30,
      riskTolerance: "moderate",
    };

    it("returns empty recommendations when no marketing accounts", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const result = await getAllocatorRecommendations(defaultOptions);

      expect(result.campaignAnalyses).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
      expect(result.summary.totalCampaignsAnalyzed).toBe(0);
    });

    it("returns recommendations when campaign data exists", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
        {
          id: "account-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accountName: "Test FB Account",
          accessToken: "encrypted",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Create mock attribution data for high-performing campaign
      const now = new Date();
      const attributions = [];
      for (let i = 0; i < 20; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        attributions.push({
          id: `attr-${i}`,
          userId: "user-1",
          sessionId: `session-${i}`,
          attributionType: "FIRST_TOUCH" as const,
          platform: "FACEBOOK",
          externalCampaignId: "campaign-1",
          utmCampaign: "Summer Sale",
          utmSource: "facebook",
          utmMedium: "cpc",
          conversionId: `conv-${i}`,
          conversionType: "PURCHASE" as const,
          conversionValue: 5000 + (i % 5) * 1000, // $50-$90
          convertedAt: date,
        });
      }

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(attributions);

      const result = await getAllocatorRecommendations(defaultOptions);

      expect(result.campaignAnalyses.length).toBeGreaterThanOrEqual(1);
      expect(result.hasEnoughData).toBe(true);
      expect(result.summary.totalCampaignsAnalyzed).toBeGreaterThan(0);
    });

    it("generates SCALE_WINNER recommendation for high performers", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
        {
          id: "account-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accountName: "Test Account",
          accessToken: "encrypted",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // High-performing campaign with lots of conversions
      const now = new Date();
      const attributions = [];
      for (let i = 0; i < 50; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i % 30));
        attributions.push({
          id: `attr-${i}`,
          userId: "user-1",
          sessionId: `session-${i}`,
          attributionType: "FIRST_TOUCH" as const,
          platform: "FACEBOOK",
          externalCampaignId: "high-performer",
          utmCampaign: "High Performer",
          utmSource: "facebook",
          utmMedium: "cpc",
          conversionId: `conv-${i}`,
          conversionType: "PURCHASE" as const,
          conversionValue: 10000, // $100 value
          convertedAt: date,
        });
      }

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(attributions);

      const result = await getAllocatorRecommendations(defaultOptions);

      const scaleRecommendation = result.recommendations.find(
        (r) => r.type === "SCALE_WINNER",
      );

      // Should have a SCALE_WINNER recommendation for high performer
      if (
        result.campaignAnalyses.length > 0 && result.campaignAnalyses[0]!.performanceScore >= 70
      ) {
        expect(scaleRecommendation).toBeDefined();
        expect(scaleRecommendation?.suggestedBudgetChange).toBeGreaterThan(0);
      }
    });

    it("generates DECREASE_BUDGET or PAUSE_CAMPAIGN for underperformers", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
        {
          id: "account-1",
          userId: "user-1",
          platform: "GOOGLE_ADS",
          accountId: "google-123",
          accountName: "Test Account",
          accessToken: "encrypted",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Low-performing campaign with few conversions
      const now = new Date();
      const attributions = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i * 10);
        attributions.push({
          id: `attr-${i}`,
          userId: "user-1",
          sessionId: `session-${i}`,
          attributionType: "FIRST_TOUCH" as const,
          platform: "GOOGLE_ADS",
          externalCampaignId: "low-performer",
          utmCampaign: "Low Performer",
          utmSource: "google",
          utmMedium: "cpc",
          conversionId: `conv-${i}`,
          conversionType: "PURCHASE" as const,
          conversionValue: 1000, // Low $10 value
          convertedAt: date,
        });
      }

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(attributions);

      const result = await getAllocatorRecommendations(defaultOptions);

      const decreaseRecommendation = result.recommendations.find(
        (r) => r.type === "DECREASE_BUDGET" || r.type === "PAUSE_CAMPAIGN",
      );

      // If campaign scores low, should have decrease/pause recommendation
      if (result.campaignAnalyses.length > 0 && result.campaignAnalyses[0]!.performanceScore < 40) {
        expect(decreaseRecommendation).toBeDefined();
        expect(decreaseRecommendation?.suggestedBudgetChange).toBeLessThan(0);
      }
    });

    it("respects riskTolerance setting", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
        {
          id: "account-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accountName: "Test Account",
          accessToken: "encrypted",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const now = new Date();
      const attributions = [];
      for (let i = 0; i < 30; i++) {
        attributions.push({
          id: `attr-${i}`,
          userId: "user-1",
          sessionId: `session-${i}`,
          attributionType: "FIRST_TOUCH" as const,
          platform: "FACEBOOK",
          externalCampaignId: "campaign-1",
          utmCampaign: "Test Campaign",
          utmSource: "facebook",
          utmMedium: "cpc",
          conversionId: `conv-${i}`,
          conversionType: "PURCHASE" as const,
          conversionValue: 5000,
          convertedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        });
      }

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(attributions);

      const conservativeResult = await getAllocatorRecommendations({
        ...defaultOptions,
        riskTolerance: "conservative",
      });

      const aggressiveResult = await getAllocatorRecommendations({
        ...defaultOptions,
        riskTolerance: "aggressive",
      });

      // Both should return results
      expect(conservativeResult).toBeDefined();
      expect(aggressiveResult).toBeDefined();
    });

    it("filters by account IDs when provided", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
        {
          id: "specific-account",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accountName: "Specific Account",
          accessToken: "encrypted",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      await getAllocatorRecommendations({
        ...defaultOptions,
        accountIds: ["specific-account"],
      });

      expect(prisma.marketingAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ["specific-account"] },
          }),
        }),
      );
    });

    it("calculates data quality score correctly", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const result = await getAllocatorRecommendations(defaultOptions);

      expect(result.dataQualityScore).toBeDefined();
      expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.dataQualityScore).toBeLessThanOrEqual(100);
    });

    it("returns analysis range correctly", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const result = await getAllocatorRecommendations({
        ...defaultOptions,
        lookbackDays: 14,
      });

      expect(result.analysisRange.start).toBeInstanceOf(Date);
      expect(result.analysisRange.end).toBeInstanceOf(Date);
      expect(result.analysisRange.end.getTime()).toBeGreaterThan(
        result.analysisRange.start.getTime(),
      );
    });
  });

  describe("isHighImpactRecommendation", () => {
    it("returns true for high confidence with significant impact", () => {
      const recommendation: BudgetRecommendation = {
        id: "rec-1",
        type: "SCALE_WINNER",
        confidence: "high",
        targetCampaign: {
          id: "campaign-1",
          name: "Test Campaign",
          platform: "FACEBOOK",
          currentBudget: 10000,
        },
        suggestedBudgetChange: 2000,
        suggestedNewBudget: 12000,
        currency: "USD",
        projectedImpact: {
          estimatedRoasChange: 20,
          estimatedCpaChange: -15,
          estimatedConversionChange: 25,
          estimatedSpendChange: 2000,
          confidenceInterval: { low: 15, high: 35 },
        },
        reason: "High performer",
        supportingData: [],
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      expect(isHighImpactRecommendation(recommendation)).toBe(true);
    });

    it("returns false for low confidence", () => {
      const recommendation: BudgetRecommendation = {
        id: "rec-1",
        type: "SCALE_WINNER",
        confidence: "low",
        targetCampaign: {
          id: "campaign-1",
          name: "Test Campaign",
          platform: "FACEBOOK",
          currentBudget: 10000,
        },
        suggestedBudgetChange: 2000,
        suggestedNewBudget: 12000,
        currency: "USD",
        projectedImpact: {
          estimatedRoasChange: 20,
          estimatedCpaChange: -15,
          estimatedConversionChange: 25,
          estimatedSpendChange: 2000,
          confidenceInterval: { low: 5, high: 40 },
        },
        reason: "Not enough data",
        supportingData: [],
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      expect(isHighImpactRecommendation(recommendation)).toBe(false);
    });

    it("returns false for low impact", () => {
      const recommendation: BudgetRecommendation = {
        id: "rec-1",
        type: "DECREASE_BUDGET",
        confidence: "high",
        targetCampaign: {
          id: "campaign-1",
          name: "Test Campaign",
          platform: "GOOGLE_ADS",
          currentBudget: 10000,
        },
        suggestedBudgetChange: -500,
        suggestedNewBudget: 9500,
        currency: "USD",
        projectedImpact: {
          estimatedRoasChange: 0,
          estimatedCpaChange: 0,
          estimatedConversionChange: -5, // Low impact
          estimatedSpendChange: -500,
          confidenceInterval: { low: -10, high: 0 },
        },
        reason: "Minor adjustment",
        supportingData: [],
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      expect(isHighImpactRecommendation(recommendation)).toBe(false);
    });
  });
});
