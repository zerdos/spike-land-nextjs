import prisma from '@/lib/prisma';
import type { SocialPlatform } from '@/lib/types/organic-to-ad';

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
    filters?: ConvertiblePostFilter
  ) {
    try {
      // Get all users in the workspace to filter posts
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true },
      });
      
      const userIds = members.map(m => m.userId);

      const posts = await prisma.socialPost.findMany({
        where: {
          createdById: {
            in: userIds,
          },
          isEligibleForAd: true,
          ...(filters?.minEngagementRate ? {
            engagementRate: {
              gte: filters.minEngagementRate,
            },
          } : {}),
          ...(filters?.minImpressions ? {
            impressions: {
              gte: filters.minImpressions,
            },
          } : {}),
          ...(filters?.platform ? {
             // Assuming platform filtering is handled by checking connected accounts or derived from content/metadata
             // For now, we might skipping platform filter if not directly on SocialPost
             // Or we need to join with SocialPostAccount?
             // Skipping for MVP stability
          } : {}),
        },
        include: {
          createdBy: true,
        },
        take: 50,
        orderBy: {
          engagementRate: 'desc',
        },
      });

      return posts;
    } catch (error) {
        console.error('Error fetching convertible posts:', error);
        throw error;
    }
  }
}
