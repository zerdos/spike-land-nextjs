/**
 * POST /api/orbit/[workspaceSlug]/boost/detect
 * Manually trigger boost detection for specific posts
 * Issue #565 - Content-to-Ads Loop
 */

import { detectBoostOpportunities } from "@/lib/boost-detector/detector";
import type { BoostDetectorConfig } from "@/lib/boost-detector/types";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
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
    const _postIds = searchParams.get("postIds")?.split(",") || [];
    const _force = searchParams.get("force") === "true";

    // Default configuration
    const config: BoostDetectorConfig = {
      engagementThreshold: 0.05, // 5% engagement rate
      velocityThreshold: 10, // 10 engagements per hour
      minImpressions: 100,
      lookbackPeriod: 7, // 7 days
    };

    // Detect opportunities
    const recommendations = await detectBoostOpportunities(
      workspace.id,
      config,
    );

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations: recommendations.map((r) => ({
        id: r.id,
        postId: r.postId,
        postType: r.postType,
        status: r.status,
        suggestedBudget: r.suggestedBudget,
        estimatedROI: r.confidenceScore,
        reasoning: r.reasoning,
      })),
    });
  } catch (error) {
    console.error("Error detecting boost opportunities:", error);
    return NextResponse.json(
      { error: "Failed to detect boost opportunities" },
      { status: 500 },
    );
  }
}
