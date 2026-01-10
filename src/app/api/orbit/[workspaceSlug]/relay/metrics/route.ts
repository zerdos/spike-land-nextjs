/**
 * Relay Workflow Metrics API
 *
 * GET /api/orbit/[workspaceSlug]/relay/metrics - Get workflow metrics
 *
 * Query Parameters:
 * - startDate: Optional ISO date string
 * - endDate: Optional ISO date string
 *
 * Resolves #569: Build Relay approval workflow
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getAggregatedFeedback, getWorkflowMetrics } from "@/lib/relay";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/relay/metrics - Get workflow metrics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug
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

  // Parse date filters from query params
  const startDateParam = request.nextUrl.searchParams.get("startDate");
  const endDateParam = request.nextUrl.searchParams.get("endDate");

  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const endDate = endDateParam ? new Date(endDateParam) : undefined;

  // Validate dates
  if (startDateParam && isNaN(startDate!.getTime())) {
    return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
  }
  if (endDateParam && isNaN(endDate!.getTime())) {
    return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
  }

  // Get workflow metrics
  const { data: metrics, error: metricsError } = await tryCatch(
    getWorkflowMetrics(workspace.id, startDate, endDate),
  );

  if (metricsError) {
    console.error("Failed to get workflow metrics:", metricsError);
    return NextResponse.json(
      { error: "Failed to get workflow metrics" },
      { status: 500 },
    );
  }

  // Get aggregated feedback for ML insights
  const { data: feedback, error: feedbackError } = await tryCatch(
    getAggregatedFeedback(workspace.id, startDate, endDate),
  );

  if (feedbackError) {
    console.error("Failed to get aggregated feedback:", feedbackError);
    // Don't fail the whole request, just return metrics without feedback
    return NextResponse.json({
      metrics,
      feedback: null,
    });
  }

  return NextResponse.json({
    metrics,
    feedback,
    dateRange: {
      startDate: startDate?.toISOString() || null,
      endDate: endDate?.toISOString() || null,
    },
  });
}
