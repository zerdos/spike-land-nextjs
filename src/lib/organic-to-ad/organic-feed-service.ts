import prisma from "@/lib/prisma";
import type { SocialPlatform } from "@/lib/types/organic-to-ad";

export interface ConvertiblePostFilter {
  platform?: SocialPlatform;
  minEngagementRate?: number;
  minImpressions?: number;
}

export class OrganicFeedService {
  /**
   * Fetch posts eligible for conversion to ads
   * Optimized to avoid N+1 queries by fetching necessary relations upfront.
   */
  async getConvertiblePosts(
    workspaceId: string,
    _filters?: ConvertiblePostFilter,
  ) {
    try {
      // Get all users in the workspace to filter posts
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true },
      });

      const userIds = members.map(m => m.userId);

      // Note: Filtering by engagementRate and isEligibleForAd requires
      // these fields to be added to the SocialPost model in the Prisma schema.
      // For now, we fetch all posts and can filter in memory if needed.
      const posts = await prisma.socialPost.findMany({
        where: {
          createdById: {
            in: userIds,
          },
        },
        include: {
          createdBy: true,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      });

      return posts;
    } catch (error) {
      console.error("Error fetching convertible posts:", error);
      throw error;
    }
  }
}
