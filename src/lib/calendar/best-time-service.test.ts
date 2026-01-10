/**
 * Best-Time Recommendations Service Tests
 *
 * Unit tests for the best-time posting recommendations service.
 * Part of #578: Add best-time recommendations
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBestTimeRecommendations,
  getIndustryBenchmarks,
  isRecommendedTimeSlot,
} from "./best-time-service";
import type { BestTimeRecommendationsOptions } from "./best-time-types";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
    socialMetrics: {
      findMany: vi.fn(),
    },
    scheduledPost: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";

// Helper to create mock social account
function createMockSocialAccount(overrides: {
  id: string;
  platform: SocialPlatform;
  accountName: string;
}) {
  return {
    id: overrides.id,
    platform: overrides.platform,
    accountId: `ext-${overrides.id}`,
    accountName: overrides.accountName,
    accessTokenEncrypted: "encrypted-token",
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
    connectedAt: new Date(),
    status: "ACTIVE" as const,
    metadata: null,
    userId: "user-1",
    workspaceId: "workspace-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("best-time-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getIndustryBenchmarks", () => {
    it("returns benchmarks for LinkedIn", () => {
      const benchmark = getIndustryBenchmarks("LINKEDIN");
      expect(benchmark).toBeDefined();
      expect(benchmark?.platform).toBe("LINKEDIN");
      expect(benchmark?.bestDays).toContain(2); // Tuesday
      expect(benchmark?.bestHours).toContain(9); // 9 AM
    });

    it("returns benchmarks for Twitter", () => {
      const benchmark = getIndustryBenchmarks("TWITTER");
      expect(benchmark).toBeDefined();
      expect(benchmark?.platform).toBe("TWITTER");
      expect(benchmark?.bestDays).toContain(1); // Monday
    });

    it("returns benchmarks for Facebook", () => {
      const benchmark = getIndustryBenchmarks("FACEBOOK");
      expect(benchmark).toBeDefined();
      expect(benchmark?.platform).toBe("FACEBOOK");
    });

    it("returns benchmarks for Instagram", () => {
      const benchmark = getIndustryBenchmarks("INSTAGRAM");
      expect(benchmark).toBeDefined();
      expect(benchmark?.platform).toBe("INSTAGRAM");
      expect(benchmark?.bestHours).toContain(19); // 7 PM
    });

    it("returns undefined for unsupported platforms", () => {
      const benchmark = getIndustryBenchmarks("TIKTOK" as SocialPlatform);
      expect(benchmark).toBeUndefined();
    });
  });

  describe("getBestTimeRecommendations", () => {
    const defaultOptions: BestTimeRecommendationsOptions = {
      workspaceId: "workspace-1",
      lookbackDays: 30,
      includeGaps: true,
    };

    it("returns recommendations for workspace with accounts", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await getBestTimeRecommendations(defaultOptions);

      expect(result).toBeDefined();
      expect(result.platformRecommendations).toHaveLength(1);
      expect(result.platformRecommendations[0]?.platform).toBe("LINKEDIN");
      expect(result.platformRecommendations[0]?.accountName).toBe("Test Company");
    });

    it("uses industry benchmarks when no historical data", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await getBestTimeRecommendations(defaultOptions);

      expect(result.platformRecommendations[0]?.hasEnoughData).toBe(false);
      expect(
        (result.platformRecommendations[0]?.bestTimeSlots.length ?? 0) > 0,
      ).toBe(true);
      // Should use industry benchmarks
      expect(
        result.platformRecommendations[0]?.bestTimeSlots[0]?.reason,
      ).toContain("Industry best practice");
    });

    it("calculates recommendations from historical data", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      // Create mock metrics for 30+ days
      const mockMetrics = [];
      const baseDate = new Date();
      for (let i = 0; i < 35; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        mockMetrics.push({
          id: `metric-${i}`,
          accountId: "account-1",
          date,
          followers: 1000 + i * 10,
          following: 100,
          postsCount: 50 + i,
          engagementRate: 0.05 + (i % 7) * 0.01,
          impressions: 5000 + (i % 7) * 500,
          reach: 3000 + (i % 7) * 300,
          likes: 100 + (i % 7) * 20,
          comments: 10 + (i % 7) * 5,
          shares: 5 + (i % 7) * 2,
          rawData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(mockMetrics as never);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await getBestTimeRecommendations(defaultOptions);

      expect(result.platformRecommendations[0]?.hasEnoughData).toBe(true);
      expect(
        (result.platformRecommendations[0]?.daysAnalyzed ?? 0) >= 30,
      ).toBe(true);
    });

    it("returns empty recommendations for workspace without accounts", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await getBestTimeRecommendations(defaultOptions);

      expect(result.platformRecommendations).toHaveLength(0);
      expect(result.globalBestSlots).toHaveLength(0);
    });

    it("filters by specific account IDs", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-2",
          platform: "TWITTER",
          accountName: "Test Twitter",
        }),
      ]);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      await getBestTimeRecommendations({
        ...defaultOptions,
        accountIds: ["account-2"],
      });

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ["account-2"] },
          }),
        }),
      );
    });

    it("identifies calendar gaps", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);

      // Create posts with a gap
      const now = new Date();
      const post1Date = new Date(now);
      post1Date.setDate(post1Date.getDate() + 1);
      const post2Date = new Date(now);
      post2Date.setDate(post2Date.getDate() + 5);

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([
        {
          id: "post-1",
          scheduledAt: post1Date,
          content: "Test post 1",
          status: "SCHEDULED" as const,
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          metadata: null,
          publishedAt: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          workspaceId: "workspace-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "post-2",
          scheduledAt: post2Date,
          content: "Test post 2",
          status: "SCHEDULED" as const,
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          metadata: null,
          publishedAt: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          workspaceId: "workspace-1",
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await getBestTimeRecommendations(defaultOptions);

      expect(result.calendarGaps.length).toBeGreaterThan(0);
    });

    it("skips gap analysis when includeGaps is false", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const result = await getBestTimeRecommendations({
        ...defaultOptions,
        includeGaps: false,
      });

      expect(result.calendarGaps).toHaveLength(0);
      expect(prisma.scheduledPost.findMany).not.toHaveBeenCalled();
    });

    it("calculates global best slots across platforms", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "LinkedIn Account",
        }),
        createMockSocialAccount({
          id: "account-2",
          platform: "TWITTER",
          accountName: "Twitter Account",
        }),
      ]);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await getBestTimeRecommendations(defaultOptions);

      expect(result.platformRecommendations).toHaveLength(2);
      expect(result.globalBestSlots.length).toBeGreaterThan(0);
    });
  });

  describe("isRecommendedTimeSlot", () => {
    it("returns true for recommended slots", () => {
      const recommendations = {
        platform: "LINKEDIN" as SocialPlatform,
        accountId: "account-1",
        accountName: "Test",
        bestTimeSlots: [
          {
            dayOfWeek: 2 as const,
            hour: 10 as const,
            confidence: "high" as const,
            engagementScore: 85,
            reason: "Test reason",
          },
        ],
        avoidDays: [],
        peakHours: [10 as const],
        hasEnoughData: true,
        daysAnalyzed: 30,
      };

      expect(isRecommendedTimeSlot(recommendations, 2, 10)).toBe(true);
    });

    it("returns false for non-recommended slots", () => {
      const recommendations = {
        platform: "LINKEDIN" as SocialPlatform,
        accountId: "account-1",
        accountName: "Test",
        bestTimeSlots: [
          {
            dayOfWeek: 2 as const,
            hour: 10 as const,
            confidence: "high" as const,
            engagementScore: 85,
            reason: "Test reason",
          },
        ],
        avoidDays: [],
        peakHours: [10 as const],
        hasEnoughData: true,
        daysAnalyzed: 30,
      };

      expect(isRecommendedTimeSlot(recommendations, 0, 15)).toBe(false);
    });
  });
});
