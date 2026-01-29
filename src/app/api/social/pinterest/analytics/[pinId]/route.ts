/**
 * Pinterest Pin Analytics API Route
 *
 * GET /api/social/pinterest/analytics/[pinId] - Get pin-specific analytics
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ pinId: string }>;
}

/**
 * GET - Get pin-specific analytics
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const pinId = params.pinId;
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get social account from database
  const { data: socialAccount, error: dbError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    }),
  );

  if (dbError || !socialAccount) {
    return NextResponse.json(
      { error: "Pinterest account not found" },
      { status: 404 },
    );
  }

  if (socialAccount.platform !== "PINTEREST") {
    return NextResponse.json(
      { error: "Account is not a Pinterest account" },
      { status: 400 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(socialAccount.accessTokenEncrypted);

  // Create Pinterest client
  const client = new PinterestClient({ accessToken });

  // Get pin analytics
  const { data: analytics, error: analyticsError } = await tryCatch(
    client.getPinAnalytics(pinId),
  );

  if (analyticsError) {
    console.error("Failed to get Pinterest pin analytics:", analyticsError);
    return NextResponse.json(
      { error: "Failed to retrieve analytics from Pinterest" },
      { status: 500 },
    );
  }

  // Calculate engagement rate
  const engagementRate =
    analytics.impression > 0
      ? ((analytics.save + analytics.pin_click) / analytics.impression) * 100
      : 0;

  return NextResponse.json({
    analytics: {
      ...analytics,
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
    },
  });
}
