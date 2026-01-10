/**
 * Policy Violations API
 *
 * GET /api/orbit/[workspaceSlug]/policy/violations - List violation history
 *
 * Query Parameters:
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset
 * - severity: Filter by severity (INFO, WARNING, ERROR, CRITICAL)
 * - ruleId: Filter by rule
 * - startDate: ISO date string
 * - endDate: ISO date string
 *
 * Resolves #584: Build Policy Checker
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getViolationHistory } from "@/lib/policy-checker";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/policy/violations - List violation history
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

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  const offsetParam = searchParams.get("offset");
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const severity = searchParams.get("severity") ?? undefined;
  const ruleId = searchParams.get("ruleId") ?? undefined;

  const startDateParam = searchParams.get("startDate");
  const startDate = startDateParam ? new Date(startDateParam) : undefined;

  const endDateParam = searchParams.get("endDate");
  const endDate = endDateParam ? new Date(endDateParam) : undefined;

  // Get violations
  const { data: result, error: violationsError } = await tryCatch(
    getViolationHistory(workspace.id, {
      limit,
      offset,
      severity,
      ruleId,
      startDate,
      endDate,
    }),
  );

  if (violationsError) {
    console.error("Error fetching violations:", violationsError);
    return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 });
  }

  return NextResponse.json({
    violations: result.violations,
    total: result.total,
    limit,
    offset,
  });
}
