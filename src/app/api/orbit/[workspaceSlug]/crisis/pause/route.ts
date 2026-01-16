/**
 * Automation Pause API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/pause - Get pause status
 * POST /api/orbit/[workspaceSlug]/crisis/pause - Pause automations
 * DELETE /api/orbit/[workspaceSlug]/crisis/pause - Resume automations
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { AutomationPauseManager } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/pause - Get pause status
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is a member
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get pause status
  const status = await AutomationPauseManager.getStatus(workspace.id);

  return NextResponse.json(status);
}

/**
 * POST /api/orbit/[workspaceSlug]/crisis/pause - Pause automations
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is admin/owner
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or insufficient permissions" },
      { status: 404 },
    );
  }

  // Check if already paused
  const currentStatus = await AutomationPauseManager.getStatus(workspace.id);
  if (currentStatus.isPaused) {
    return NextResponse.json(
      { error: "Automations are already paused" },
      { status: 409 },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const { reason, relatedCrisisId, scheduledResumeAt } = body as {
    reason?: string;
    relatedCrisisId?: string;
    scheduledResumeAt?: string;
  };

  // Pause automations
  const success = await AutomationPauseManager.pauseAutomations({
    workspaceId: workspace.id,
    userId: session.user.id,
    reason,
    relatedCrisisId,
    scheduledResumeAt: scheduledResumeAt
      ? new Date(scheduledResumeAt)
      : undefined,
  });

  if (!success) {
    return NextResponse.json(
      { error: "Failed to pause automations" },
      { status: 500 },
    );
  }

  // Get updated status
  const status = await AutomationPauseManager.getStatus(workspace.id);

  return NextResponse.json(status, { status: 201 });
}

/**
 * DELETE /api/orbit/[workspaceSlug]/crisis/pause - Resume automations
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is admin/owner
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or insufficient permissions" },
      { status: 404 },
    );
  }

  // Check if currently paused
  const currentStatus = await AutomationPauseManager.getStatus(workspace.id);
  if (!currentStatus.isPaused) {
    return NextResponse.json(
      { error: "Automations are not paused" },
      { status: 409 },
    );
  }

  // Parse request body for notes (optional)
  let notes: string | undefined;
  const { data: body } = await tryCatch(request.json());
  if (body && typeof body === "object" && "notes" in body) {
    notes = body.notes as string;
  }

  // Resume automations
  const success = await AutomationPauseManager.resumeAutomations(
    workspace.id,
    session.user.id,
    notes,
  );

  if (!success) {
    return NextResponse.json(
      { error: "Failed to resume automations" },
      { status: 500 },
    );
  }

  return NextResponse.json({ isPaused: false });
}
