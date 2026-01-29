/**
 * Individual Experiment API - Epic #516
 *
 * Get, update, and delete specific experiments.
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import {
  getExperiment,
  updateExperiment,
  deleteExperiment,
} from "@/lib/hypothesis-agent/core/experiment-manager";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; experimentId: string }>;
}

// Validation schemas
const updateExperimentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  status: z.enum(["DRAFT", "RUNNING", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  significanceLevel: z.number().min(0.8).max(0.999).optional(),
  winnerStrategy: z.enum(["IMMEDIATE", "CONSERVATIVE", "ECONOMIC", "SAFETY_FIRST"]).optional(),
  autoSelectWinner: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/orbit/[workspaceSlug]/experiments/[experimentId]
 * Get experiment details
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

  if (experimentError || !experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Verify experiment belongs to workspace
  if (experiment.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  return NextResponse.json({ experiment });
}

/**
 * PATCH /api/orbit/[workspaceSlug]/experiments/[experimentId]
 * Update experiment
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  // Verify experiment exists and belongs to workspace
  const { data: existingExperiment, error: fetchError } = await tryCatch(
    getExperiment(experimentId)
  );

  if (fetchError || !existingExperiment || existingExperiment.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request
  const validation = updateExperimentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Update experiment
  const { data: updatedExperiment, error: updateError } = await tryCatch(
    updateExperiment(experimentId, data)
  );

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update experiment", details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ experiment: updatedExperiment });
}

/**
 * DELETE /api/orbit/[workspaceSlug]/experiments/[experimentId]
 * Delete experiment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, experimentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify workspace permission
  const { data: workspace, error: permissionError } = await requireWorkspacePermission(
    workspaceSlug,
    session.user.id,
    "DELETE_EXPERIMENT"
  );

  if (permissionError || !workspace) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Verify experiment exists and belongs to workspace
  const { data: existingExperiment, error: fetchError } = await tryCatch(
    getExperiment(experimentId)
  );

  if (fetchError || !existingExperiment || existingExperiment.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Delete experiment
  const { error: deleteError } = await tryCatch(deleteExperiment(experimentId));

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete experiment", details: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
