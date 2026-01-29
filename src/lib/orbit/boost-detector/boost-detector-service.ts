/**
 * Boost Detector Service
 *
 * Main orchestration service for detecting top-performing organic posts
 * and flagging them for potential boosting.
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";
import {
  calculatePerformanceScore,
  calculatePercentileRank,
  isTopPerformer,
  meetsMinimumThresholds,
} from "./ranking-algorithm";
import {
  calculateMetricRanges,
  collectWorkspacePostMetrics,
  storePerformanceMetrics,
} from "./metrics-collector";

/**
 * Get or create performance ranking config for workspace
 */
async function getOrCreateRankingConfig(workspaceId: string) {
  let config = await db.performanceRankingConfig.findUnique({
    where: { workspaceId },
  });

  if (!config) {
    // Create default config
    config = await db.performanceRankingConfig.create({
      data: {
        workspaceId,
        // Default weights
        engagementRateWeight: 0.3,
        impressionsWeight: 0.2,
        reachWeight: 0.15,
        sharesWeight: 0.2,
        clicksWeight: 0.15,
        // Default thresholds
        topPerformerPercentile: 0.9, // Top 10%
        minImpressions: 100,
        minEngagementRate: 0.01, // 1%
        evaluationPeriodDays: 7,
      },
    });
  }

  return config;
}

/**
 * Analyze workspace posts and identify top performers
 * @param workspaceId - Workspace ID
 * @returns Array of top performer post IDs
 */
export async function analyzeWorkspacePosts(
  workspaceId: string,
): Promise<string[]> {
  // Get or create config
  const config = await getOrCreateRankingConfig(workspaceId);

  // Collect metrics for all posts
  const postsWithMetrics = await collectWorkspacePostMetrics(
    workspaceId,
    config.evaluationPeriodDays,
  );

  // Filter posts that meet minimum thresholds
  const eligiblePosts = postsWithMetrics.filter((post) =>
    meetsMinimumThresholds(post.metrics, config)
  );

  if (eligiblePosts.length === 0) {
    console.log(`No eligible posts found for workspace ${workspaceId}`);
    return [];
  }

  // Calculate metric ranges for normalization
  const metricRanges = calculateMetricRanges(eligiblePosts);

  // Calculate performance scores for all eligible posts
  const postScores = eligiblePosts.map((post) => {
    const { score, engagementRate } = calculatePerformanceScore(
      post.metrics,
      config,
      metricRanges,
    );

    return {
      postId: post.postId,
      score,
      engagementRate,
      metrics: post.metrics,
    };
  });

  // Sort by score (ascending for percentile calculation)
  const sortedScores = [...postScores].sort((a, b) => a.score - b.score);
  const allScores = sortedScores.map((p) => p.score);

  // Calculate percentile ranks and identify top performers
  const topPerformerIds: string[] = [];

  for (const postScore of postScores) {
    const percentileRank = calculatePercentileRank(postScore.score, allScores);
    const isTop = isTopPerformer(percentileRank, config);

    // Store performance metrics
    await storePerformanceMetrics(
      postScore.postId,
      postScore.score,
      postScore.engagementRate,
      percentileRank,
      isTop,
      postScore.metrics,
    );

    if (isTop) {
      topPerformerIds.push(postScore.postId);
    }
  }

  console.log(
    `Found ${topPerformerIds.length} top performers out of ${eligiblePosts.length} eligible posts for workspace ${workspaceId}`,
  );

  return topPerformerIds;
}

/**
 * Batch process multiple workspaces
 * @param workspaceIds - Array of workspace IDs
 * @returns Map of workspace ID to top performer post IDs
 */
export async function batchAnalyzeWorkspaces(
  workspaceIds: string[],
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  for (const workspaceId of workspaceIds) {
    try {
      const topPerformers = await analyzeWorkspacePosts(workspaceId);
      results.set(workspaceId, topPerformers);
    } catch (error) {
      console.error(
        `Error analyzing workspace ${workspaceId}:`,
        error instanceof Error ? error.message : String(error),
      );
      results.set(workspaceId, []);
    }
  }

  return results;
}

/**
 * Get top performers for a workspace
 * @param workspaceId - Workspace ID
 * @param limit - Maximum number of results
 * @returns Array of posts with performance data
 */
export async function getTopPerformers(
  workspaceId: string,
  limit: number = 10,
) {
  // Get posts from workspace members
  const topPerformers = await db.organicPostPerformance.findMany({
    where: {
      isTopPerformer: true,
      boosted: false,
      socialPost: {
        createdBy: {
          workspaceMembers: {
            some: {
              workspaceId,
            },
          },
        },
      },
    },
    include: {
      socialPost: {
        include: {
          postAccounts: {
            include: {
              account: true,
            },
          },
        },
      },
    },
    orderBy: {
      performanceScore: "desc",
    },
    take: limit,
  });

  return topPerformers;
}
