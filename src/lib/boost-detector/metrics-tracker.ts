/**
 * Metrics Tracker
 * Syncs social post metrics to PostPerformance records for boost detection
 * Issue #565 - Content-to-Ads Loop
 */

import { PostType } from "@/generated/prisma";
import prisma from "@/lib/prisma";

/**
 * Sync performance metrics for recent posts in a workspace
 * Calculates engagement rates and velocity, and updates PostPerformance records
 */
export async function syncPostPerformance(
  workspaceId: string,
  lookbackDays: number = 30,
): Promise<void> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Fetch recent social posts linked to the workspace
  const posts = await prisma.socialPost.findMany({
    where: {
      postAccounts: {
        some: {
          account: {
            workspaceId,
          },
        },
      },
      createdAt: {
        gte: lookbackDate,
      },
      status: "PUBLISHED",
    },
    // We don't strictly need to include postAccounts unless we want to double check workspaceId per post,
    // but the where clause handles it.
  });

  for (const post of posts) {
    await updatePostPerformance(post, workspaceId);
  }
}

/**
 * Update performance record for a single post
 */
export async function updatePostPerformance(
  post: {
    id: string;
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    impressions?: number | null;
    publishedAt?: Date | null;
    createdAt: Date;
  },
  workspaceId: string,
): Promise<void> {
  // Calculate metrics
  const likes = post.likes ?? 0;
  const comments = post.comments ?? 0;
  const shares = post.shares ?? 0;
  const impressions = post.impressions ?? 0;
  const clicks = 0; // Not currently tracked on SocialPost

  const engagementCount = likes + comments + shares + clicks;

  // Engagement rate
  const engagementRate = impressions > 0
    ? engagementCount / impressions
    : 0;

  // Engagement velocity (engagements per hour)
  const now = new Date();
  const publishedAt = post.publishedAt ?? post.createdAt;
  const hoursSincePublished = Math.max(
    1,
    (now.getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60),
  );

  const engagementVelocity = engagementCount / hoursSincePublished;

  // Find existing performance record to update or create new one
  const existingPerformance = await prisma.postPerformance.findFirst({
    where: {
      postId: post.id,
      postType: PostType.SOCIAL_POST,
      workspaceId,
    },
  });

  if (existingPerformance) {
    // Update existing record
    await prisma.postPerformance.update({
      where: { id: existingPerformance.id },
      data: {
        impressions,
        engagementCount,
        engagementRate,
        clicks,
        engagementVelocity,
        metricPeriod: now, // Update timestamp
        checkedAt: now,
      },
    });
  } else {
    // Create new record
    await prisma.postPerformance.create({
      data: {
        postId: post.id,
        postType: PostType.SOCIAL_POST,
        workspaceId,
        impressions,
        engagementCount,
        engagementRate,
        clicks,
        engagementVelocity,
        metricPeriod: now,
        checkedAt: now,
      },
    });
  }
}
