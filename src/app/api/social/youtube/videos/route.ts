/**
 * YouTube Videos API Route
 *
 * GET /api/social/youtube/videos - List channel's videos with statistics
 *
 * NOTE: Since YouTube is not in the SocialPlatform enum, this route
 * requires the access token to be passed directly (either via query param
 * for testing or via a temporary storage mechanism).
 *
 * For production use, add YOUTUBE to the SocialPlatform enum and use
 * the standard SocialAccount-based token retrieval.
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
 * GET /api/social/youtube/videos
 *
 * List YouTube channel's videos with view counts, likes, and comments
 *
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - channelId: Optional. The YouTube channel ID (for validation)
 * - maxResults: Optional. Number of videos to fetch (default: 10, max: 50)
 * - videoId: Optional. If provided, returns details for a specific video
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const channelId = searchParams.get("channelId");
  const maxResults = Math.min(
    parseInt(searchParams.get("maxResults") || "10", 10),
    50,
  );
  const videoId = searchParams.get("videoId");

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

  // If videoId is provided, return details for that specific video
  if (videoId) {
    const { data: videoDetails, error: videoError } = await tryCatch(
      client.getVideoDetails(videoId),
    );

    if (videoError) {
      console.error("Failed to fetch video details:", videoError);

      if (
        videoError instanceof Error &&
        (videoError.message.includes("401") ||
          videoError.message.includes("Unauthorized"))
      ) {
        return NextResponse.json(
          { error: "YouTube access token expired. Please reconnect." },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch video details" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      video: videoDetails,
      fetchedAt: new Date().toISOString(),
    });
  }

  // Fetch list of videos
  const { data: videos, error: videosError } = await tryCatch(
    client.getPosts(maxResults),
  );

  if (videosError) {
    console.error("Failed to fetch YouTube videos:", videosError);

    if (
      videosError instanceof Error &&
      (videosError.message.includes("401") ||
        videosError.message.includes("Unauthorized"))
    ) {
      return NextResponse.json(
        { error: "YouTube access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch YouTube videos" },
      { status: 500 },
    );
  }

  // Also get channel info for context
  const { data: channelInfo } = await tryCatch(client.getAccountInfo());

  return NextResponse.json({
    videos: videos?.map((video) => ({
      id: video.platformPostId,
      title: video.content,
      url: video.url,
      publishedAt: video.publishedAt.toISOString(),
      thumbnailUrl: video.mediaUrls?.[0],
      metrics: video.metrics
        ? {
          viewCount: video.metrics.impressions || 0,
          likeCount: video.metrics.likes || 0,
          commentCount: video.metrics.comments || 0,
        }
        : undefined,
    })),
    channel: channelInfo
      ? {
        id: channelInfo.platformId,
        name: channelInfo.displayName,
        username: channelInfo.username,
        avatarUrl: channelInfo.avatarUrl,
        profileUrl: channelInfo.profileUrl,
        subscriberCount: channelInfo.followersCount,
      }
      : undefined,
    totalResults: videos?.length || 0,
    fetchedAt: new Date().toISOString(),
  });
}
