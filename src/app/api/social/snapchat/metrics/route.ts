/**
 * Snapchat Metrics API Route
 *
 * GET /api/social/snapchat/metrics - Fetch account and story metrics
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { SnapchatClient, SnapchatHttpError } from "@/lib/social/clients/snapchat";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/snapchat/metrics
 *
 * Fetch Snapchat account and story metrics
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - includeStoryMetrics: Optional. Include detailed story metrics (default: false)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const includeStoryMetrics = searchParams.get("includeStoryMetrics") === "true";

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
        platform: "SNAPCHAT",
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
      { error: "Snapchat account not found" },
      { status: 404 },
    );
  }

  // Verify user has permission to view social analytics in this workspace
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, account.workspaceId, "social:view"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Snapchat account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Snapchat client
  const client = new SnapchatClient({
    accessToken,
    accountId: account.accountId,
  });

  // Fetch account-level metrics
  const { data: metrics, error: metricsError } = await tryCatch(
    client.getMetrics(),
  );

  if (metricsError) {
    console.error("Failed to fetch Snapchat metrics:", metricsError);

    // Check if it's a 401 Unauthorized error
    if (metricsError instanceof SnapchatHttpError && metricsError.status === 401) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Snapchat access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch Snapchat metrics" },
      { status: 500 },
    );
  }

  // If story metrics requested, fetch them
  const storyMetrics: Array<{
    storyId: string;
    views: number;
    screenshots: number;
    completionRate: number;
    replies: number;
  }> = [];

  if (includeStoryMetrics) {
    // Get recent stories
    const { data: stories } = await tryCatch(
      client.getStories(account.accountId),
    );

    if (stories && stories.length > 0) {
      // Fetch metrics for each story (limit to 10 most recent)
      const recentStories = stories.slice(0, 10);

      for (const story of recentStories) {
        const { data: storyMetric } = await tryCatch(
          client.getStoryMetrics(story.id),
        );

        if (storyMetric) {
          storyMetrics.push({
            storyId: story.id,
            views: storyMetric.views,
            screenshots: storyMetric.screenshots,
            completionRate: storyMetric.completionRate,
            replies: storyMetric.replies,
          });
        }
      }
    }
  }

  // Calculate aggregate story metrics
  const totalViews = storyMetrics.reduce((sum, s) => sum + s.views, 0);
  const totalScreenshots = storyMetrics.reduce((sum, s) => sum + s.screenshots, 0);
  const totalReplies = storyMetrics.reduce((sum, s) => sum + s.replies, 0);
  const avgCompletionRate = storyMetrics.length > 0
    ? storyMetrics.reduce((sum, s) => sum + s.completionRate, 0) / storyMetrics.length
    : 0;

  return NextResponse.json({
    ...metrics,
    stories: storyMetrics.length,
    views: totalViews,
    screenshots: totalScreenshots,
    replies: totalReplies,
    completionRate: avgCompletionRate,
    storyMetrics: includeStoryMetrics ? storyMetrics : undefined,
  });
}
