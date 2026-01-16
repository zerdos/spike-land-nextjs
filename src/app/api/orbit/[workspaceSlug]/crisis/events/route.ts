/**
 * Crisis Events API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/events - List crisis events
 * POST /api/orbit/[workspaceSlug]/crisis/events - Create a manual crisis event
 *
 * Query Parameters for GET:
 * - status: Filter by status (DETECTED, ACKNOWLEDGED, RESOLVED, FALSE_ALARM)
 * - severity: Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisAlertManager, CrisisDetector } from "@/lib/crisis";
import type { CrisisEventSearchParams } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CrisisEventStatus, CrisisSeverity } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/events - List crisis events
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

  // Parse search parameters
  const searchParams = request.nextUrl.searchParams;

  const searchOptions: CrisisEventSearchParams = {
    workspaceId: workspace.id,
  };

  const status = searchParams.get("status") as CrisisEventStatus | null;
  if (
    status &&
    ["DETECTED", "ACKNOWLEDGED", "RESOLVED", "FALSE_ALARM"].includes(status)
  ) {
    searchOptions.status = [status];
  }

  const severity = searchParams.get("severity") as CrisisSeverity | null;
  if (severity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
    searchOptions.severity = [severity];
  }

  const startDate = searchParams.get("startDate");
  if (startDate) {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) {
      searchOptions.startDate = date;
    }
  }

  const endDate = searchParams.get("endDate");
  if (endDate) {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      searchOptions.endDate = date;
    }
  }

  const limit = searchParams.get("limit");
  searchOptions.limit = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;

  const offset = searchParams.get("offset");
  searchOptions.offset = offset ? parseInt(offset, 10) || 0 : 0;

  // Search events
  const { data: result, error: searchError } = await tryCatch(
    CrisisDetector.searchEvents(searchOptions),
  );

  if (searchError) {
    console.error("Failed to search crisis events:", searchError);
    return NextResponse.json(
      { error: "Failed to search crisis events" },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}

/**
 * POST /api/orbit/[workspaceSlug]/crisis/events - Create manual crisis event
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
        slug: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or insufficient permissions" },
      { status: 404 },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const { severity, description, affectedAccountIds } = body as {
    severity?: CrisisSeverity;
    description?: string;
    affectedAccountIds?: string[];
  };

  if (!severity || !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
    return NextResponse.json(
      { error: "Valid severity is required (LOW, MEDIUM, HIGH, CRITICAL)" },
      { status: 400 },
    );
  }

  // Create crisis event
  const event = await CrisisDetector.createEvent({
    workspaceId: workspace.id,
    severity,
    triggerType: "MANUAL",
    triggerData: {
      source: "manual",
      description: description || "Manually created crisis event",
      createdById: session.user.id,
    },
    affectedAccountIds,
  });

  if (!event) {
    return NextResponse.json(
      { error: "Failed to create crisis event" },
      { status: 500 },
    );
  }

  // Send alerts for manual crisis events
  await CrisisAlertManager.sendAlerts(
    event,
    ["email", "slack", "in_app"],
    workspace.slug,
  );

  return NextResponse.json(event, { status: 201 });
}
