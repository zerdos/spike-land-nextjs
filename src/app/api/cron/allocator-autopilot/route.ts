import { getAllocatorRecommendations } from "@/lib/allocator";
import type { AllocatorConfidenceLevel, RecommendationType } from "@/lib/allocator/allocator-types";
import { AutopilotService } from "@/lib/allocator/autopilot-service";
import type { AutopilotRecommendation } from "@/lib/allocator/autopilot-types";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Maps RecommendationType from allocator-types to AutopilotRecommendation type
 */
function mapRecommendationType(
  type: RecommendationType,
): AutopilotRecommendation["type"] {
  const mapping: Record<RecommendationType, AutopilotRecommendation["type"]> = {
    INCREASE_BUDGET: "BUDGET_INCREASE",
    DECREASE_BUDGET: "BUDGET_DECREASE",
    REALLOCATE: "REALLOCATE",
    PAUSE_CAMPAIGN: "BUDGET_DECREASE", // Map to decrease as pause effectively reduces budget to 0
    RESUME_CAMPAIGN: "BUDGET_INCREASE", // Map to increase as resume restores budget
    SCALE_WINNER: "BUDGET_INCREASE", // Scaling is an increase
  };
  return mapping[type];
}

/**
 * Maps confidence level string to numeric value
 */
function mapConfidenceToNumber(confidence: AllocatorConfidenceLevel): number {
  const mapping: Record<AllocatorConfidenceLevel, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };
  return mapping[confidence];
}

export const runtime = "nodejs"; // Ensure this runs in Node.js environment (needed for prisma)

export async function GET(req: NextRequest) {
  // Cron jobs should be authenticated
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get enabled workspaces
    const enabledConfigs = await prisma.allocatorAutopilotConfig.findMany({
      where: { isEnabled: true },
      distinct: ["workspaceId"], // Process each workspace once (though config is unique per workspace/campaign, we start with workspace level)
    });

    const results = [];

    for (const config of enabledConfigs) {
      // 2. Get recommendations for this workspace
      // Using existing recommendation engine
      const correlationId = `cron-${config.workspaceId}-${Date.now()}`;
      const response = await getAllocatorRecommendations({
        workspaceId: config.workspaceId,
        correlationId,
        triggeredBy: "CRON",
      });

      // 3. Process each recommendation
      for (const rec of response.recommendations) {
        // Map BudgetRecommendation to AutopilotRecommendation type
        const autopilotRec: AutopilotRecommendation = {
          id: rec.id,
          type: mapRecommendationType(rec.type),
          workspaceId: config.workspaceId,
          campaignId: rec.targetCampaign.id,
          currentBudget: rec.targetCampaign.currentBudget,
          suggestedBudget: rec.suggestedNewBudget,
          reason: rec.reason,
          confidence: mapConfidenceToNumber(rec.confidence),
          correlationId: rec.correlationId, // Pass through from generation
        };

        const result = await AutopilotService.executeRecommendation(
          autopilotRec,
          "CRON",
        );
        results.push(result);
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Autopilot Cron Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
