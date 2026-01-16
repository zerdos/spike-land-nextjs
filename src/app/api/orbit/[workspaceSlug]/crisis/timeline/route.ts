/**
 * Crisis Timeline API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/timeline - Get crisis timeline
 *
 * Query Parameters:
 * - crisisId: Get timeline for specific crisis (optional)
 * - days: Number of days to look back (default 7)
 * - limit: Maximum number of events (default 100)
 * - types: Comma-separated list of event types to filter
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisTimelineService } from "@/lib/crisis";
import type { CrisisTimelineEvent } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/timeline - Get crisis timeline
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const searchParams = request.nextUrl.searchParams;

  // Check if requesting specific crisis timeline
  const crisisId = searchParams.get("crisisId");

  if (crisisId) {
    // Get timeline for specific crisis
    const timeline = await CrisisTimelineService.getCrisisTimeline(crisisId);

    if (!timeline) {
      return NextResponse.json({ error: "Crisis not found" }, { status: 404 });
    }

    // Enrich with actor names
    const enrichedEvents = await CrisisTimelineService.enrichTimelineWithActors(
      timeline.events,
    );

    return NextResponse.json({
      ...timeline,
      events: enrichedEvents,
    });
  }

  // Get workspace timeline
  const days = parseInt(searchParams.get("days") || "7", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

  const typesParam = searchParams.get("types");
  const types = typesParam
    ? (typesParam.split(",") as CrisisTimelineEvent["type"][])
    : undefined;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await CrisisTimelineService.getWorkspaceTimeline(
    workspace.id,
    {
      startDate,
      limit,
      types,
    },
  );

  // Enrich with actor names
  const enrichedEvents = await CrisisTimelineService.enrichTimelineWithActors(
    events,
  );

  // Get summary
  const summary = await CrisisTimelineService.getTimelineSummary(
    workspace.id,
    days,
  );

  return NextResponse.json({
    events: enrichedEvents,
    summary: {
      totalEvents: summary.totalEvents,
      eventsByType: summary.eventsByType,
      eventsByDay: summary.eventsByDay,
    },
  });
}
