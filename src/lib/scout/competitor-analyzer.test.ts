/**
 * Scout Competitor Analyzer Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    scoutCompetitor: {
      findMany: vi.fn(),
    },
    scoutCompetitorPost: {
      findMany: vi.fn(),
    },
    scoutBenchmark: {
      create: vi.fn(),
    },
  },
}));

// Mock workspace-metrics
vi.mock("@/lib/scout/workspace-metrics", () => ({
  getWorkspaceMetrics: vi.fn(),
}));

// Import after mocks
import prisma from "@/lib/prisma";
import { getWorkspaceMetrics } from "@/lib/scout/workspace-metrics";

import {
  analyzeCompetitorEngagement,
  generateBenchmarkReport,
  getTopCompetitorPosts,
} from "./competitor-analyzer";

describe("Competitor Analyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeCompetitorEngagement", () => {
    it("should calculate engagement metrics for competitor posts", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const competitorId = "comp-1";

      const mockPosts = [
        {
          id: "post-1",
          competitorId,
          platformPostId: "platform-1",
          content: "Post 1",
          postedAt: new Date("2024-01-15"),
          likes: 100,
          comments: 20,
          shares: 10,
        },
        {
          id: "post-2",
          competitorId,
          platformPostId: "platform-2",
          content: "Post 2",
          postedAt: new Date("2024-01-20"),
          likes: 200,
          comments: 40,
          shares: 20,
        },
      ];

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue(
        mockPosts as any,
      );

      const result = await analyzeCompetitorEngagement(
        competitorId,
        startDate,
        endDate,
      );

      expect(prisma.scoutCompetitorPost.findMany).toHaveBeenCalledWith({
        where: {
          competitorId,
          postedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      expect(result.totalPosts).toBe(2);
      expect(result.averageLikes).toBe(150); // (100 + 200) / 2
      expect(result.averageComments).toBe(30); // (20 + 40) / 2
      expect(result.averageShares).toBe(15); // (10 + 20) / 2
      expect(result.engagementRate).toBe(195); // (100 + 20 + 10 + 200 + 40 + 20) / 2
    });

    it("should return zero metrics when no posts found", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const competitorId = "comp-empty";

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue([]);

      const result = await analyzeCompetitorEngagement(
        competitorId,
        startDate,
        endDate,
      );

      expect(result.totalPosts).toBe(0);
      expect(result.averageLikes).toBe(0);
      expect(result.averageComments).toBe(0);
      expect(result.averageShares).toBe(0);
      expect(result.engagementRate).toBe(0);
    });

    it("should handle posts with zero engagement", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const competitorId = "comp-2";

      const mockPosts = [
        {
          id: "post-1",
          competitorId,
          platformPostId: "platform-1",
          content: "Post 1",
          postedAt: new Date("2024-01-15"),
          likes: 0,
          comments: 0,
          shares: 0,
        },
      ];

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue(
        mockPosts as any,
      );

      const result = await analyzeCompetitorEngagement(
        competitorId,
        startDate,
        endDate,
      );

      expect(result.totalPosts).toBe(1);
      expect(result.averageLikes).toBe(0);
      expect(result.averageComments).toBe(0);
      expect(result.averageShares).toBe(0);
      expect(result.engagementRate).toBe(0);
    });
  });

  describe("getTopCompetitorPosts", () => {
    it("should return top posts sorted by likes", async () => {
      const competitorId = "comp-1";

      const mockPosts = [
        {
          id: "post-1",
          competitorId,
          platformPostId: "platform-1",
          content: "Post 1",
          postedAt: new Date("2024-01-15"),
          likes: 500,
          comments: 20,
          shares: 10,
        },
        {
          id: "post-2",
          competitorId,
          platformPostId: "platform-2",
          content: "Post 2",
          postedAt: new Date("2024-01-20"),
          likes: 300,
          comments: 40,
          shares: 20,
        },
      ];

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue(
        mockPosts as any,
      );

      const result = await getTopCompetitorPosts(competitorId, "likes", 5);

      expect(prisma.scoutCompetitorPost.findMany).toHaveBeenCalledWith({
        where: { competitorId },
        orderBy: { likes: "desc" },
        take: 5,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.likes).toBe(500);
    });

    it("should return top posts sorted by comments", async () => {
      const competitorId = "comp-1";

      const mockPosts = [
        {
          id: "post-1",
          competitorId,
          platformPostId: "platform-1",
          content: "Post 1",
          postedAt: new Date("2024-01-15"),
          likes: 100,
          comments: 200,
          shares: 10,
        },
      ];

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue(
        mockPosts as any,
      );

      const result = await getTopCompetitorPosts(competitorId, "comments", 3);

      expect(prisma.scoutCompetitorPost.findMany).toHaveBeenCalledWith({
        where: { competitorId },
        orderBy: { comments: "desc" },
        take: 3,
      });

      expect(result).toHaveLength(1);
    });

    it("should return top posts sorted by shares", async () => {
      const competitorId = "comp-1";

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue([]);

      const result = await getTopCompetitorPosts(competitorId, "shares", 10);

      expect(prisma.scoutCompetitorPost.findMany).toHaveBeenCalledWith({
        where: { competitorId },
        orderBy: { shares: "desc" },
        take: 10,
      });

      expect(result).toHaveLength(0);
    });

    it("should use default metric and limit when not provided", async () => {
      const competitorId = "comp-1";

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue([]);

      await getTopCompetitorPosts(competitorId);

      expect(prisma.scoutCompetitorPost.findMany).toHaveBeenCalledWith({
        where: { competitorId },
        orderBy: { likes: "desc" },
        take: 5,
      });
    });
  });

  describe("generateBenchmarkReport", () => {
    it("should generate benchmark report with competitor and own metrics", async () => {
      const workspaceId = "ws-1";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const mockCompetitors = [
        {
          id: "comp-1",
          workspaceId,
          platform: "TWITTER" as const,
          handle: "competitor1",
          name: "Competitor 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "comp-2",
          workspaceId,
          platform: "FACEBOOK" as const,
          handle: "competitor2",
          name: "Competitor 2",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPosts1 = [
        {
          id: "post-1",
          competitorId: "comp-1",
          platformPostId: "platform-1",
          content: "Post 1",
          postedAt: new Date("2024-01-15"),
          likes: 100,
          comments: 20,
          shares: 10,
        },
      ];

      const mockPosts2 = [
        {
          id: "post-2",
          competitorId: "comp-2",
          platformPostId: "platform-2",
          content: "Post 2",
          postedAt: new Date("2024-01-20"),
          likes: 200,
          comments: 40,
          shares: 20,
        },
      ];

      const mockWorkspaceMetrics = {
        averageLikes: 75,
        averageComments: 15,
        averageShares: 5,
        totalPosts: 25,
        engagementRate: 0.05,
      };

      const mockBenchmark = {
        id: "benchmark-1",
        workspaceId,
        period: "2024-01-01_2024-01-31",
        ownMetrics: {
          averageLikes: 75,
          averageComments: 15,
          averageShares: 5,
          totalPosts: 25,
        },
        competitorMetrics: {
          averageLikes: 150,
          averageComments: 30,
          averageShares: 15,
          totalPosts: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue(
        mockCompetitors as any,
      );

      vi.mocked(prisma.scoutCompetitorPost.findMany)
        .mockResolvedValueOnce(mockPosts1 as any)
        .mockResolvedValueOnce(mockPosts2 as any);

      vi.mocked(getWorkspaceMetrics).mockResolvedValue(mockWorkspaceMetrics);

      vi.mocked(prisma.scoutBenchmark.create).mockResolvedValue(
        mockBenchmark as any,
      );

      const result = await generateBenchmarkReport(
        workspaceId,
        startDate,
        endDate,
      );

      expect(prisma.scoutCompetitor.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId,
          isActive: true,
        },
      });

      expect(prisma.scoutCompetitorPost.findMany).toHaveBeenCalledTimes(2);

      expect(getWorkspaceMetrics).toHaveBeenCalledWith(
        workspaceId,
        startDate,
        endDate,
      );

      expect(prisma.scoutBenchmark.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          period: "2024-01-01_2024-01-31",
          ownMetrics: {
            averageLikes: 75,
            averageComments: 15,
            averageShares: 5,
            totalPosts: 25,
          },
          competitorMetrics: {
            averageLikes: 150,
            averageComments: 30,
            averageShares: 15,
            totalPosts: 2,
          },
        },
      });

      expect(result).toEqual(mockBenchmark);
    });

    it("should return null when no active competitors exist", async () => {
      const workspaceId = "ws-empty";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue([]);

      const result = await generateBenchmarkReport(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result).toBeNull();
      expect(prisma.scoutBenchmark.create).not.toHaveBeenCalled();
    });

    it("should handle competitors with no posts", async () => {
      const workspaceId = "ws-2";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const mockCompetitors = [
        {
          id: "comp-1",
          workspaceId,
          platform: "TWITTER" as const,
          handle: "competitor1",
          name: "Competitor 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockWorkspaceMetrics = {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        totalPosts: 0,
        engagementRate: 0,
      };

      const mockBenchmark = {
        id: "benchmark-2",
        workspaceId,
        period: "2024-01-01_2024-01-31",
        ownMetrics: {
          averageLikes: 0,
          averageComments: 0,
          averageShares: 0,
          totalPosts: 0,
        },
        competitorMetrics: {
          averageLikes: 0,
          averageComments: 0,
          averageShares: 0,
          totalPosts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue(
        mockCompetitors as any,
      );

      vi.mocked(prisma.scoutCompetitorPost.findMany).mockResolvedValue([]);

      vi.mocked(getWorkspaceMetrics).mockResolvedValue(mockWorkspaceMetrics);

      vi.mocked(prisma.scoutBenchmark.create).mockResolvedValue(
        mockBenchmark as any,
      );

      const result = await generateBenchmarkReport(
        workspaceId,
        startDate,
        endDate,
      );

      const metrics = result?.competitorMetrics as Record<string, unknown> | null;
      expect(metrics?.["totalPosts"]).toBe(0);
      expect(metrics?.["averageLikes"]).toBe(0);
    });
  });
});
