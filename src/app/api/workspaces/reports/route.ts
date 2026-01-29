import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import type { CreateReportRequest } from "@/types/workspace-reports";

/**
 * GET /api/workspaces/reports
 * List all reports for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reports = await prisma.workspaceReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        instances: {
          take: 1,
          orderBy: { generatedAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/reports
 * Create a new report
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body: CreateReportRequest = await request.json();

    // Validate that user has access to all specified workspaces
    const accessibleWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
        workspaceId: { in: body.workspaceIds },
      },
      select: { workspaceId: true },
    });

    const accessibleWorkspaceIds = new Set(
      accessibleWorkspaces.map((w) => w.workspaceId)
    );

    const inaccessibleWorkspaces = body.workspaceIds.filter(
      (id) => !accessibleWorkspaceIds.has(id)
    );

    if (inaccessibleWorkspaces.length > 0) {
      return NextResponse.json(
        {
          error: "Access denied to some workspaces",
          inaccessibleWorkspaces,
        },
        { status: 403 }
      );
    }

    // Create report
    const report = await prisma.workspaceReport.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description,
        workspaceIds: body.workspaceIds,
        metrics: body.metrics,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dateRange: body.dateRange as any, // DateRange -> Json
        schedule: body.schedule || "MANUAL",
        scheduleFrequency: body.scheduleFrequency,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
