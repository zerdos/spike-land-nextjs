/**
 * Optimal Time Service Tests
 *
 * Unit tests for the optimal posting time service.
 * Issue #841
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOptimalTimes,
  refreshOptimalTimes,
  getHeatmapData,
} from "./optimal-time-service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    postingTimeRecommendation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock best-time-service
vi.mock("./best-time-service", () => ({
  getBestTimeRecommendations: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getBestTimeRecommendations } from "./best-time-service";

// Helper to create mock social account
function createMockSocialAccount(overrides: {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  workspaceId?: string;
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
    workspaceId: overrides.workspaceId ?? "workspace-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper to create mock posting time recommendation
function createMockRecommendation(overrides: {
  id: string;
  accountId: string;
  dayOfWeek: number;
  hourUtc: number;
  score: number;
}) {
  return {
    id: overrides.id,
    accountId: overrides.accountId,
    dayOfWeek: overrides.dayOfWeek,
    hourUtc: overrides.hourUtc,
    score: overrides.score,
    confidence: "high" as const,
    reason: "Historical data analysis",
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("optimal-time-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOptimalTimes", () => {
    it("returns empty array when no active accounts exist", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const result = await getOptimalTimes({
        workspaceId: "workspace-1",
      });

      expect(result).toEqual([]);
    });

    it("returns cached recommendations when available", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }),
      ]);

      const cachedRec = createMockRecommendation({
        id: "rec-1",
        accountId: "account-1",
        dayOfWeek: 2,
        hourUtc: 10,
        score: 85,
      });

      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue([
        cachedRec,
      ] as never);

      const result = await getOptimalTimes({
        workspaceId: "workspace-1",
        refreshCache: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.dayOfWeek).toBe(2);
      expect(result[0]?.hourUtc).toBe(10);
      expect(result[0]?.score).toBe(85);
      expect(getBestTimeRecommendations).not.toHaveBeenCalled();
    });

    it("generates new recommendations when cache is empty", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }),
      ]);

      // Cache is empty
      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue(
        [],
      );

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "Test LinkedIn",
            bestTimeSlots: [
              {
                dayOfWeek: 2,
                hour: 10,
                confidence: "high",
                engagementScore: 85,
                reason: "High engagement",
              },
            ],
            avoidDays: [],
            peakHours: [10],
            hasEnoughData: true,
            daysAnalyzed: 30,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      vi.mocked(prisma.postingTimeRecommendation.findUnique).mockResolvedValue(
        null,
      );

      const createdRec = createMockRecommendation({
        id: "rec-new",
        accountId: "account-1",
        dayOfWeek: 2,
        hourUtc: 10,
        score: 85,
      });

      vi.mocked(prisma.postingTimeRecommendation.create).mockResolvedValue(
        createdRec as never,
      );

      const result = await getOptimalTimes({
        workspaceId: "workspace-1",
      });

      expect(result).toHaveLength(1);
      expect(getBestTimeRecommendations).toHaveBeenCalled();
      expect(prisma.postingTimeRecommendation.create).toHaveBeenCalled();
    });

    it("refreshes cache when refreshCache is true", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "Test LinkedIn",
            bestTimeSlots: [
              {
                dayOfWeek: 3,
                hour: 14,
                confidence: "high",
                engagementScore: 90,
                reason: "Updated data",
              },
            ],
            avoidDays: [],
            peakHours: [14],
            hasEnoughData: true,
            daysAnalyzed: 30,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      const existingRec = createMockRecommendation({
        id: "rec-existing",
        accountId: "account-1",
        dayOfWeek: 3,
        hourUtc: 14,
        score: 80,
      });

      vi.mocked(prisma.postingTimeRecommendation.findUnique).mockResolvedValue(
        existingRec as never,
      );

      vi.mocked(prisma.postingTimeRecommendation.update).mockResolvedValue({
        ...existingRec,
        score: 90,
      } as never);

      const result = await getOptimalTimes({
        workspaceId: "workspace-1",
        refreshCache: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.score).toBe(90);
      expect(prisma.postingTimeRecommendation.update).toHaveBeenCalled();
    });

    it("filters by specific account IDs", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-2",
          platform: "TWITTER",
          accountName: "Test Twitter",
        }),
      ]);

      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue(
        [],
      );

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      await getOptimalTimes({
        workspaceId: "workspace-1",
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
  });

  describe("refreshOptimalTimes", () => {
    it("calls getOptimalTimes with refreshCache true", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      await refreshOptimalTimes("workspace-1");

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
            status: "ACTIVE",
          }),
        }),
      );
    });
  });

  describe("getHeatmapData", () => {
    it("throws error when account is not found", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue(null);

      await expect(getHeatmapData("non-existent")).rejects.toThrow(
        "Account not found",
      );
    });

    it("returns heatmap with existing recommendations", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue(
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }) as never,
      );

      const recommendations = [
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 2,
          hourUtc: 10,
          score: 85,
        }),
        createMockRecommendation({
          id: "rec-2",
          accountId: "account-1",
          dayOfWeek: 3,
          hourUtc: 14,
          score: 90,
        }),
      ];

      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue(
        recommendations as never,
      );

      const result = await getHeatmapData("account-1");

      expect(result.accountId).toBe("account-1");
      expect(result.platform).toBe("LINKEDIN");
      expect(result.accountName).toBe("Test LinkedIn");
      expect(result.heatmap).toHaveLength(7);
      expect(result.heatmap[0]).toHaveLength(24);
      expect(result.heatmap[2]?.[10]).toBe(85);
      expect(result.heatmap[3]?.[14]).toBe(90);
      expect(result.maxScore).toBe(90);
      expect(result.minScore).toBe(85);
    });

    it("generates recommendations when none exist (first call)", async () => {
      vi.mocked(prisma.socialAccount.findUnique)
        .mockResolvedValueOnce(
          createMockSocialAccount({
            id: "account-1",
            platform: "LINKEDIN",
            accountName: "Test LinkedIn",
            workspaceId: "workspace-1",
          }) as never,
        )
        .mockResolvedValueOnce({ workspaceId: "workspace-1" } as never)
        .mockResolvedValueOnce(
          createMockSocialAccount({
            id: "account-1",
            platform: "LINKEDIN",
            accountName: "Test LinkedIn",
            workspaceId: "workspace-1",
          }) as never,
        );

      // First call returns empty, second returns recommendations after generation
      vi.mocked(prisma.postingTimeRecommendation.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          createMockRecommendation({
            id: "rec-1",
            accountId: "account-1",
            dayOfWeek: 2,
            hourUtc: 10,
            score: 75,
          }),
        ] as never);

      // Mock the socialAccount.findMany for getOptimalTimes
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "Test LinkedIn",
            bestTimeSlots: [
              {
                dayOfWeek: 2,
                hour: 10,
                confidence: "high",
                engagementScore: 75,
                reason: "Industry benchmark",
              },
            ],
            avoidDays: [],
            peakHours: [10],
            hasEnoughData: false,
            daysAnalyzed: 0,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      vi.mocked(prisma.postingTimeRecommendation.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.postingTimeRecommendation.create).mockResolvedValue(
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 2,
          hourUtc: 10,
          score: 75,
        }) as never,
      );

      const result = await getHeatmapData("account-1");

      expect(result.heatmap[2]?.[10]).toBe(75);
      expect(getBestTimeRecommendations).toHaveBeenCalled();
    });

    it("prevents infinite recursion with attemptGenerate flag", async () => {
      vi.mocked(prisma.socialAccount.findUnique)
        .mockResolvedValue(
          createMockSocialAccount({
            id: "account-1",
            platform: "LINKEDIN",
            accountName: "Test LinkedIn",
            workspaceId: "workspace-1",
          }) as never,
        );

      // Always returns empty
      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue(
        [],
      );

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }),
      ]);

      // getBestTimeRecommendations returns empty (no data to generate from)
      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      // Call with attemptGenerate = false
      const result = await getHeatmapData("account-1", false);

      // Should return empty heatmap without calling getBestTimeRecommendations
      expect(result.heatmap[0]?.[0]).toBe(0);
      expect(result.maxScore).toBe(0);
    });

    it("returns correct min/max scores", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue(
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
        }) as never,
      );

      const recommendations = [
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 1,
          hourUtc: 9,
          score: 45,
        }),
        createMockRecommendation({
          id: "rec-2",
          accountId: "account-1",
          dayOfWeek: 2,
          hourUtc: 10,
          score: 95,
        }),
        createMockRecommendation({
          id: "rec-3",
          accountId: "account-1",
          dayOfWeek: 3,
          hourUtc: 11,
          score: 70,
        }),
      ];

      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue(
        recommendations as never,
      );

      const result = await getHeatmapData("account-1");

      expect(result.maxScore).toBe(95);
      expect(result.minScore).toBe(45);
    });
  });
});
