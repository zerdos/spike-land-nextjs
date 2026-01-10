/**
 * Policy Statistics API
 *
 * GET /api/orbit/[workspaceSlug]/policy/statistics - Get policy check statistics
 *
 * Query Parameters:
 * - days: Number of days to include (default 30, max 365)
 *
 * Returns:
 * - Rule statistics (total, active, by category, by severity)
 * - Violation statistics (total, overridden, by severity, by category, by rule, trend)
 *
 * Resolves #584: Build Policy Checker
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getRuleStatistics, getViolationStatistics } from "@/lib/policy-checker";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/policy/statistics - Get policy statistics
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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const daysParam = searchParams.get("days");
  const days = daysParam ? Math.min(parseInt(daysParam, 10), 365) : 30;

  // Get statistics in parallel
  const [ruleStatsResult, violationStatsResult] = await Promise.all([
    tryCatch(getRuleStatistics(workspace.id)),
    tryCatch(getViolationStatistics(workspace.id, days)),
  ]);

  if (ruleStatsResult.error) {
    console.error("Error fetching rule statistics:", ruleStatsResult.error);
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
  }

  if (violationStatsResult.error) {
    console.error("Error fetching violation statistics:", violationStatsResult.error);
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
  }

  return NextResponse.json({
    rules: ruleStatsResult.data,
    violations: violationStatsResult.data,
    period: {
      days,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
  });
}
