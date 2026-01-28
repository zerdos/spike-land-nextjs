import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspaceMember: {
      findMany: vi.fn(),
    },
    socialAccount: {
      count: vi.fn(),
    },
    scheduledPost: {
      count: vi.fn(),
    },
    socialMetrics: {
      aggregate: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
    },
    workspaceFavorite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    workspaceRecentAccess: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import {
  getAggregateKPIs,
  getUserFavorites,
  getUserRecentWorkspaces,
  getUserWorkspaceIds,
  getWorkspaceSummaries,
  getWorkspacesWithMetadata,
  recordWorkspaceAccess,
  toggleWorkspaceFavorite,
} from "./aggregate-queries";

describe("getUserWorkspaceIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return workspace IDs for joined memberships", async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
      { workspaceId: "ws-1" },
      { workspaceId: "ws-2" },
    ] as never);

    const result = await getUserWorkspaceIds("user-1");

    expect(result).toEqual(["ws-1", "ws-2"]);
    expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        joinedAt: { not: null },
      },
      select: { workspaceId: true },
    });
  });

  it("should return empty array when no memberships", async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);

    const result = await getUserWorkspaceIds("user-1");

    expect(result).toEqual([]);
  });
});

describe("getAggregateKPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return zeros for empty workspace list", async () => {
    const result = await getAggregateKPIs([]);

    expect(result).toEqual({
      totalWorkspaces: 0,
      totalSocialAccounts: 0,
      totalScheduledPosts: 0,
      totalPublishedPosts: 0,
      totalEngagements: 0,
      totalFollowers: 0,
      totalImpressions: 0,
    });
  });

  it("should aggregate KPIs across workspaces", async () => {
    vi.mocked(prisma.socialAccount.count).mockResolvedValue(5);
    vi.mocked(prisma.scheduledPost.count)
      .mockResolvedValueOnce(10) // scheduled
      .mockResolvedValueOnce(20); // published
    vi.mocked(prisma.socialMetrics.aggregate).mockResolvedValue({
      _sum: {
        followers: 3000,
        impressions: 15000,
        likes: 200,
        comments: 50,
        shares: 50,
      },
      _count: 10,
      _avg: null,
      _min: null,
      _max: null,
    } as never);

    const result = await getAggregateKPIs(["ws-1", "ws-2"]);

    expect(result).toEqual({
      totalWorkspaces: 2,
      totalSocialAccounts: 5,
      totalScheduledPosts: 10,
      totalPublishedPosts: 20,
      totalEngagements: 300, // likes + comments + shares
      totalFollowers: 3000,
      totalImpressions: 15000,
    });
  });

  it("should handle null metrics gracefully", async () => {
    vi.mocked(prisma.socialAccount.count).mockResolvedValue(1);
    vi.mocked(prisma.scheduledPost.count).mockResolvedValue(0);
    vi.mocked(prisma.socialMetrics.aggregate).mockResolvedValue({
      _sum: {
        followers: null,
        impressions: null,
        likes: null,
        comments: null,
        shares: null,
      },
      _count: 0,
      _avg: null,
      _min: null,
      _max: null,
    } as never);

    const result = await getAggregateKPIs(["ws-1"]);

    expect(result.totalEngagements).toBe(0);
    expect(result.totalFollowers).toBe(0);
    expect(result.totalImpressions).toBe(0);
  });

  it("should apply date range filter", async () => {
    vi.mocked(prisma.socialAccount.count).mockResolvedValue(0);
    vi.mocked(prisma.scheduledPost.count).mockResolvedValue(0);
    vi.mocked(prisma.socialMetrics.aggregate).mockResolvedValue({
      _sum: {
        followers: null,
        impressions: null,
        likes: null,
        comments: null,
        shares: null,
      },
      _count: 0,
      _avg: null,
      _min: null,
      _max: null,
    } as never);

    const dateRange = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };

    await getAggregateKPIs(["ws-1"], dateRange);

    expect(prisma.scheduledPost.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        }),
      }),
    );

    expect(prisma.socialMetrics.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        }),
      }),
    );
  });
});

describe("getWorkspaceSummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for no workspaces", async () => {
    const result = await getWorkspaceSummaries([]);
    expect(result).toEqual([]);
  });

  it("should return summaries for each workspace", async () => {
    vi.mocked(prisma.workspace.findMany).mockResolvedValue([
      {
        id: "ws-1",
        name: "Workspace 1",
        slug: "workspace-1",
        _count: { socialAccounts: 2 },
        socialAccounts: [{ id: "acc-1" }],
        scheduledPosts: [
          { status: "PUBLISHED", createdAt: new Date("2024-01-15") },
          { status: "SCHEDULED", createdAt: new Date("2024-01-10") },
        ],
      },
    ] as never);

    vi.mocked(prisma.socialMetrics.aggregate).mockResolvedValue({
      _sum: {
        followers: 1000,
        impressions: 5000,
        likes: 80,
        comments: 15,
        shares: 5,
      },
      _count: 5,
      _avg: null,
      _min: null,
      _max: null,
    } as never);

    const result = await getWorkspaceSummaries(["ws-1"]);

    expect(result).toHaveLength(1);
    expect(result[0]!.workspaceId).toBe("ws-1");
    expect(result[0]!.workspaceName).toBe("Workspace 1");
    expect(result[0]!.socialAccountCount).toBe(2);
    expect(result[0]!.publishedPostCount).toBe(1);
    expect(result[0]!.scheduledPostCount).toBe(1);
    expect(result[0]!.totalFollowers).toBe(1000);
    expect(result[0]!.totalEngagements).toBe(100); // 80 + 15 + 5
    expect(result[0]!.totalImpressions).toBe(5000);
  });

  it("should handle workspace with no social accounts", async () => {
    vi.mocked(prisma.workspace.findMany).mockResolvedValue([
      {
        id: "ws-1",
        name: "Workspace 1",
        slug: "workspace-1",
        _count: { socialAccounts: 0 },
        socialAccounts: [],
        scheduledPosts: [],
      },
    ] as never);

    const result = await getWorkspaceSummaries(["ws-1"]);

    expect(result).toHaveLength(1);
    expect(result[0]!.totalFollowers).toBe(0);
    expect(result[0]!.totalEngagements).toBe(0);
    expect(result[0]!.totalImpressions).toBe(0);
  });
});

describe("getUserFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return favorite workspace IDs", async () => {
    vi.mocked(prisma.workspaceFavorite.findMany).mockResolvedValue([
      { workspaceId: "ws-1" },
      { workspaceId: "ws-2" },
    ] as never);

    const result = await getUserFavorites("user-1");

    expect(result).toEqual(["ws-1", "ws-2"]);
  });
});

describe("getUserRecentWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return recent workspace IDs", async () => {
    vi.mocked(prisma.workspaceRecentAccess.findMany).mockResolvedValue([
      { workspaceId: "ws-2" },
      { workspaceId: "ws-1" },
    ] as never);

    const result = await getUserRecentWorkspaces("user-1");

    expect(result).toEqual(["ws-2", "ws-1"]);
  });

  it("should respect limit parameter", async () => {
    vi.mocked(prisma.workspaceRecentAccess.findMany).mockResolvedValue([
      { workspaceId: "ws-1" },
    ] as never);

    await getUserRecentWorkspaces("user-1", 5);

    expect(prisma.workspaceRecentAccess.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});

describe("toggleWorkspaceFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add favorite when not exists", async () => {
    vi.mocked(prisma.workspaceFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.workspaceFavorite.create).mockResolvedValue({
      id: "fav-1",
      userId: "user-1",
      workspaceId: "ws-1",
      createdAt: new Date(),
    });

    const result = await toggleWorkspaceFavorite("user-1", "ws-1");

    expect(result).toBe(true);
    expect(prisma.workspaceFavorite.create).toHaveBeenCalled();
  });

  it("should remove favorite when exists", async () => {
    vi.mocked(prisma.workspaceFavorite.findUnique).mockResolvedValue({
      id: "fav-1",
      userId: "user-1",
      workspaceId: "ws-1",
      createdAt: new Date(),
    });

    const result = await toggleWorkspaceFavorite("user-1", "ws-1");

    expect(result).toBe(false);
    expect(prisma.workspaceFavorite.delete).toHaveBeenCalledWith({
      where: { id: "fav-1" },
    });
  });
});

describe("recordWorkspaceAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upsert recent access record", async () => {
    await recordWorkspaceAccess("user-1", "ws-1");

    expect(prisma.workspaceRecentAccess.upsert).toHaveBeenCalledWith({
      where: {
        userId_workspaceId: {
          userId: "user-1",
          workspaceId: "ws-1",
        },
      },
      update: {
        accessedAt: expect.any(Date),
      },
      create: {
        userId: "user-1",
        workspaceId: "ws-1",
      },
    });
  });
});

describe("getWorkspacesWithMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all metadata in parallel", async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
      { workspaceId: "ws-1" },
      { workspaceId: "ws-2" },
    ] as never);
    vi.mocked(prisma.workspaceFavorite.findMany).mockResolvedValue([
      { workspaceId: "ws-1" },
    ] as never);
    vi.mocked(prisma.workspaceRecentAccess.findMany).mockResolvedValue([
      { workspaceId: "ws-2" },
      { workspaceId: "ws-1" },
    ] as never);

    const result = await getWorkspacesWithMetadata("user-1");

    expect(result).toEqual({
      workspaceIds: ["ws-1", "ws-2"],
      favoriteIds: ["ws-1"],
      recentIds: ["ws-2", "ws-1"],
    });
  });
});
