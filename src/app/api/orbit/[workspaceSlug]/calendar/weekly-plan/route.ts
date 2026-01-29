/**
 * GET /api/orbit/[workspaceSlug]/calendar/weekly-plan
 * Generate weekly content plan
 * Issue #841
 */

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateWeeklyPlan } from "@/lib/calendar/weekly-plan-service";
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
    const weeklyPlan = await generateWeeklyPlan(workspace.id, weekStart);

    // 5. Return weekly plan JSON
    return NextResponse.json({
      success: true,
      plan: weeklyPlan,
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
