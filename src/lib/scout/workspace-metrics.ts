/**
 * Workspace Metrics Aggregator
 *
 * This module provides functions to aggregate SocialMetrics data
 * for a workspace's connected social accounts, enabling comparison
 * with competitor benchmarks.
 */

import prisma from "@/lib/prisma";

export interface WorkspaceEngagementMetrics {
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  totalPosts: number;
  engagementRate: number;
}

/**
 * Aggregates SocialMetrics for all social accounts in a workspace
 * within a given date range.
 *
 * @param workspaceId - The ID of the workspace
 * @param startDate - The start of the analysis period
 * @param endDate - The end of the analysis period
 * @returns Aggregated engagement metrics for the workspace
 */
export async function getWorkspaceMetrics(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
): Promise<WorkspaceEngagementMetrics> {
  // Get all active social accounts for the workspace
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (accounts.length === 0) {
    return {
      averageLikes: 0,
      averageComments: 0,
      averageShares: 0,
      totalPosts: 0,
      engagementRate: 0,
    };
  }

  const accountIds = accounts.map((a) => a.id);

  // Aggregate metrics from all accounts within the date range
  const metrics = await prisma.socialMetrics.findMany({
    where: {
      accountId: {
        in: accountIds,
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

  if (metrics.length === 0) {
    return {
      averageLikes: 0,
      averageComments: 0,
      averageShares: 0,
      totalPosts: 0,
      engagementRate: 0,
    };
  }

  // Sum all metrics across all accounts and dates
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalPosts = 0;
  let totalEngagementRate = 0;
  let engagementRateCount = 0;

  for (const m of metrics) {
    totalLikes += m.likes;
    totalComments += m.comments;
    totalShares += m.shares;
    totalPosts += m.postsCount;
    if (m.engagementRate !== null) {
      totalEngagementRate += Number(m.engagementRate);
      engagementRateCount++;
    }
  }

  // Calculate averages per day (each metrics record represents a day)
  const numDays = metrics.length;
  const averageLikes = totalLikes / numDays;
  const averageComments = totalComments / numDays;
  const averageShares = totalShares / numDays;

  // Average engagement rate across all records that have it
  const engagementRate = engagementRateCount > 0
    ? totalEngagementRate / engagementRateCount
    : 0;

  return {
    averageLikes,
    averageComments,
    averageShares,
    totalPosts,
    engagementRate,
  };
}

/**
 * Gets detailed metrics breakdown by social account for a workspace.
 *
 * @param workspaceId - The ID of the workspace
 * @param startDate - The start of the analysis period
 * @param endDate - The end of the analysis period
 * @returns Array of metrics per account
 */
export async function getWorkspaceMetricsByAccount(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
): Promise<
  Array<{
    accountId: string;
    platform: string;
    accountName: string;
    metrics: WorkspaceEngagementMetrics;
  }>
> {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      platform: true,
      accountName: true,
    },
  });

  if (accounts.length === 0) {
    return [];
  }

  const results = await Promise.all(
    accounts.map(async (account) => {
      const metrics = await prisma.socialMetrics.findMany({
        where: {
          accountId: account.id,
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

      if (metrics.length === 0) {
        return {
          accountId: account.id,
          platform: account.platform,
          accountName: account.accountName,
          metrics: {
            averageLikes: 0,
            averageComments: 0,
            averageShares: 0,
            totalPosts: 0,
            engagementRate: 0,
          },
        };
      }

      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalPosts = 0;
      let totalEngagementRate = 0;
      let engagementRateCount = 0;

      for (const m of metrics) {
        totalLikes += m.likes;
        totalComments += m.comments;
        totalShares += m.shares;
        totalPosts += m.postsCount;
        if (m.engagementRate !== null) {
          totalEngagementRate += Number(m.engagementRate);
          engagementRateCount++;
        }
      }

      const numDays = metrics.length;

      return {
        accountId: account.id,
        platform: account.platform,
        accountName: account.accountName,
        metrics: {
          averageLikes: totalLikes / numDays,
          averageComments: totalComments / numDays,
          averageShares: totalShares / numDays,
          totalPosts,
          engagementRate: engagementRateCount > 0
            ? totalEngagementRate / engagementRateCount
            : 0,
        },
      };
    }),
  );

  return results;
}
