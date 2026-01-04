/**
 * Facebook Social API - Metrics Route
 *
 * GET: Retrieve page insights and metrics
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { tryCatch } from "@/lib/try-catch";

/**
 * GET /api/social/facebook/metrics
 * Get page insights and metrics
 *
 * Query params:
 * - accountId: Required. The SocialAccount ID
 *
 * Returns metrics including:
 * - page_impressions: Total impressions for the page
 * - page_reach: Unique users who saw page content
 * - page_engaged_users: Users who engaged with the page
 * - page_fans: Total page followers/likes
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
  const { data: account, error: dbError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "FACEBOOK",
        status: "ACTIVE",
      },
    }),
  );

  if (dbError) {
    console.error("Database error:", dbError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Facebook account not found or not accessible" },
      { status: 404 },
    );
  }

  // Decrypt the token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create client and fetch metrics
  const client = new FacebookClient({
    accessToken,
    pageId: account.accountId,
  });

  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch metrics:", metricsError);
    return NextResponse.json(
      {
        error: "Failed to fetch metrics from Facebook",
        details: metricsError instanceof Error
          ? metricsError.message
          : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    metrics,
    account: {
      id: account.id,
      accountId: account.accountId,
      accountName: account.accountName,
    },
  });
}
