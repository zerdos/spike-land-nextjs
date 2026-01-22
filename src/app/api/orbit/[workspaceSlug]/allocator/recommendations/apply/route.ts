/**
 * Apply Recommendation API
 *
 * POST /api/orbit/[workspaceSlug]/allocator/recommendations/apply
 *
 * Applies a budget recommendation by executing it through the AutopilotService.
 *
 * Resolves #807: Implement allocator recommendation application API
 */

import { auth } from "@/auth";
import { AutopilotService } from "@/lib/allocator/autopilot-service";
import type { AutopilotRecommendation } from "@/lib/allocator/autopilot-types";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

interface ApplyRecommendationRequest {
  recommendationId: string;
  campaignId: string;
  currentBudget: number;
  suggestedNewBudget: number;
  type: string;
  reason: string;
  confidence: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceSlug } = await params;

  // Find workspace and verify admin access
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Access denied: Admin privileges required" },
      { status: 403 },
    );
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(
    request.json() as Promise<ApplyRecommendationRequest>,
  );

  if (parseError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    recommendationId,
    campaignId,
    currentBudget,
    suggestedNewBudget,
    type,
    reason,
    confidence,
  } = body;

  // Validate required fields
  if (!recommendationId || !campaignId) {
    return NextResponse.json(
      { error: "Missing required fields: recommendationId and campaignId" },
      { status: 400 },
    );
  }

  if (typeof currentBudget !== "number" || typeof suggestedNewBudget !== "number") {
    return NextResponse.json(
      { error: "currentBudget and suggestedNewBudget must be numbers" },
      { status: 400 },
    );
  }

  // Verify campaign belongs to this workspace
  const campaign = await prisma.allocatorCampaign.findFirst({
    where: {
      id: campaignId,
      workspaceId: workspace.id,
    },
  });

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found in this workspace" },
      { status: 404 },
    );
  }

  // Map recommendation type to autopilot type
  const autopilotType = mapRecommendationType(type);

  // Build the AutopilotRecommendation object
  const autopilotRecommendation: AutopilotRecommendation = {
    id: recommendationId,
    type: autopilotType,
    workspaceId: workspace.id,
    campaignId,
    currentBudget,
    suggestedBudget: suggestedNewBudget,
    reason: reason || "Manual application of budget recommendation",
    confidence: mapConfidenceToNumber(confidence),
    correlationId: `manual-apply-${recommendationId}-${Date.now()}`,
    metadata: {
      userId: session.user.id,
      appliedAt: new Date().toISOString(),
      source: "MANUAL",
    },
  };

  // Execute the recommendation
  const { data: result, error: executionError } = await tryCatch(
    AutopilotService.executeRecommendation(autopilotRecommendation, "MANUAL"),
  );

  if (executionError) {
    console.error("Error executing recommendation:", executionError);
    return NextResponse.json(
      { error: executionError.message || "Failed to apply recommendation" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    result,
    message: result?.status === "COMPLETED"
      ? "Recommendation applied successfully"
      : result?.status === "SKIPPED"
      ? `Recommendation skipped: ${result.message}`
      : "Recommendation execution completed",
  });
}

/**
 * Maps UI recommendation types to AutopilotRecommendation types
 */
function mapRecommendationType(
  type: string,
): AutopilotRecommendation["type"] {
  const typeMap: Record<string, AutopilotRecommendation["type"]> = {
    INCREASE_BUDGET: "BUDGET_INCREASE",
    DECREASE_BUDGET: "BUDGET_DECREASE",
    REALLOCATE: "REALLOCATE",
    PAUSE_CAMPAIGN: "BUDGET_DECREASE",
    RESUME_CAMPAIGN: "BUDGET_INCREASE",
    SCALE_WINNER: "BUDGET_INCREASE",
  };

  return typeMap[type] || "BUDGET_INCREASE";
}

/**
 * Maps confidence level strings to numbers
 */
function mapConfidenceToNumber(confidence: string): number {
  const confidenceMap: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };

  return confidenceMap[confidence] || 0.7;
}
