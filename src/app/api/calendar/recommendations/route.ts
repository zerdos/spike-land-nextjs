/**
 * Best-Time Recommendations API Route
 *
 * GET /api/calendar/recommendations - Fetch best-time posting recommendations
 *
 * Query Parameters:
 * - workspaceId: Required. The workspace ID
 * - accountIds: Optional. Comma-separated account IDs to analyze
 * - lookbackDays: Optional. Number of days of data to analyze (default: 30)
 * - includeGaps: Optional. Whether to include calendar gap analysis (default: true)
 * - gapStartDate: Optional. ISO date string for gap analysis start
 * - gapEndDate: Optional. ISO date string for gap analysis end
 *
 * Part of #578: Add best-time recommendations
 */

import { auth } from "@/auth";
import { getBestTimeRecommendations } from "@/lib/calendar/best-time-service";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const accountIdsParam = searchParams.get("accountIds");
  const lookbackDaysParam = searchParams.get("lookbackDays");
  const includeGapsParam = searchParams.get("includeGaps");
  const gapStartDate = searchParams.get("gapStartDate");
  const gapEndDate = searchParams.get("gapEndDate");

  // Validate required parameters
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 },
    );
  }

  // Parse optional parameters
  const accountIds = accountIdsParam
    ? accountIdsParam.split(",").map((id) => id.trim())
    : undefined;

  const lookbackDays = lookbackDaysParam
    ? parseInt(lookbackDaysParam, 10)
    : 30;

  if (isNaN(lookbackDays) || lookbackDays < 1 || lookbackDays > 365) {
    return NextResponse.json(
      { error: "lookbackDays must be a number between 1 and 365" },
      { status: 400 },
    );
  }

  const includeGaps = includeGapsParam !== "false";

  // Parse gap analysis date range
  let gapAnalysisRange: { start: Date; end: Date } | undefined;
  if (gapStartDate && gapEndDate) {
    const start = new Date(gapStartDate);
    const end = new Date(gapEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO date strings" },
        { status: 400 },
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "gapStartDate must be before gapEndDate" },
        { status: 400 },
      );
    }

    gapAnalysisRange = { start, end };
  }

  // Verify user has access to the workspace
  const { error: permError } = await tryCatch(
    requireWorkspaceMembership(session, workspaceId),
  );

  if (permError) {
    const httpStatus = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status: httpStatus });
  }

  try {
    const result = await getBestTimeRecommendations({
      workspaceId,
      accountIds,
      lookbackDays,
      includeGaps,
      gapAnalysisRange,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch best-time recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}
