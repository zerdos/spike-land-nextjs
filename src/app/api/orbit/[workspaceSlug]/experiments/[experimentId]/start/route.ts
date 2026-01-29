/**
 * Start Experiment API - Epic #516
 *
 * Transition experiment to RUNNING status.
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { tryCatch } from "@/lib/try-catch";
import {
  getExperiment,
  startExperiment,
} from "@/lib/hypothesis-agent/core/experiment-manager";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; experimentId: string }>;
}

/**
 * POST /api/orbit/[workspaceSlug]/experiments/[experimentId]/start
 * Start an experiment
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

  // Verify experiment is in DRAFT or PAUSED status
  if (experiment.status !== "DRAFT" && experiment.status !== "PAUSED") {
    return NextResponse.json(
      { error: "Experiment must be in DRAFT or PAUSED status to start" },
      { status: 400 }
    );
  }

  // Verify experiment has at least 2 variants
  if (experiment.variants.length < 2) {
    return NextResponse.json(
      { error: "Experiment must have at least 2 variants" },
      { status: 400 }
    );
  }

  // Start experiment
  const { data: updatedExperiment, error: updateError } = await tryCatch(
    startExperiment(experimentId)
  );

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to start experiment", details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ experiment: updatedExperiment });
}
