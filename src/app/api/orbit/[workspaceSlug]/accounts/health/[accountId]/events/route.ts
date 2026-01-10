/**
 * Account Health Events API
 *
 * GET /api/orbit/[workspaceSlug]/accounts/health/[accountId]/events - Get health event history
 *
 * Resolves #586: Implement Account Health Monitor
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAccountHealthEvents } from "@/lib/health-monitor";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; accountId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/accounts/health/[accountId]/events - Get health events
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, accountId } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const severity = searchParams.get("severity");
  const eventType = searchParams.get("eventType");

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

  // Verify account belongs to workspace
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        platform: true,
        accountName: true,
      },
    }),
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get events with optional filtering
  const events = await getAccountHealthEvents(accountId, limit);

  // Filter by severity if specified
  let filteredEvents = events;
  if (severity) {
    filteredEvents = filteredEvents.filter((e) => e.severity === severity);
  }
  if (eventType) {
    filteredEvents = filteredEvents.filter((e) => e.eventType === eventType);
  }

  return NextResponse.json({
    account: {
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
    },
    events: filteredEvents,
    total: filteredEvents.length,
  });
}
