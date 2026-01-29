/**
 * YouTube Metrics API Route
 *
 * GET /api/social/youtube/metrics - Get channel statistics
 *
 * Returns subscriber count, total views, video count, and
 * recent video performance.
 *
 * NOTE: Since YouTube is not in the SocialPlatform enum, this route
 * requires the access token to be passed directly.
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/youtube/metrics
 *
 * Get YouTube channel statistics including subscriber count, total views,
 * video count, and recent video performance.
 *
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - channelId: Optional. The YouTube channel ID (for validation)
 * - includeRecentVideos: Optional. Include stats for recent videos (default: true)
 * - recentVideoCount: Optional. Number of recent videos to include (default: 5)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const channelId = searchParams.get("channelId");
  const includeRecentVideos = searchParams.get("includeRecentVideos") !== "false";
  const recentVideoCount = Math.min(
    parseInt(searchParams.get("recentVideoCount") || "5", 10),
    25,
  );

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get the social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        platform: "YOUTUBE",
      },
    }),
  );

  if (accountError || !account) {
    return NextResponse.json(
      { error: accountError ? "Failed to fetch account" : "YouTube account not found" },
      { status: accountError ? 500 : 404 },
    );
  }

  // Verify user has permission to view social analytics in this workspace
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, (account as any).workspaceId, "social:view"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  if ((account as any).status !== "ACTIVE") {
    return NextResponse.json(
      { error: "YouTube account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  const accessToken = safeDecryptToken((account as any).accessTokenEncrypted);

  // Create YouTube client
  const client = new YouTubeClient({
    accessToken,
    accountId: channelId || (account as any).accountId || undefined,
  });

  // Get channel metrics
  const { data: channelMetrics, error: metricsError } = await tryCatch(
    client.getChannelMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch YouTube channel metrics:", metricsError);

    if (
      metricsError instanceof Error &&
      (metricsError.message.includes("401") ||
        metricsError.message.includes("Unauthorized"))
    ) {
      return NextResponse.json(
        { error: "YouTube access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch YouTube metrics" },
      { status: 500 },
    );
  }

  // Get channel info for additional context
  const { data: channelInfo } = await tryCatch(client.getAccountInfo());

  // Optionally get recent video performance
  let recentVideos: Array<{
    id: string;
    title: string;
    url: string;
    publishedAt: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
  }> = [];

  if (includeRecentVideos) {
    const { data: videos } = await tryCatch(client.getPosts(recentVideoCount));

    if (videos && videos.length > 0) {
      recentVideos = videos.map((video) => ({
        id: video.platformPostId,
        title: video.content,
        url: video.url,
        publishedAt: video.publishedAt.toISOString(),
        viewCount: video.metrics?.impressions || 0,
        likeCount: video.metrics?.likes || 0,
        commentCount: video.metrics?.comments || 0,
      }));
    }
  }

  // Calculate aggregate metrics for recent videos
  const recentVideoStats = recentVideos.reduce(
    (acc, video) => ({
      totalViews: acc.totalViews + video.viewCount,
      totalLikes: acc.totalLikes + video.likeCount,
      totalComments: acc.totalComments + video.commentCount,
    }),
    { totalViews: 0, totalLikes: 0, totalComments: 0 },
  );

  // Calculate average engagement rate for recent videos
  const averageEngagementRate = recentVideoStats.totalViews > 0
    ? ((recentVideoStats.totalLikes + recentVideoStats.totalComments) /
      recentVideoStats.totalViews) *
      100
    : 0;

  // ============================================================================
  // DATABASE METRICS STORAGE (enable when YOUTUBE is in enum)
  // ============================================================================
  // const today = new Date();
  // today.setHours(0, 0, 0, 0);
  //
  // await tryCatch(
  //   prisma.socialMetrics.upsert({
  //     where: {
  //       accountId_date: {
  //         accountId: account.id,
  //         date: today,
  //       },
  //     },
  //     update: {
  //       followers: channelMetrics.subscriberCount,
  //       postsCount: channelMetrics.videoCount,
  //       impressions: channelMetrics.viewCount,
  //       rawData: {
  //         subscriberCount: channelMetrics.subscriberCount,
  //         viewCount: channelMetrics.viewCount,
  //         videoCount: channelMetrics.videoCount,
  //         hiddenSubscriberCount: channelMetrics.hiddenSubscriberCount,
  //         recentVideoStats,
  //       },
  //       updatedAt: new Date(),
  //     },
  //     create: {
  //       accountId: account.id,
  //       date: today,
  //       followers: channelMetrics.subscriberCount,
  //       postsCount: channelMetrics.videoCount,
  //       impressions: channelMetrics.viewCount,
  //       rawData: {
  //         subscriberCount: channelMetrics.subscriberCount,
  //         viewCount: channelMetrics.viewCount,
  //         videoCount: channelMetrics.videoCount,
  //         hiddenSubscriberCount: channelMetrics.hiddenSubscriberCount,
  //         recentVideoStats,
  //       },
  //     },
  //   }),
  // );
  // ============================================================================

  return NextResponse.json({
    metrics: {
      subscriberCount: channelMetrics?.subscriberCount || 0,
      totalViewCount: channelMetrics?.viewCount || 0,
      videoCount: channelMetrics?.videoCount || 0,
      hiddenSubscriberCount: channelMetrics?.hiddenSubscriberCount || false,
    },
    channel: channelInfo
      ? {
        id: channelInfo.platformId,
        name: channelInfo.displayName,
        username: channelInfo.username,
        avatarUrl: channelInfo.avatarUrl,
        profileUrl: channelInfo.profileUrl,
      }
      : undefined,
    recentVideoPerformance: includeRecentVideos
      ? {
        videos: recentVideos,
        aggregate: {
          totalViews: recentVideoStats.totalViews,
          totalLikes: recentVideoStats.totalLikes,
          totalComments: recentVideoStats.totalComments,
          averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
        },
      }
      : undefined,
    fetchedAt: new Date().toISOString(),
    _note:
      "Database storage for YouTube metrics requires YOUTUBE to be added to SocialPlatform enum",
  });
}
