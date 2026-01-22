/**
 * Workspace Metrics Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Helper to create decimal-like objects for mocking
function mockDecimal(value: number): { toString: () => string; toNumber: () => number; } {
  return {
    toString: () => value.toString(),
    toNumber: () => value,
  };
}

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
    socialMetrics: {
      findMany: vi.fn(),
    },
  },
}));

// Import after mocks
import prisma from "@/lib/prisma";

import { getWorkspaceMetrics, getWorkspaceMetricsByAccount } from "./workspace-metrics";

describe("Workspace Metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWorkspaceMetrics", () => {
    it("should return zero metrics when no accounts exist", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const result = await getWorkspaceMetrics(workspaceId, startDate, endDate);

      expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      expect(result).toEqual({
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        totalPosts: 0,
        engagementRate: 0,
      });
    });

    it("should return zero metrics when no metrics exist for accounts", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1" },
      ] as any);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);

      const result = await getWorkspaceMetrics(workspaceId, startDate, endDate);

      expect(result).toEqual({
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        totalPosts: 0,
        engagementRate: 0,
      });
    });

    it("should aggregate metrics from multiple accounts", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1" },
        { id: "acc-2" },
      ] as any);

      const mockMetrics = [
        {
          likes: 100,
          comments: 20,
          shares: 10,
          postsCount: 5,
          engagementRate: mockDecimal(0.05),
        },
        {
          likes: 200,
          comments: 40,
          shares: 20,
          postsCount: 10,
          engagementRate: mockDecimal(0.03),
        },
      ];

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(
        mockMetrics as any,
      );

      const result = await getWorkspaceMetrics(workspaceId, startDate, endDate);

      expect(prisma.socialMetrics.findMany).toHaveBeenCalledWith({
        where: {
          accountId: {
            in: ["acc-1", "acc-2"],
          },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          likes: true,
          comments: true,
          shares: true,
          postsCount: true,
          engagementRate: true,
        },
      });

      // 2 records, so averages are (100 + 200) / 2 = 150, etc.
      expect(result.averageLikes).toBe(150);
      expect(result.averageComments).toBe(30);
      expect(result.averageShares).toBe(15);
      expect(result.totalPosts).toBe(15);
      expect(result.engagementRate).toBe(0.04); // (0.05 + 0.03) / 2
    });

    it("should handle metrics with null engagement rate", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1" },
      ] as any);

      const mockMetrics = [
        {
          likes: 100,
          comments: 20,
          shares: 10,
          postsCount: 5,
          engagementRate: null,
        },
        {
          likes: 200,
          comments: 40,
          shares: 20,
          postsCount: 10,
          engagementRate: mockDecimal(0.05),
        },
      ];

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(
        mockMetrics as any,
      );

      const result = await getWorkspaceMetrics(workspaceId, startDate, endDate);

      expect(result.engagementRate).toBe(0.05); // Only one record has engagement rate
    });

    it("should return zero engagement rate when all engagement rates are null", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1" },
      ] as any);

      const mockMetrics = [
        {
          likes: 100,
          comments: 20,
          shares: 10,
          postsCount: 5,
          engagementRate: null,
        },
      ];

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(
        mockMetrics as any,
      );

      const result = await getWorkspaceMetrics(workspaceId, startDate, endDate);

      expect(result.engagementRate).toBe(0);
    });
  });

  describe("getWorkspaceMetricsByAccount", () => {
    it("should return empty array when no accounts exist", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const result = await getWorkspaceMetricsByAccount(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result).toEqual([]);
    });

    it("should return metrics breakdown by account", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1", platform: "TWITTER", accountName: "testuser" },
        { id: "acc-2", platform: "FACEBOOK", accountName: "testpage" },
      ] as any);

      // First call for acc-1
      vi.mocked(prisma.socialMetrics.findMany)
        .mockResolvedValueOnce([
          {
            likes: 100,
            comments: 20,
            shares: 10,
            postsCount: 5,
            engagementRate: mockDecimal(0.05),
          },
        ] as any)
        // Second call for acc-2
        .mockResolvedValueOnce([
          {
            likes: 200,
            comments: 40,
            shares: 20,
            postsCount: 10,
            engagementRate: mockDecimal(0.03),
          },
        ] as any);

      const result = await getWorkspaceMetricsByAccount(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        accountId: "acc-1",
        platform: "TWITTER",
        accountName: "testuser",
        metrics: {
          averageLikes: 100,
          averageComments: 20,
          averageShares: 10,
          totalPosts: 5,
          engagementRate: 0.05,
        },
      });
      expect(result[1]).toEqual({
        accountId: "acc-2",
        platform: "FACEBOOK",
        accountName: "testpage",
        metrics: {
          averageLikes: 200,
          averageComments: 40,
          averageShares: 20,
          totalPosts: 10,
          engagementRate: 0.03,
        },
      });
    });

    it("should return zero metrics for accounts with no data", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1", platform: "TWITTER", accountName: "testuser" },
      ] as any);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);

      const result = await getWorkspaceMetricsByAccount(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        accountId: "acc-1",
        platform: "TWITTER",
        accountName: "testuser",
        metrics: {
          averageLikes: 0,
          averageComments: 0,
          averageShares: 0,
          totalPosts: 0,
          engagementRate: 0,
        },
      });
    });

    it("should handle null engagement rate in per-account metrics", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        { id: "acc-1", platform: "TWITTER", accountName: "testuser" },
      ] as any);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([
        {
          likes: 100,
          comments: 20,
          shares: 10,
          postsCount: 5,
          engagementRate: null,
        },
      ] as any);

      const result = await getWorkspaceMetricsByAccount(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result[0]?.metrics.engagementRate).toBe(0);
    });
  });
});
