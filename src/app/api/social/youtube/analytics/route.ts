
import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { YouTubeAnalyticsClient } from "@/lib/social/youtube/analytics-client";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const videoId = searchParams.get("videoId");

  if (!accountId || !type || !startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "Missing required params: accountId, type, startDate, endDate" },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Get social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    })
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Verify permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, account.workspaceId, "analytics:view")
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account is not active" },
      { status: 403 }
    );
  }

  const accessToken = safeDecryptToken(account.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 }
    );
  }

  const client = new YouTubeAnalyticsClient(accessToken);
  const channelId = account.accountId; // This is the YouTube channel ID

  try {
    let result;

    switch (type) {
      case "watch-time":
        result = await client.getWatchTime(channelId, startDate, endDate);
        break;
      case "retention":
        if (!videoId) {
          return NextResponse.json({ error: "videoId required for retention" }, { status: 400 });
        }
        result = await client.getRetentionData(videoId);
        break;
      case "traffic-sources":
        result = await client.getTrafficSources(channelId, startDate, endDate);
        break;
      case "demographics":
        result = await client.getDemographics(channelId, startDate, endDate);
        break;
      case "geography":
        result = await client.getGeography(channelId, startDate, endDate);
        break;
      case "engagement":
        result = await client.getEngagementMetrics(channelId, startDate, endDate);
        break;
      default:
        return NextResponse.json({ error: "Invalid analytics type" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube analytics fetch failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
