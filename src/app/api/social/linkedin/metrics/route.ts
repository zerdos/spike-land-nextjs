/**
 * LinkedIn Metrics API Route
 *
 * GET /api/social/linkedin/metrics - Get organization's metrics
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/linkedin/metrics
 *
 * Get LinkedIn organization metrics (followers, share statistics, engagement)
 * Query params:
 * - accountId: Required. The SocialAccount ID
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

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
        userId: session.user.id,
        platform: "LINKEDIN",
      },
    }),
  );

  if (accountError) {
    console.error("Database error:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "LinkedIn account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "LinkedIn account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Get organization URN from metadata
  const metadata = account.metadata as { organizationUrn?: string; } | null;
  const organizationUrn = metadata?.organizationUrn;

  if (!organizationUrn) {
    return NextResponse.json(
      { error: "Organization URN not found in account metadata" },
      { status: 500 },
    );
  }

  // Create LinkedIn client and fetch metrics
  const client = new LinkedInClient({
    accessToken,
    accountId: account.accountId,
    organizationUrn,
  });

  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch LinkedIn metrics:", metricsError);

    // Check if it's an auth error and update account status
    if (
      metricsError instanceof Error &&
      (metricsError.message.includes("401") ||
        metricsError.message.includes("Unauthorized") ||
        metricsError.message.includes("expired"))
    ) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "LinkedIn access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch LinkedIn metrics" },
      { status: 500 },
    );
  }

  // Optionally store metrics in database for historical tracking
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Convert engagementRate to Decimal-compatible value (max 5,4 precision)
  const engagementRateDecimal = metrics.engagementRate !== undefined
    ? Math.min(Math.max(metrics.engagementRate, 0), 9.9999)
    : null;

  const { error: storeError } = await tryCatch(
    prisma.socialMetrics.upsert({
      where: {
        accountId_date: {
          accountId: account.id,
          date: today,
        },
      },
      update: {
        followers: metrics.followers,
        following: metrics.following,
        postsCount: metrics.postsCount,
        impressions: metrics.impressions,
        engagementRate: engagementRateDecimal,
        updatedAt: new Date(),
      },
      create: {
        accountId: account.id,
        date: today,
        followers: metrics.followers,
        following: metrics.following,
        postsCount: metrics.postsCount,
        impressions: metrics.impressions,
        engagementRate: engagementRateDecimal,
      },
    }),
  );

  if (storeError) {
    // Log but don't fail the request
    console.error("Failed to store metrics:", storeError);
  }

  return NextResponse.json({
    metrics,
    account: {
      id: account.id,
      accountId: account.accountId,
      accountName: account.accountName,
    },
    fetchedAt: new Date().toISOString(),
  });
}
