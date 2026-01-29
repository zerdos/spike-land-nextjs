/**
 * POST /api/orbit/[workspaceSlug]/boost/apply
 * Apply boost to a post (create ad campaign)
 * Issue #565 - Content-to-Ads Loop
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAdCampaign } from "@/lib/boost-detector/platform-integration";
import type { MarketingPlatform } from "@/generated/prisma";
import type { TargetAudience } from "@/lib/boost-detector/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  try {
    const { workspaceSlug } = await params;
    const body = await request.json();
    const { recommendationId, platform, budget, targetAudience } = body;

    if (!recommendationId) {
      return NextResponse.json(
        { error: "recommendationId is required" },
        { status: 400 },
      );
    }

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

    // Fetch recommendation
    const recommendation = await prisma.postBoostRecommendation.findFirst({
      where: {
        id: recommendationId,
        workspaceId: workspace.id,
      },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 },
      );
    }

    // Check if already applied
    if (recommendation.status === "APPLIED") {
      return NextResponse.json(
        { error: "Recommendation already applied" },
        { status: 400 },
      );
    }

    // Use provided values or defaults from recommendation
    const finalPlatform: MarketingPlatform =
      platform || (recommendation.recommendedPlatforms[0] as MarketingPlatform) || "FACEBOOK";
    const finalBudget = budget || recommendation.suggestedBudget;
    const finalTargeting: TargetAudience =
      targetAudience || (recommendation.targetAudience as TargetAudience) || {};

    // Create ad campaign
    const externalCampaignId = await createAdCampaign(
      finalPlatform,
      recommendation.postId,
      finalBudget,
      finalTargeting,
    );

    // Create AppliedBoost record
    const appliedBoost = await prisma.appliedBoost.create({
      data: {
        recommendationId: recommendation.id,
        postId: recommendation.postId,
        postType: recommendation.postType,
        workspaceId: workspace.id,
        platform: finalPlatform,
        externalCampaignId,
        budget: finalBudget,
        status: "ACTIVE",
      },
    });

    // Update recommendation status
    await prisma.postBoostRecommendation.update({
      where: { id: recommendation.id },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      appliedBoost,
      externalCampaignId,
    });
  } catch (error) {
    console.error("Error applying boost:", error);
    return NextResponse.json(
      { error: "Failed to apply boost" },
      { status: 500 },
    );
  }
}
