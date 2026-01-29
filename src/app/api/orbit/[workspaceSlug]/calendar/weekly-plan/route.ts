/**
 * GET /api/orbit/[workspaceSlug]/calendar/weekly-plan
 * Generate weekly content plan
 * Issue #841
 */

import { auth } from "@/auth";
import { generateWeeklyPlan } from "@/lib/calendar/weekly-plan-service";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
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

  // 3. Parse weekStart query param
  const searchParams = request.nextUrl.searchParams;
  const weekStartParam = searchParams.get("weekStart");

  let weekStart: Date;
  if (weekStartParam) {
    weekStart = new Date(weekStartParam);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: "Invalid weekStart date" },
        { status: 400 },
      );
    }
  } else {
    // Default to current week start (Monday)
    weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
  }

  // 4. Call generateWeeklyPlan
  const { data: weeklyPlan, error: planError } = await tryCatch(
    generateWeeklyPlan(workspace.id, weekStart),
  );

  if (planError) {
    return NextResponse.json(
      {
        error: planError instanceof Error
          ? planError.message
          : "Failed to generate weekly plan",
      },
      { status: 500 },
    );
  }

  // 5. Return weekly plan JSON
  return NextResponse.json({
    success: true,
    plan: weeklyPlan,
  });
}
