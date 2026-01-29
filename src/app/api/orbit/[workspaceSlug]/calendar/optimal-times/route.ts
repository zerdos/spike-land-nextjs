/**
 * GET /api/orbit/[workspaceSlug]/calendar/optimal-times
 * Fetch optimal posting times with heatmap data
 * Issue #841
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getOptimalTimes,
  getHeatmapData,
} from "@/lib/calendar/optimal-time-service";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
): Promise<NextResponse> {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceSlug } = await params;

  // 2. Verify workspace access
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    }),
  );

  if (workspaceError) {
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 },
    );
  }

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 403 },
    );
  }

  // 3. Parse query params
  const searchParams = request.nextUrl.searchParams;
  const accountIdsParam = searchParams.get("accountIds");
  const refreshCacheParam = searchParams.get("refreshCache");
  const includeHeatmapParam = searchParams.get("includeHeatmap");

  const accountIds = accountIdsParam
    ? accountIdsParam.split(",").filter(Boolean)
    : undefined;
  const refreshCache = refreshCacheParam === "true";
  const includeHeatmap = includeHeatmapParam === "true";

  // 4. Call getOptimalTimes
  const { data: optimalTimes, error: optimalTimesError } = await tryCatch(
    getOptimalTimes({
      workspaceId: workspace.id,
      accountIds,
      refreshCache,
    }),
  );

  if (optimalTimesError) {
    return NextResponse.json(
      {
        error: optimalTimesError instanceof Error
          ? optimalTimesError.message
          : "Failed to fetch optimal times",
      },
      { status: 500 },
    );
  }

  // 5. Optionally include heatmap data
  let heatmaps = undefined;
  if (includeHeatmap && accountIds) {
    const { data: heatmapData, error: heatmapError } = await tryCatch(
      Promise.all(accountIds.map((accountId) => getHeatmapData(accountId))),
    );

    if (heatmapError) {
      return NextResponse.json(
        {
          error: heatmapError instanceof Error
            ? heatmapError.message
            : "Failed to fetch heatmap data",
        },
        { status: 500 },
      );
    }

    heatmaps = heatmapData;
  }

  // 6. Return JSON
  return NextResponse.json({
    success: true,
    optimalTimes,
    heatmaps,
    count: optimalTimes.length,
  });
}
