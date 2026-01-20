/**
 * Scout Competitor Tracker Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    scoutCompetitor: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    scoutCompetitorPost: {
      createMany: vi.fn(),
    },
  },
}));

// Create shared mock functions
const mockGetAccountInfo = vi.fn();
const mockGetPosts = vi.fn();

// Mock public API clients
vi.mock("./public-api-clients/twitter", () => ({
  PublicTwitterClient: class {
    getAccountInfo = mockGetAccountInfo;
    getPosts = mockGetPosts;
  },
}));

vi.mock("./public-api-clients/facebook", () => ({
  PublicFacebookClient: class {
    getAccountInfo = mockGetAccountInfo;
    getPosts = mockGetPosts;
  },
}));

vi.mock("./public-api-clients/instagram", () => ({
  PublicInstagramClient: class {
    getAccountInfo = mockGetAccountInfo;
    getPosts = mockGetPosts;
  },
}));

// Import after mocks
import prisma from "@/lib/prisma";

import {
  addCompetitor,
  syncAllCompetitorsForWorkspace,
  syncCompetitorPosts,
} from "./competitor-tracker";

describe("Competitor Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccountInfo.mockReset();
    mockGetPosts.mockReset();
  });

  describe("addCompetitor", () => {
    it("should add a Twitter competitor successfully", async () => {
      const workspaceId = "ws-1";
      const platform = "TWITTER" as const;
      const handle = "competitor1";

      const mockAccountInfo = {
        handle: "competitor1",
        name: "Competitor One",
        profileUrl: "https://twitter.com/competitor1",
        avatarUrl: "https://example.com/avatar.jpg",
      };

      const mockCompetitor = {
        id: "comp-1",
        workspaceId,
        platform,
        handle: mockAccountInfo.handle,
        name: mockAccountInfo.name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);

      vi.mocked(prisma.scoutCompetitor.create).mockResolvedValue(
        mockCompetitor as any,
      );

      const result = await addCompetitor(workspaceId, platform, handle);

      expect(mockGetAccountInfo).toHaveBeenCalledWith(handle);
      expect(prisma.scoutCompetitor.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          platform,
          handle: mockAccountInfo.handle,
          name: mockAccountInfo.name,
          isActive: true,
        },
      });
      expect(result).toEqual(mockCompetitor);
    });

    it("should add a Facebook competitor successfully", async () => {
      const workspaceId = "ws-1";
      const platform = "FACEBOOK" as const;
      const handle = "competitor2";

      const mockAccountInfo = {
        handle: "competitor2",
        name: "Competitor Two",
        profileUrl: "https://facebook.com/competitor2",
        avatarUrl: "https://example.com/avatar2.jpg",
      };

      const mockCompetitor = {
        id: "comp-2",
        workspaceId,
        platform,
        handle: mockAccountInfo.handle,
        name: mockAccountInfo.name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);

      vi.mocked(prisma.scoutCompetitor.create).mockResolvedValue(
        mockCompetitor as any,
      );

      const result = await addCompetitor(workspaceId, platform, handle);

      expect(mockGetAccountInfo).toHaveBeenCalledWith(handle);
      expect(result).toEqual(mockCompetitor);
    });

    it("should add an Instagram competitor successfully", async () => {
      const workspaceId = "ws-1";
      const platform = "INSTAGRAM" as const;
      const handle = "competitor3";

      const mockAccountInfo = {
        handle: "competitor3",
        name: "Competitor Three",
        profileUrl: "https://instagram.com/competitor3",
        avatarUrl: "https://example.com/avatar3.jpg",
      };

      const mockCompetitor = {
        id: "comp-3",
        workspaceId,
        platform,
        handle: mockAccountInfo.handle,
        name: mockAccountInfo.name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);

      vi.mocked(prisma.scoutCompetitor.create).mockResolvedValue(
        mockCompetitor as any,
      );

      const result = await addCompetitor(workspaceId, platform, handle);

      expect(mockGetAccountInfo).toHaveBeenCalledWith(handle);
      expect(result).toEqual(mockCompetitor);
    });

    it("should return null when account validation fails", async () => {
      const workspaceId = "ws-1";
      const platform = "TWITTER" as const;
      const handle = "nonexistent";

      mockGetAccountInfo.mockResolvedValue(null);

      const result = await addCompetitor(workspaceId, platform, handle);

      expect(result).toBeNull();
      expect(prisma.scoutCompetitor.create).not.toHaveBeenCalled();
    });

    it("should return null for empty handle", async () => {
      const workspaceId = "ws-1";
      const platform = "TWITTER" as const;

      const result1 = await addCompetitor(workspaceId, platform, "");
      const result2 = await addCompetitor(workspaceId, platform, "   ");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(prisma.scoutCompetitor.create).not.toHaveBeenCalled();
    });

    it("should trim whitespace from handle", async () => {
      const workspaceId = "ws-1";
      const platform = "TWITTER" as const;
      const handle = "  competitor1  ";

      const mockAccountInfo = {
        handle: "competitor1",
        name: "Competitor One",
        profileUrl: "https://twitter.com/competitor1",
        avatarUrl: "https://example.com/avatar.jpg",
      };

      mockGetAccountInfo.mockResolvedValue(mockAccountInfo);

      vi.mocked(prisma.scoutCompetitor.create).mockResolvedValue({} as any);

      await addCompetitor(workspaceId, platform, handle);

      expect(mockGetAccountInfo).toHaveBeenCalledWith("competitor1");
    });

    it("should throw error for unsupported platform", async () => {
      const workspaceId = "ws-1";
      const platform = "LINKEDIN" as any;
      const handle = "competitor1";

      await expect(addCompetitor(workspaceId, platform, handle)).rejects.toThrow(
        /No public API client available for platform/,
      );
    });
  });

  describe("syncCompetitorPosts", () => {
    it("should sync posts for an active competitor", async () => {
      const competitorId = "comp-1";

      const mockCompetitor = {
        id: competitorId,
        workspaceId: "ws-1",
        platform: "TWITTER" as const,
        handle: "competitor1",
        name: "Competitor One",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPosts = [
        {
          id: "post-1",
          content: "Tweet 1",
          authorHandle: "competitor1",
          url: "https://twitter.com/competitor1/status/123",
          publishedAt: new Date("2024-01-15"),
          likes: 100,
          comments: 20,
          shares: 10,
        },
        {
          id: "post-2",
          content: "Tweet 2",
          authorHandle: "competitor1",
          url: "https://twitter.com/competitor1/status/124",
          publishedAt: new Date("2024-01-16"),
          likes: 200,
          comments: 40,
          shares: 20,
        },
      ];

      vi.mocked(prisma.scoutCompetitor.findUnique).mockResolvedValue(
        mockCompetitor as any,
      );

      mockGetPosts.mockResolvedValue(mockPosts);

      vi.mocked(prisma.scoutCompetitorPost.createMany).mockResolvedValue({
        count: 2,
      });

      await syncCompetitorPosts(competitorId);

      expect(prisma.scoutCompetitor.findUnique).toHaveBeenCalledWith({
        where: { id: competitorId },
      });

      expect(mockGetPosts).toHaveBeenCalledWith("competitor1");

      expect(prisma.scoutCompetitorPost.createMany).toHaveBeenCalledWith({
        data: [
          {
            competitorId,
            platformPostId: "post-1",
            content: "Tweet 1",
            postedAt: mockPosts[0]?.publishedAt,
            likes: 100,
            comments: 20,
            shares: 10,
          },
          {
            competitorId,
            platformPostId: "post-2",
            content: "Tweet 2",
            postedAt: mockPosts[1]?.publishedAt,
            likes: 200,
            comments: 40,
            shares: 20,
          },
        ],
        skipDuplicates: true,
      });
    });

    it("should not sync for inactive competitor", async () => {
      const competitorId = "comp-2";

      const mockCompetitor = {
        id: competitorId,
        workspaceId: "ws-1",
        platform: "TWITTER" as const,
        handle: "competitor2",
        name: "Competitor Two",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutCompetitor.findUnique).mockResolvedValue(
        mockCompetitor as any,
      );

      await syncCompetitorPosts(competitorId);

      expect(prisma.scoutCompetitorPost.createMany).not.toHaveBeenCalled();
    });

    it("should not sync when competitor not found", async () => {
      const competitorId = "comp-nonexistent";

      vi.mocked(prisma.scoutCompetitor.findUnique).mockResolvedValue(null);

      await syncCompetitorPosts(competitorId);

      expect(prisma.scoutCompetitorPost.createMany).not.toHaveBeenCalled();
    });

    it("should handle empty posts list", async () => {
      const competitorId = "comp-3";

      const mockCompetitor = {
        id: competitorId,
        workspaceId: "ws-1",
        platform: "TWITTER" as const,
        handle: "competitor3",
        name: "Competitor Three",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutCompetitor.findUnique).mockResolvedValue(
        mockCompetitor as any,
      );

      mockGetPosts.mockResolvedValue([]);

      await syncCompetitorPosts(competitorId);

      expect(prisma.scoutCompetitorPost.createMany).not.toHaveBeenCalled();
    });

    it("should handle Instagram posts without shares", async () => {
      const competitorId = "comp-4";

      const mockCompetitor = {
        id: competitorId,
        workspaceId: "ws-1",
        platform: "INSTAGRAM" as const,
        handle: "competitor4",
        name: "Competitor Four",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPosts = [
        {
          id: "ig-post-1",
          content: "Instagram post",
          authorHandle: "competitor4",
          url: "https://instagram.com/p/123",
          publishedAt: new Date("2024-01-15"),
          likes: 500,
          comments: 50,
        },
      ];

      vi.mocked(prisma.scoutCompetitor.findUnique).mockResolvedValue(
        mockCompetitor as any,
      );

      mockGetPosts.mockResolvedValue(mockPosts);

      vi.mocked(prisma.scoutCompetitorPost.createMany).mockResolvedValue({
        count: 1,
      });

      await syncCompetitorPosts(competitorId);

      expect(prisma.scoutCompetitorPost.createMany).toHaveBeenCalledWith({
        data: [
          {
            competitorId,
            platformPostId: "ig-post-1",
            content: "Instagram post",
            postedAt: mockPosts[0]?.publishedAt,
            likes: 500,
            comments: 50,
            shares: 0,
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe("syncAllCompetitorsForWorkspace", () => {
    it("should sync all active competitors in workspace", async () => {
      const workspaceId = "ws-1";

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

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue(
        mockCompetitors as any,
      );

      vi.mocked(prisma.scoutCompetitor.findUnique)
        .mockResolvedValueOnce(mockCompetitors[0] as any)
        .mockResolvedValueOnce(mockCompetitors[1] as any);

      mockGetPosts.mockResolvedValue([
        {
          id: "post-1",
          content: "Post content",
          authorHandle: "competitor",
          url: "https://example.com/post/123",
          publishedAt: new Date(),
          likes: 100,
          comments: 20,
          shares: 10,
        },
      ]);

      vi.mocked(prisma.scoutCompetitorPost.createMany).mockResolvedValue({
        count: 1,
      });

      const results = await syncAllCompetitorsForWorkspace(workspaceId);

      expect(prisma.scoutCompetitor.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId,
          isActive: true,
        },
      });

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
    });

    it("should handle sync errors and continue with other competitors", async () => {
      const workspaceId = "ws-2";

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
          platform: "TWITTER" as const,
          handle: "competitor2",
          name: "Competitor 2",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue(
        mockCompetitors as any,
      );

      vi.mocked(prisma.scoutCompetitor.findUnique)
        .mockResolvedValueOnce(mockCompetitors[0] as any)
        .mockResolvedValueOnce(mockCompetitors[1] as any);

      mockGetPosts
        .mockRejectedValueOnce(new Error("API error"))
        .mockResolvedValueOnce([
          {
            id: "post-2",
            content: "Tweet 2",
            authorHandle: "competitor2",
            url: "https://twitter.com/competitor2/status/124",
            publishedAt: new Date(),
            likes: 150,
            comments: 30,
            shares: 15,
          },
        ]);

      vi.mocked(prisma.scoutCompetitorPost.createMany).mockResolvedValue({
        count: 1,
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const results = await syncAllCompetitorsForWorkspace(workspaceId);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.error).toBe("API error");
      expect(results[1]?.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should process competitors in batches with concurrency control", async () => {
      const workspaceId = "ws-3";

      const mockCompetitors = Array.from({ length: 10 }, (_, i) => ({
        id: `comp-${i + 1}`,
        workspaceId,
        platform: "TWITTER" as const,
        handle: `competitor${i + 1}`,
        name: `Competitor ${i + 1}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue(
        mockCompetitors as any,
      );

      vi.mocked(prisma.scoutCompetitor.findUnique).mockImplementation(
        ((args: { where: { id: string; }; }) => {
          const id = args?.where?.id;
          return Promise.resolve(mockCompetitors.find((c) => c.id === id) ?? null);
        }) as unknown as typeof prisma.scoutCompetitor.findUnique,
      );

      mockGetPosts.mockResolvedValue([]);

      const results = await syncAllCompetitorsForWorkspace(workspaceId, 3, 10);

      expect(results).toHaveLength(10);
      // Check that all results have a success property
      results.forEach((r) => {
        expect(r).toHaveProperty("success");
        expect(r).toHaveProperty("id");
        expect(r).toHaveProperty("handle");
      });
    });

    it("should return empty array when no active competitors", async () => {
      const workspaceId = "ws-empty";

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue([]);

      const results = await syncAllCompetitorsForWorkspace(workspaceId);

      expect(results).toEqual([]);
    });

    it("should use default concurrency and delay parameters", async () => {
      const workspaceId = "ws-4";

      vi.mocked(prisma.scoutCompetitor.findMany).mockResolvedValue([]);

      await syncAllCompetitorsForWorkspace(workspaceId);

      expect(prisma.scoutCompetitor.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId,
          isActive: true,
        },
      });
    });
  });
});
