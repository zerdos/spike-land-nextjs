/**
 * Metrics Collector
 *
 * Fetches and aggregates social media metrics for organic posts
 * from the SocialMetrics table.
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";
import type { PostMetrics } from "./ranking-algorithm";

/**
 * Post with metrics
 */
export interface PostWithMetrics {
  postId: string;
  metrics: PostMetrics;
  publishedAt: Date | null;
}

/**
 * Collect metrics for organic posts from a workspace
 * @param workspaceId - Workspace ID
 * @param evaluationPeriodDays - Number of days to look back
 * @returns Array of posts with their metrics
 */
export async function collectWorkspacePostMetrics(
  workspaceId: string,
  evaluationPeriodDays: number = 7,
): Promise<PostWithMetrics[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - evaluationPeriodDays);

  // Fetch all published posts from workspace in the evaluation period
  const posts = await db.socialPost.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: {
        gte: cutoffDate,
      },
      createdBy: {
        workspaceMembers: {
          some: {
            workspaceId,
          },
        },
      },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            include: {
              metrics: {
                where: {
                  date: {
                    gte: cutoffDate,
                  },
                },
                orderBy: {
                  date: "desc",
                },
              },
            },
          },
        },
      },
    },
  });

  const postsWithMetrics: PostWithMetrics[] = [];

  for (const post of posts) {
    // Aggregate metrics across all accounts and time periods
    let totalImpressions = 0;
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalClicks = 0;

    for (const postAccount of post.postAccounts) {
      const account = postAccount.account;

      // Sum metrics from all days in the period
      for (const metric of account.metrics) {
        totalImpressions += metric.impressions;
        totalReach += metric.reach;
        totalLikes += metric.likes;
        totalComments += metric.comments;
        totalShares += metric.shares;
      }

      // Note: SocialMetrics doesn't have clicks field
      // You may need to fetch this from platform-specific data
      // For now, we'll use shares as a proxy for clicks
      totalClicks = totalShares;
    }

    postsWithMetrics.push({
      postId: post.id,
      metrics: {
        impressions: totalImpressions,
        reach: totalReach,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        clicks: totalClicks,
      },
      publishedAt: post.publishedAt,
    });
  }

  return postsWithMetrics;
}

/**
 * Calculate metric ranges for normalization
 * @param postsWithMetrics - Array of posts with metrics
 * @returns Min and max values for each metric
 */
export function calculateMetricRanges(postsWithMetrics: PostWithMetrics[]) {
  if (postsWithMetrics.length === 0) {
    return {
      impressions: { min: 0, max: 0 },
      reach: { min: 0, max: 0 },
      shares: { min: 0, max: 0 },
      clicks: { min: 0, max: 0 },
      engagementRate: { min: 0, max: 0 },
    };
  }

  const allMetrics = postsWithMetrics.map((p) => p.metrics);

  // Calculate engagement rates
  const engagementRates = allMetrics.map((m) => {
    if (m.impressions === 0) return 0;
    return (m.likes + m.comments + m.shares) / m.impressions;
  });

  return {
    impressions: {
      min: Math.min(...allMetrics.map((m) => m.impressions)),
      max: Math.max(...allMetrics.map((m) => m.impressions)),
    },
    reach: {
      min: Math.min(...allMetrics.map((m) => m.reach)),
      max: Math.max(...allMetrics.map((m) => m.reach)),
    },
    shares: {
      min: Math.min(...allMetrics.map((m) => m.shares)),
      max: Math.max(...allMetrics.map((m) => m.shares)),
    },
    clicks: {
      min: Math.min(...allMetrics.map((m) => m.clicks)),
      max: Math.max(...allMetrics.map((m) => m.clicks)),
    },
    engagementRate: {
      min: Math.min(...engagementRates),
      max: Math.max(...engagementRates),
    },
  };
}

/**
 * Store performance metrics in OrganicPostPerformance table
 * @param postId - Post ID
 * @param performanceScore - Performance score
 * @param engagementRate - Engagement rate
 * @param percentileRank - Percentile rank
 * @param isTopPerformer - Whether this is a top performer
 * @param metrics - Raw metrics
 */
export async function storePerformanceMetrics(
  postId: string,
  performanceScore: number,
  engagementRate: number,
  percentileRank: number | null,
  isTopPerformer: boolean,
  metrics: PostMetrics,
): Promise<void> {
  await db.organicPostPerformance.upsert({
    where: {
      socialPostId: postId,
    },
    create: {
      socialPostId: postId,
      performanceScore,
      engagementRate,
      percentileRank,
      isTopPerformer,
      impressions: metrics.impressions,
      reach: metrics.reach,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      clicks: metrics.clicks,
      metricsUpdatedAt: new Date(),
    },
    update: {
      performanceScore,
      engagementRate,
      percentileRank,
      isTopPerformer,
      impressions: metrics.impressions,
      reach: metrics.reach,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      clicks: metrics.clicks,
      metricsUpdatedAt: new Date(),
    },
  });
}
