/**
 * Crisis Event Detail API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/events/[eventId] - Get event details
 * PATCH /api/orbit/[workspaceSlug]/crisis/events/[eventId] - Acknowledge/resolve event
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisDetector, CrisisTimelineService } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; eventId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/events/[eventId] - Get event details
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, eventId } = await params;

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

  // Get event details
  const event = await CrisisDetector.getEventById(eventId);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Verify event belongs to this workspace
  if (event.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Get timeline for this crisis
  const timeline = await CrisisTimelineService.getCrisisTimeline(eventId);

  return NextResponse.json({
    event,
    timeline: timeline?.events || [],
  });
}

/**
 * PATCH /api/orbit/[workspaceSlug]/crisis/events/[eventId] - Acknowledge/resolve event
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, eventId } = await params;

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

  // Verify event exists and belongs to this workspace
  const existingEvent = await CrisisDetector.getEventById(eventId);

  if (!existingEvent || existingEvent.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const { action, notes, falseAlarm } = body as {
    action?: "acknowledge" | "resolve";
    notes?: string;
    falseAlarm?: boolean;
  };

  if (!action || !["acknowledge", "resolve"].includes(action)) {
    return NextResponse.json(
      { error: "Valid action is required (acknowledge or resolve)" },
      { status: 400 },
    );
  }

  let result;

  if (action === "acknowledge") {
    result = await CrisisDetector.acknowledgeEvent(
      eventId,
      session.user.id,
      notes,
    );
  } else {
    result = await CrisisDetector.resolveEvent(
      eventId,
      session.user.id,
      notes,
      falseAlarm,
    );
  }

  if (!result) {
    return NextResponse.json(
      { error: `Failed to ${action} event` },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
