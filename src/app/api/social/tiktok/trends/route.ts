/**
 * TikTok Trends Route
 *
 * Fetch trending hashtags and sounds
 * GET /api/social/tiktok/trends?type=hashtags&limit=20
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
  const type = searchParams.get("type") || "hashtags";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  if (type !== "hashtags" && type !== "sounds") {
    return NextResponse.json(
      { error: "type must be 'hashtags' or 'sounds'" },
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

  // Fetch trends based on type
  if (type === "hashtags") {
    const { data: trends, error: trendsError } = await tryCatch(
      client.getTrendingHashtags(limit),
    );

    if (trendsError) {
      return NextResponse.json(
        { error: "Failed to fetch trending hashtags" },
        { status: 500 },
      );
    }

    return NextResponse.json({ trending: trends });
  } else {
    const { data: trends, error: trendsError } = await tryCatch(
      client.getTrendingSounds(limit),
    );

    if (trendsError) {
      return NextResponse.json(
        { error: "Failed to fetch trending sounds" },
        { status: 500 },
      );
    }

    return NextResponse.json({ trending: trends });
  }
}
