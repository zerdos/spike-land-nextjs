/**
 * Winner Selection API - Epic #516
 *
 * Select winning variant for an experiment.
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import {
  getExperiment,
  completeExperiment,
} from "@/lib/hypothesis-agent/core/experiment-manager";
import { selectWinner } from "@/lib/hypothesis-agent/winner-selection/winner-selector";
import type { WinnerSelectionConfig } from "@/types/hypothesis-agent";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; experimentId: string }>;
}

// Validation schema
const selectWinnerSchema = z.object({
  variantId: z.string().cuid().optional(), // If provided, manual selection
  force: z.boolean().default(false), // Force selection even if not significant
});

/**
 * POST /api/orbit/[workspaceSlug]/experiments/[experimentId]/winner
 * Select winning variant
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, experimentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify workspace permission
  const { data: workspace, error: permissionError } = await requireWorkspacePermission(
    workspaceSlug,
    session.user.id,
    "UPDATE_EXPERIMENT"
  );

  if (permissionError || !workspace) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Fetch experiment
  const { data: experiment, error: experimentError } = await tryCatch(
    getExperiment(experimentId)
  );

  if (experimentError || !experiment || experiment.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Verify experiment is running or paused
  if (experiment.status !== "RUNNING" && experiment.status !== "PAUSED") {
    return NextResponse.json(
      { error: "Experiment must be RUNNING or PAUSED to select winner" },
      { status: 400 }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request
  const validation = selectWinnerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const data = validation.data;

  // If variantId provided, it's manual selection
  if (data.variantId) {
    // Verify variant exists
    const variant = experiment.variants.find((v) => v.id === data.variantId);
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    // Complete experiment with manual winner
    const { data: updatedExperiment, error: updateError } = await tryCatch(
      completeExperiment(experimentId, data.variantId)
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to select winner", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      experiment: updatedExperiment,
      winner: variant,
      method: "manual",
    });
  }

  // Auto-selection using configured strategy
  const config: WinnerSelectionConfig = {
    strategy: experiment.winnerStrategy,
    minimumSampleSize: experiment.minimumSampleSize,
    significanceLevel: experiment.significanceLevel,
  };

  const winnerCandidate = selectWinner(experiment.variants, config);

  if (!winnerCandidate && !data.force) {
    return NextResponse.json(
      {
        error: "No winner can be determined yet",
        reason: "Insufficient data or no statistically significant difference",
        requiresMoreData: true,
      },
      { status: 400 }
    );
  }

  // If force is true and no winner, select best performing variant
  let selectedVariantId: string;
  if (!winnerCandidate && data.force) {
    // Select variant with highest conversion rate
    const bestVariant = experiment.variants.reduce((best, current) => {
      const bestRate = best.impressions > 0 ? best.conversions / best.impressions : 0;
      const currentRate = current.impressions > 0 ? current.conversions / current.impressions : 0;
      return currentRate > bestRate ? current : best;
    });

    selectedVariantId = bestVariant.id;
  } else if (winnerCandidate) {
    selectedVariantId = winnerCandidate.variantId;
  } else {
    return NextResponse.json(
      { error: "Unable to determine winner" },
      { status: 400 }
    );
  }

  // Complete experiment
  const { data: updatedExperiment, error: updateError } = await tryCatch(
    completeExperiment(experimentId, selectedVariantId)
  );

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to select winner", details: updateError.message },
      { status: 500 }
    );
  }

  const winner = experiment.variants.find((v) => v.id === selectedVariantId);

  return NextResponse.json({
    experiment: updatedExperiment,
    winner,
    winnerCandidate,
    method: "automatic",
  });
}

/**
 * GET /api/orbit/[workspaceSlug]/experiments/[experimentId]/winner
 * Get current winner candidate (preview)
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

  // Calculate winner candidate
  const config: WinnerSelectionConfig = {
    strategy: experiment.winnerStrategy,
    minimumSampleSize: experiment.minimumSampleSize,
    significanceLevel: experiment.significanceLevel,
  };

  const winnerCandidate = selectWinner(experiment.variants, config);

  return NextResponse.json({
    hasWinner: !!winnerCandidate,
    winnerCandidate,
    experimentStatus: experiment.status,
    currentWinnerId: experiment.winnerVariantId,
  });
}
