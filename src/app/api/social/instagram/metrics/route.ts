/**
 * Instagram Metrics API Route
 *
 * GET: Return Instagram insights for an account
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { InstagramClient } from "@/lib/social/clients/instagram";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface InstagramMetadata {
  igUserId?: string;
  facebookPageId?: string;
}

/**
 * GET /api/social/instagram/metrics
 *
 * Get Instagram account insights and metrics
 * Query params:
 * - accountId (required): SocialAccount ID
 *
 * Returns:
 * - Account info (followers, following)
 * - Insights (impressions, reach) if available
 *
 * Note: Some metrics require Instagram Business or Creator accounts
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "Missing required parameter: accountId" },
      { status: 400 },
    );
  }

  // Fetch the social account and verify ownership
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "INSTAGRAM",
      },
    }),
  );

  if (accountError) {
    console.error("Failed to fetch Instagram account:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Instagram account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      {
        error: `Instagram account is ${account.status.toLowerCase()}. Please reconnect.`,
        status: account.status,
      },
      { status: 400 },
    );
  }

  // Check token expiration
  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    // Update account status
    await tryCatch(
      prisma.socialAccount.update({
        where: { id: account.id },
        data: { status: "EXPIRED" },
      }),
    );

    return NextResponse.json(
      { error: "Access token has expired. Please reconnect your Instagram account." },
      { status: 401 },
    );
  }

  // Extract igUserId from metadata
  const metadata = account.metadata as InstagramMetadata | null;
  const igUserId = metadata?.igUserId;

  if (!igUserId) {
    return NextResponse.json(
      { error: "Instagram User ID not found in account metadata" },
      { status: 400 },
    );
  }

  // Decrypt the access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Instagram client
  const client = new InstagramClient({
    accessToken,
    igUserId,
  });

  // Fetch metrics
  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch Instagram metrics:", metricsError);

    // Check for token expiration
    const errorMessage = metricsError instanceof Error ? metricsError.message : "";

    if (
      errorMessage.includes("expired") ||
      errorMessage.includes("190") // Facebook OAuth error code for expired token
    ) {
      await tryCatch(
        prisma.socialAccount.update({
          where: { id: account.id },
          data: { status: "EXPIRED" },
        }),
      );

      return NextResponse.json(
        { error: "Access token has expired. Please reconnect your Instagram account." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch metrics from Instagram" },
      { status: 500 },
    );
  }

  // Also fetch account info for additional details
  const { data: accountInfo, error: accountInfoError } = await tryCatch(
    client.getAccountInfo(),
  );

  if (accountInfoError) {
    console.error("Failed to fetch Instagram account info:", accountInfoError);
    // Continue with just metrics, account info is supplementary
  }

  return NextResponse.json({
    metrics: {
      followers: metrics.followers,
      following: metrics.following,
      postsCount: metrics.postsCount,
      impressions: metrics.impressions,
      reach: metrics.reach,
      engagementRate: metrics.engagementRate,
      period: metrics.period
        ? {
          start: metrics.period.start.toISOString(),
          end: metrics.period.end.toISOString(),
        }
        : null,
    },
    account: {
      id: account.id,
      accountName: account.accountName,
      platform: account.platform,
      status: account.status,
      connectedAt: account.connectedAt.toISOString(),
      ...(accountInfo && {
        username: accountInfo.username,
        displayName: accountInfo.displayName,
        profileUrl: accountInfo.profileUrl,
        avatarUrl: accountInfo.avatarUrl,
      }),
    },
  });
}
