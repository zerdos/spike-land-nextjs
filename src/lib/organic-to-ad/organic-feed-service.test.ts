import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganicFeedService } from "./organic-feed-service";

// Mock Prisma
const mockFindManyMembers = vi.fn();
const mockFindManyPosts = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    workspaceMember: {
      findMany: (...args: any[]) => mockFindManyMembers(...args),
    },
    socialPost: {
      findMany: (...args: any[]) => mockFindManyPosts(...args),
    },
  },
}));

describe("OrganicFeedService", () => {
  let service: OrganicFeedService;

  beforeEach(() => {
    service = new OrganicFeedService();
    vi.clearAllMocks();
  });

  it("should fetch posts for workspace members", async () => {
    // Mock members
    mockFindManyMembers.mockResolvedValue([
      { userId: "user1" },
      { userId: "user2" },
    ]);

    // Mock posts
    const mockPosts = [
      { id: "post1", engagementRate: 5, createdBy: { id: "user1" } },
      { id: "post2", engagementRate: 3, createdBy: { id: "user2" } },
    ];
    mockFindManyPosts.mockResolvedValue(mockPosts);

    const result = await service.getConvertiblePosts("workspace1");

    expect(mockFindManyMembers).toHaveBeenCalledWith({
      where: { workspaceId: "workspace1" },
      select: { userId: true },
    });

    expect(mockFindManyPosts).toHaveBeenCalledWith({
      where: {
        createdById: { in: ["user1", "user2"] },
      },
      include: { createdBy: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    expect(result).toEqual(mockPosts);
  });
});
