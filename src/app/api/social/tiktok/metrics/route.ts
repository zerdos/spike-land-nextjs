/**
 * TikTok Metrics Route
 *
 * Fetch TikTok analytics for account and videos
 * GET /api/social/tiktok/metrics?accountId=xxx
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { TikTokClient } from "@/lib/social/clients/tiktok";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const videoId = searchParams.get("videoId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get the TikTok account from database
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        platform: "TIKTOK",
        status: "ACTIVE",
      },
    }),
  );

  if (accountError || !account) {
    return NextResponse.json(
      { error: "TikTok account not found or inactive" },
      { status: 404 },
    );
  }

  // Verify user has access to this account
  if (account.userId !== session.user.id) {
    return NextResponse.json(
      { error: "You don't have permission to access this account" },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 },
    );
  }

  // Create TikTok client
  const client = new TikTokClient({ accessToken, accountId: account.accountId });

  // If videoId is provided, get video-specific analytics
  if (videoId) {
    const { data: videoAnalytics, error: videoError } = await tryCatch(
      client.getVideoAnalytics(videoId),
    );

    if (videoError) {
      return NextResponse.json(
        { error: "Failed to fetch video analytics" },
        { status: 500 },
      );
    }

    return NextResponse.json({ video: videoAnalytics });
  }

  // Otherwise, get account-level metrics
  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    return NextResponse.json(
      { error: "Failed to fetch account metrics" },
      { status: 500 },
    );
  }

  return NextResponse.json({ metrics });
}
