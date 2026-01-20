/**
 * Scout Competitor Analyzer
 *
 * This service is responsible for analyzing competitor data to generate engagement
 * metrics, identify top content, and create benchmarks.
 */

import prisma from "@/lib/prisma";

export interface EngagementMetrics {
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  totalPosts: number;
  engagementRate: number; // A simple engagement rate formula
}

/**
 * Calculates engagement metrics for a single competitor over a given period.
 * @param competitorId The ID of the ScoutCompetitor.
 * @param startDate The start date of the analysis period.
 * @param endDate The end date of the analysis period.
 * @returns EngagementMetrics for the competitor.
 */
export async function analyzeCompetitorEngagement(
  competitorId: string,
  startDate: Date,
  endDate: Date,
): Promise<EngagementMetrics> {
  const posts = await prisma.scoutCompetitorPost.findMany({
    where: {
      competitorId,
      postedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalPosts = posts.length;
  if (totalPosts === 0) {
    return {
      averageLikes: 0,
      averageComments: 0,
      averageShares: 0,
      totalPosts: 0,
      engagementRate: 0,
    };
  }

  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
  const totalShares = posts.reduce((sum, post) => sum + post.shares, 0);

  const averageLikes = totalLikes / totalPosts;
  const averageComments = totalComments / totalPosts;
  const averageShares = totalShares / totalPosts;

  // A simple engagement rate: (total interactions / total posts).
  // A more advanced formula would incorporate follower counts.
  const engagementRate = (totalLikes + totalComments + totalShares) /
    totalPosts;

  return {
    averageLikes,
    averageComments,
    averageShares,
    totalPosts,
    engagementRate,
  };
}

/**
 * Identifies the top-performing posts for a competitor based on a given metric.
 * @param competitorId The ID of the ScoutCompetitor.
 * @param metric The metric to sort by ('likes', 'comments', 'shares').
 * @param limit The number of top posts to return.
 * @returns An array of top-performing ScoutCompetitorPost objects.
 */
export async function getTopCompetitorPosts(
  competitorId: string,
  metric: "likes" | "comments" | "shares" = "likes",
  limit = 5,
) {
  const topPosts = await prisma.scoutCompetitorPost.findMany({
    where: { competitorId },
    orderBy: {
      [metric]: "desc",
    },
    take: limit,
  });

  return topPosts;
}

/**
 * Generates a benchmark report comparing the workspace's own performance
 * against the average of its competitors.
 * NOTE: This is a simplified benchmark. A real implementation would need to fetch
 * the workspace's own social media metrics to compare against.
 * For now, 'ownMetrics' will be mocked.
 *
 * @param workspaceId The ID of the workspace.
 * @param startDate The start date of the benchmark period.
 * @param endDate The end date of the benchmark period.
 * @returns A benchmark object with own and competitor metrics.
 */
export async function generateBenchmarkReport(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
) {
  const competitors = await prisma.scoutCompetitor.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  if (competitors.length === 0) {
    return null;
  }

  let totalCompetitorLikes = 0;
  let totalCompetitorComments = 0;
  let totalCompetitorShares = 0;
  let totalCompetitorPosts = 0;

  // Parallelize metric calculations for all competitors to avoid sequential queries
  const metricsPromises = competitors.map((competitor) =>
    analyzeCompetitorEngagement(competitor.id, startDate, endDate)
  );
  const metricsResults = await Promise.all(metricsPromises);

  for (const metrics of metricsResults) {
    totalCompetitorLikes += metrics.averageLikes * metrics.totalPosts;
    totalCompetitorComments += metrics.averageComments * metrics.totalPosts;
    totalCompetitorShares += metrics.averageShares * metrics.totalPosts;
    totalCompetitorPosts += metrics.totalPosts;
  }

  const competitorMetrics = {
    averageLikes: totalCompetitorPosts > 0
      ? totalCompetitorLikes / totalCompetitorPosts
      : 0,
    averageComments: totalCompetitorPosts > 0
      ? totalCompetitorComments / totalCompetitorPosts
      : 0,
    averageShares: totalCompetitorPosts > 0
      ? totalCompetitorShares / totalCompetitorPosts
      : 0,
    totalPosts: totalCompetitorPosts,
  };

  // TODO(#806): Replace mocked metrics with real SocialMetrics data from workspace
  const ownMetrics = {
    averageLikes: 0,
    averageComments: 0,
    averageShares: 0,
    totalPosts: 0,
  };

  const period = `${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}`;

  // Save the benchmark to the database.
  const benchmark = await prisma.scoutBenchmark.create({
    data: {
      workspaceId,
      period,
      ownMetrics,
      competitorMetrics,
    },
  });

  return benchmark;
}
