/**
 * GET /api/orbit/[workspaceSlug]/boost/compare
 * Compare boosted vs organic performance
 * Issue #565 - Content-to-Ads Loop
 */

import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
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
    const postId = searchParams.get("postId");
    const postType = searchParams.get("postType") as "SOCIAL_POST" | "SCHEDULED_POST";

    if (!postId || !postType) {
      return NextResponse.json(
        { error: "postId and postType are required" },
        { status: 400 },
      );
    }

    // Get organic performance
    const organicPerformance = await prisma.postPerformance.findFirst({
      where: {
        postId,
        postType,
        workspaceId: workspace.id,
      },
      orderBy: {
        checkedAt: "desc",
      },
    });

    if (!organicPerformance) {
      return NextResponse.json(
        { error: "No performance data found for this post" },
        { status: 404 },
      );
    }

    // Get boost performance
    const appliedBoost = await prisma.appliedBoost.findFirst({
      where: {
        postId,
        postType,
        workspaceId: workspace.id,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    // Calculate comparison metrics
    const comparison = {
      organic: {
        impressions: organicPerformance.impressions,
        engagements: organicPerformance.engagementCount,
        engagementRate: organicPerformance.engagementRate,
        clicks: organicPerformance.clicks,
        conversions: organicPerformance.conversions,
      },
      boosted: appliedBoost
        ? {
          impressions: appliedBoost.actualImpressions,
          clicks: appliedBoost.actualClicks,
          conversions: appliedBoost.actualConversions,
          spend: appliedBoost.actualSpend,
          roi: appliedBoost.actualROI,
          platform: appliedBoost.platform,
          status: appliedBoost.status,
        }
        : null,
      lift: appliedBoost
        ? {
          impressions: organicPerformance.impressions > 0
            ? (appliedBoost.actualImpressions - organicPerformance.impressions) /
              organicPerformance.impressions
            : 0,
          conversions: organicPerformance.conversions > 0
            ? (appliedBoost.actualConversions - organicPerformance.conversions) /
              organicPerformance.conversions
            : appliedBoost.actualConversions,
        }
        : null,
    };

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Error comparing performance:", error);
    return NextResponse.json(
      { error: "Failed to compare performance" },
      { status: 500 },
    );
  }
}
