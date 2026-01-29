/**
 * TikTok Metrics API Route
 *
 * GET /api/social/tiktok/metrics - Fetch account analytics
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { TikTokClient } from "@/lib/social/clients/tiktok";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/tiktok/metrics
 * Fetch TikTok account metrics and analytics
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

  // Fetch social account from database
  const { data: socialAccount, error: dbError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accessTokenEncrypted: true,
        status: true,
        workspace: {
          select: {
            id: true,
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    }),
  );

  if (dbError || !socialAccount) {
    return NextResponse.json(
      { error: "TikTok account not found" },
      { status: 404 },
    );
  }

  // Verify user has access to this workspace
  if (socialAccount.workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 },
    );
  }

  // Verify it's a TikTok account
  if (socialAccount.platform !== "TIKTOK") {
    return NextResponse.json(
      { error: "Not a TikTok account" },
      { status: 400 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(socialAccount.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 },
    );
  }

  // Fetch metrics using TikTok client
  const client = new TikTokClient({
    accessToken,
    accountId: socialAccount.accountId,
  });

  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch TikTok metrics:", metricsError);
    return NextResponse.json(
      { error: "Failed to fetch TikTok metrics" },
      { status: 500 },
    );
  }

  return NextResponse.json({ metrics });
}
