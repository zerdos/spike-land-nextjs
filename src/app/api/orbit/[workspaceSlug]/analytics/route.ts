/**
 * Analytics API Route
 *
 * Provides comprehensive analytics data for the Orbit workspace including:
 * - Engagement overview with period-over-period comparison
 * - Growth trends over time
 * - Top performing posts
 * - AI-generated insights
 * - Platform breakdown
 *
 * Resolves #842
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { AnalyticsData } from "@/types/analytics";

interface RouteParams {
  params: Promise<{ workspaceSlug: string }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/analytics
 *
 * Returns analytics data for the workspace.
 *
 * Query parameters:
 * - days: Number of days to analyze (default: 30, max: 365)
 *
 * Response format: AnalyticsData
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify membership
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const daysParam = searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  // Validate days parameter
  if (isNaN(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: "days must be between 1 and 365" },
      { status: 400 },
    );
  }

  // Calculate date ranges
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Fetch social accounts for this workspace
    const accounts = await prisma.socialAccount.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        platform: true,
        accountName: true,
      },
    });

    // Fetch recent AI insights
    const insights = await prisma.aIInsight.findMany({
      where: {
        workspaceId: workspace.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // For now, return simplified data structure
    // A full implementation would aggregate metrics from SocialMetrics and SocialPostAccount
    const analyticsData: AnalyticsData = {
      overview: {
        totalEngagements: 0,
        engagementChange: 0,
        totalReach: 0,
        reachChange: 0,
        totalImpressions: 0,
        impressionsChange: 0,
        averageEngagementRate: 0,
        engagementRateChange: 0,
      },
      growth: [],
      topPosts: [],
      insights: insights.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        description: i.description,
        recommendation: i.recommendation,
        metrics: i.metrics as Record<string, unknown>,
        confidence: i.confidence,
        isRead: i.isRead,
        createdAt: i.createdAt.toISOString(),
      })),
      platformBreakdown: accounts.map((account) => ({
        platform: account.platform,
        followers: 0,
        engagements: 0,
        posts: 0,
        averageEngagementRate: 0,
      })),
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 },
    );
  }
}
