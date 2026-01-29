/**
 * GET /api/orbit/[workspaceSlug]/calendar/optimal-times
 * Fetch optimal posting times with heatmap data
 * Issue #841
 */

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOptimalTimes, getHeatmapData } from "@/lib/calendar/optimal-time-service";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug } = await params;

    // 2. Verify workspace access
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

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
    const optimalTimes = await getOptimalTimes({
      workspaceId: workspace.id,
      accountIds,
      refreshCache,
    });

    // 5. Optionally include heatmap data
    let heatmaps = undefined;
    if (includeHeatmap && accountIds) {
      heatmaps = await Promise.all(
        accountIds.map((accountId) => getHeatmapData(accountId)),
      );
    }

    // 6. Return JSON
    return NextResponse.json({
      success: true,
      optimalTimes,
      heatmaps,
      count: optimalTimes.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
