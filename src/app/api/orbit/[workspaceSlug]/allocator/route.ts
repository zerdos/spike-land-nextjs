/**
 * Allocator Recommendations API
 *
 * GET /api/orbit/[workspaceSlug]/allocator - Get budget reallocation recommendations
 *
 * Query Parameters:
 * - accountIds: Optional. Comma-separated marketing account IDs to analyze
 * - lookbackDays: Optional. Days of data to analyze (default: 30)
 * - riskTolerance: Optional. "conservative" | "moderate" | "aggressive" (default: "moderate")
 *
 * Part of #548: Build Allocator recommendation engine
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAllocatorRecommendations } from "@/lib/allocator";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

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
        name: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const accountIdsParam = searchParams.get("accountIds");
  const lookbackDaysParam = searchParams.get("lookbackDays");
  const riskToleranceParam = searchParams.get("riskTolerance");

  const accountIds = accountIdsParam
    ? accountIdsParam.split(",").map((id) => id.trim())
    : undefined;

  const lookbackDays = lookbackDaysParam ? parseInt(lookbackDaysParam, 10) : 30;

  if (isNaN(lookbackDays) || lookbackDays < 7 || lookbackDays > 90) {
    return NextResponse.json(
      { error: "lookbackDays must be a number between 7 and 90" },
      { status: 400 },
    );
  }

  const validRiskTolerances = [
    "conservative",
    "moderate",
    "aggressive",
  ] as const;
  const riskTolerance = validRiskTolerances.includes(
      riskToleranceParam as typeof validRiskTolerances[number],
    )
    ? (riskToleranceParam as typeof validRiskTolerances[number])
    : "moderate";

  // Get recommendations
  const { data: recommendations, error: recommendationsError } = await tryCatch(
    getAllocatorRecommendations({
      workspaceId: workspace.id,
      accountIds,
      lookbackDays,
      riskTolerance,
    }),
  );

  if (recommendationsError) {
    console.error(
      "Failed to get allocator recommendations:",
      recommendationsError,
    );
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }

  // Serialize dates for JSON response
  return NextResponse.json({
    ...recommendations,
    campaignAnalyses: recommendations.campaignAnalyses.map((analysis) => ({
      ...analysis,
      periodStart: analysis.periodStart.toISOString(),
      periodEnd: analysis.periodEnd.toISOString(),
    })),
    recommendations: recommendations.recommendations.map((rec) => ({
      ...rec,
      createdAt: rec.createdAt.toISOString(),
      expiresAt: rec.expiresAt.toISOString(),
    })),
    analysisRange: {
      start: recommendations.analysisRange.start.toISOString(),
      end: recommendations.analysisRange.end.toISOString(),
    },
    workspaceName: workspace.name,
  });
}
