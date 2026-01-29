/**
 * Experiment Results API - Epic #516
 *
 * Get detailed statistical analysis and results for an experiment.
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { getExperiment } from "@/lib/hypothesis-agent/core/experiment-manager";
import { wilsonScoreInterval } from "@/lib/hypothesis-agent/statistical-engine/confidence-intervals";
import { selectWinner } from "@/lib/hypothesis-agent/winner-selection/winner-selector";
import type {
  ExperimentAnalysis,
  StatisticalResult,
  WinnerSelectionConfig,
} from "@/types/hypothesis-agent";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; experimentId: string }>;
}

/**
 * Calculate two-proportion z-test
 */
function calculateZTest(
  p1: number,
  n1: number,
  p2: number,
  n2: number
): { zScore: number; pValue: number } {
  if (n1 === 0 || n2 === 0) {
    return { zScore: 0, pValue: 1 };
  }

  // Pooled proportion
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));

  // Z-score
  const zScore = se > 0 ? (p1 - p2) / se : 0;

  // P-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return { zScore, pValue };
}

/**
 * Cumulative Distribution Function for standard normal distribution
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * GET /api/orbit/[workspaceSlug]/experiments/[experimentId]/results
 * Get experiment results and statistical analysis
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, experimentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify workspace membership
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: { id: true },
    })
  );

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Fetch experiment
  const { data: experiment, error: experimentError } = await tryCatch(
    getExperiment(experimentId)
  );

  if (experimentError || !experiment || experiment.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Calculate statistical results for each variant
  const variantResults: StatisticalResult[] = experiment.variants.map((variant) => {
    const conversionRate = variant.impressions > 0 ? variant.conversions / variant.impressions : 0;

    // Wilson score confidence interval
    const confidenceInterval = wilsonScoreInterval(
      variant.conversions,
      variant.impressions,
      experiment.significanceLevel
    );

    return {
      variantId: variant.id,
      variantName: variant.name,
      impressions: variant.impressions,
      conversions: variant.conversions,
      conversionRate,
      confidenceInterval: {
        lower: confidenceInterval.lower,
        upper: confidenceInterval.upper,
        level: experiment.significanceLevel,
      },
      isSignificant: false, // Will be updated below
      totalValue: variant.totalValue,
      avgValue: variant.impressions > 0 ? variant.totalValue / variant.impressions : 0,
    };
  });

  // Compare each variant to control for statistical significance
  const controlVariant = experiment.variants.find((v) => v.isControl) || experiment.variants[0];
  const controlResult = variantResults.find((r) => r.variantId === controlVariant.id);

  if (controlResult) {
    variantResults.forEach((result) => {
      if (result.variantId === controlVariant.id) {
        result.isSignificant = false; // Control is baseline
        return;
      }

      // Calculate z-test against control
      const { zScore, pValue } = calculateZTest(
        result.conversionRate,
        result.impressions,
        controlResult.conversionRate,
        controlResult.impressions
      );

      result.zScore = zScore;
      result.pValue = pValue;
      result.isSignificant = pValue < (1 - experiment.significanceLevel);
    });
  }

  // Determine winner
  const config: WinnerSelectionConfig = {
    strategy: experiment.winnerStrategy,
    minimumSampleSize: experiment.minimumSampleSize,
    significanceLevel: experiment.significanceLevel,
  };

  const winnerCandidate = selectWinner(experiment.variants, config);
  const winner = winnerCandidate
    ? variantResults.find((r) => r.variantId === winnerCandidate.variantId) || null
    : null;

  // Determine recommended action
  let recommendedAction: "continue" | "select_winner" | "stop" | "needs_more_data";
  let reasoning: string;

  if (experiment.status === "COMPLETED") {
    recommendedAction = "stop";
    reasoning = "Experiment is already completed with a selected winner.";
  } else if (winnerCandidate) {
    recommendedAction = "select_winner";
    reasoning = winnerCandidate.reasoning;
  } else {
    const allMeetMinimum = experiment.variants.every(
      (v) => v.impressions >= experiment.minimumSampleSize
    );

    if (!allMeetMinimum) {
      recommendedAction = "needs_more_data";
      reasoning = `Some variants have not reached minimum sample size (${experiment.minimumSampleSize}).`;
    } else {
      recommendedAction = "continue";
      reasoning =
        "All variants meet minimum sample size, but no statistically significant winner detected yet. Continue collecting data.";
    }
  }

  const analysis: ExperimentAnalysis = {
    experimentId: experiment.id,
    status: experiment.status,
    variants: variantResults,
    winner,
    recommendedAction,
    reasoning,
    calculatedAt: new Date(),
  };

  return NextResponse.json({ experiment, analysis });
}
