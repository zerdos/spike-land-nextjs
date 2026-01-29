/**
 * GET /api/orbit/[workspaceSlug]/boost/performance
 * Performance dashboard data
 * Issue #565 - Content-to-Ads Loop
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  try {
    const { workspaceSlug } = await params;

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    // Get all applied boosts in date range
    const appliedBoosts = await prisma.appliedBoost.findMany({
      where: {
        workspaceId: workspace.id,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        recommendation: {
          include: {
            postPerformance: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    // Calculate aggregate metrics
    const totalSpend = appliedBoosts.reduce(
      (sum, boost) => sum + boost.actualSpend,
      0,
    );
    const totalImpressions = appliedBoosts.reduce(
      (sum, boost) => sum + boost.actualImpressions,
      0,
    );
    const totalClicks = appliedBoosts.reduce(
      (sum, boost) => sum + boost.actualClicks,
      0,
    );
    const totalConversions = appliedBoosts.reduce(
      (sum, boost) => sum + boost.actualConversions,
      0,
    );

    // Calculate average ROI
    const boostsWithROI = appliedBoosts.filter((b) => b.actualROI !== null);
    const avgROI =
      boostsWithROI.length > 0
        ? boostsWithROI.reduce((sum, b) => sum + (b.actualROI || 0), 0) /
          boostsWithROI.length
        : 0;

    // Get performance by platform
    const performanceByPlatform = appliedBoosts.reduce(
      (acc, boost) => {
        const platform = boost.platform;
        if (!acc[platform]) {
          acc[platform] = {
            spend: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            count: 0,
          };
        }
        acc[platform].spend += boost.actualSpend;
        acc[platform].impressions += boost.actualImpressions;
        acc[platform].clicks += boost.actualClicks;
        acc[platform].conversions += boost.actualConversions;
        acc[platform].count += 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    return NextResponse.json({
      summary: {
        totalBoosts: appliedBoosts.length,
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        averageROI: avgROI,
        averageCTR: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        averageCPA:
          totalConversions > 0 ? totalSpend / totalConversions : 0,
      },
      performanceByPlatform,
      recentBoosts: appliedBoosts.slice(0, 10).map((boost) => ({
        id: boost.id,
        postId: boost.postId,
        platform: boost.platform,
        budget: boost.budget,
        actualSpend: boost.actualSpend,
        actualImpressions: boost.actualImpressions,
        actualClicks: boost.actualClicks,
        actualConversions: boost.actualConversions,
        actualROI: boost.actualROI,
        status: boost.status,
        startedAt: boost.startedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 },
    );
  }
}
