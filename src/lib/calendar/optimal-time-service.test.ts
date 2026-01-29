/**
 * Optimal Time Service Tests
 * Issue #841
 */

import prisma from "@/lib/prisma";
import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHeatmapData, getOptimalTimes } from "./optimal-time-service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    postingTimeRecommendation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("./best-time-service", () => ({
  getBestTimeRecommendations: vi.fn(),
}));

import { getBestTimeRecommendations } from "./best-time-service";

describe("optimal-time-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOptimalTimes", () => {
    const mockAccount = {
      id: "acc-1",
      workspaceId: "ws-1",
      status: "ACTIVE",
    };

    it("returns cached recommendations when valid cache exists", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount] as any);

      const mockCachedRec = {
        id: "rec-1",
        accountId: "acc-1",
        dayOfWeek: 1,
        hourUtc: 10,
        score: 90,
        confidence: "high" as const,
        reason: "Test",
        lastUpdated: new Date(),
      };

      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue([mockCachedRec]);

      const result = await getOptimalTimes({
        workspaceId: "ws-1",
        accountIds: ["acc-1"],
      });

      expect(prisma.postingTimeRecommendation.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]!.score).toBe(90);
      expect(getBestTimeRecommendations).not.toHaveBeenCalled();
    });

    it("generates new recommendations when cache is invalid or missing", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([mockAccount] as any);
      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue([]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "acc-1",
            accountName: "Test",
            bestTimeSlots: [
              {
                dayOfWeek: 2,
                hour: 14,
                engagementScore: 85,
                confidence: "high",
                reason: "New data",
              },
            ],
            hasEnoughData: true,
            daysAnalyzed: 30,
            avoidDays: [],
            peakHours: [],
          },
        ],
        globalBestSlots: [],
        calendarGaps: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      vi.mocked(prisma.postingTimeRecommendation.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.postingTimeRecommendation.create).mockResolvedValue({
        id: "new-rec-1",
        accountId: "acc-1",
        dayOfWeek: 2,
        hourUtc: 14,
        score: 85,
        confidence: "high",
        reason: "New data",
        lastUpdated: new Date(),
      } as any);

      const result = await getOptimalTimes({
        workspaceId: "ws-1",
        refreshCache: true,
      });

      expect(getBestTimeRecommendations).toHaveBeenCalled();
      expect(prisma.postingTimeRecommendation.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]!.score).toBe(85);
    });
  });

  describe("getHeatmapData", () => {
    it("returns heatmap data for account with recommendations", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "acc-1",
        platform: "LINKEDIN" as SocialPlatform,
        accountName: "Test Account",
      } as any);

      vi.mocked(prisma.postingTimeRecommendation.findMany).mockResolvedValue([
        {
          id: "rec-1",
          dayOfWeek: 0, // Sunday
          hourUtc: 10,
          score: 50,
          lastUpdated: new Date(),
        },
      ] as any);

      const result = await getHeatmapData("acc-1");

      expect(result.accountId).toBe("acc-1");
      expect(result.heatmap[0]![10]).toBe(50); // Sunday at 10am
      expect(result.maxScore).toBe(50);
    });

    it("attempts generation if no recommendations exist (recursion check)", async () => {
      vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue({
        id: "acc-1",
        workspaceId: "ws-1",
        platform: "LINKEDIN",
        accountName: "Test",
      } as any);

      // First call returns empty
      vi.mocked(prisma.postingTimeRecommendation.findMany)
        .mockResolvedValueOnce([])
        // Second call (inside recursion) also returns empty (simulating failure to generate)
        .mockResolvedValueOnce([]);

      // Mock getOptimalTimes to "run"
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([{ id: "acc-1" }] as any);

      await getHeatmapData("acc-1");

      // Verify recursion guard
      // Should have called findMany twice (once initial, once in recursive call)
      expect(prisma.postingTimeRecommendation.findMany).toHaveBeenCalledTimes(2);

      // Should stop after one recursion level because attemptGenerate would be false
    });
  });
});
