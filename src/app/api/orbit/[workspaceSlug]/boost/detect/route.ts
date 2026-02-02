/**
 * POST /api/orbit/[workspaceSlug]/boost/detect
 * Manually trigger boost detection for a workspace
 * Issue #565 - Content-to-Ads Loop
 */

import { detectBoostOpportunities } from "@/lib/boost-detector/detector";
import { syncPostPerformance } from "@/lib/boost-detector/metrics-tracker";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
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

    // 1. Sync recent post performance
    await syncPostPerformance(workspace.id);

    // 2. Run detection algorithm
    const config = {
      engagementThreshold: 0.05, // 5%
      velocityThreshold: 5, // 5 engagements per hour
      minImpressions: 500,
      lookbackPeriod: 30,
    };

    const recommendations = await detectBoostOpportunities(workspace.id, config);

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error detecting boost opportunities:", error);
    return NextResponse.json(
      { error: "Failed to run boost detection" },
      { status: 500 },
    );
  }
}
