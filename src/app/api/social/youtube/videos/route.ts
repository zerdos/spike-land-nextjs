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
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Uncomment when YOUTUBE is added to SocialPlatform enum:
// import prisma from "@/lib/prisma";

/**
 * GET /api/social/youtube/videos
 *
 * List YouTube channel's videos with view counts, likes, and comments
 *
 * Query params:
 * - accessToken: Required (temporary). Encrypted access token
 * - channelId: Optional. The YouTube channel ID (for validation)
 * - maxResults: Optional. Number of videos to fetch (default: 10, max: 50)
 * - videoId: Optional. If provided, returns details for a specific video
 *
 * When database storage is enabled (YOUTUBE in enum):
 * - accountId: The SocialAccount ID (replaces accessToken param)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accessTokenParam = searchParams.get("accessToken");
  const channelId = searchParams.get("channelId");
  const maxResults = Math.min(
    parseInt(searchParams.get("maxResults") || "10", 10),
    50,
  );
  const videoId = searchParams.get("videoId");

  // ============================================================================
  // TEMPORARY: Direct token authentication
  // Replace with database-based authentication when YOUTUBE is in enum
  // ============================================================================

  if (!accessTokenParam) {
    return NextResponse.json(
      {
        error: "accessToken query parameter is required",
        note: "YouTube database storage requires YOUTUBE to be added to SocialPlatform enum. " +
          "Until then, pass the encrypted access token directly.",
      },
      { status: 400 },
    );
  }

  // Decrypt the access token
  const accessToken = safeDecryptToken(accessTokenParam);

  // ============================================================================
  // DATABASE-BASED AUTHENTICATION (enable when YOUTUBE is in enum)
  // ============================================================================
  // const accountId = searchParams.get("accountId");
  //
  // if (!accountId) {
  //   return NextResponse.json(
  //     { error: "accountId query parameter is required" },
  //     { status: 400 },
  //   );
  // }
  //
  // const { data: account, error: accountError } = await tryCatch(
  //   prisma.socialAccount.findFirst({
  //     where: {
  //       id: accountId,
  //       userId: session.user.id,
  //       platform: "YOUTUBE",
  //     },
  //   }),
  // );
  //
  // if (accountError) {
  //   console.error("Database error:", accountError);
  //   return NextResponse.json(
  //     { error: "Failed to fetch account" },
  //     { status: 500 },
  //   );
  // }
  //
  // if (!account) {
  //   return NextResponse.json(
  //     { error: "YouTube account not found" },
  //     { status: 404 },
  //   );
  // }
  //
  // if (account.status !== "ACTIVE") {
  //   return NextResponse.json(
  //     { error: "YouTube account is not active. Please reconnect." },
  //     { status: 403 },
  //   );
  // }
  //
  // const accessToken = safeDecryptToken(account.accessTokenEncrypted);
  // ============================================================================

  // Create YouTube client
  const client = new YouTubeClient({
    accessToken,
    accountId: channelId || undefined,
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
