import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import type { UpdateReportRequest } from "@/types/workspace-reports";

interface Params {
  params: {
    reportId: string;
  };
}

/**
 * GET /api/workspaces/reports/[reportId]
 * Get a specific report
 */
export async function GET(_request: NextRequest, { params }: Params) {
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

    const report = await prisma.workspaceReport.findFirst({
      where: {
        id: params.reportId,
        userId: user.id,
      },
      include: {
        instances: {
          orderBy: { generatedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/reports/[reportId]
 * Update a report
 */
export async function PATCH(request: NextRequest, { params }: Params) {
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

    // Check if report exists and belongs to user
    const existingReport = await prisma.workspaceReport.findFirst({
      where: {
        id: params.reportId,
        userId: user.id,
      },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body: UpdateReportRequest = await request.json();

    // If workspaceIds are being updated, validate access
    if (body.workspaceIds) {
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
    }

    // Update report
    const report = await prisma.workspaceReport.update({
      where: { id: params.reportId },
      data: {
        name: body.name,
        description: body.description,
        workspaceIds: body.workspaceIds,
        metrics: body.metrics,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dateRange: body.dateRange as any, // DateRange -> Json
        schedule: body.schedule,
        scheduleFrequency: body.scheduleFrequency,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/reports/[reportId]
 * Delete a report
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
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

    // Check if report exists and belongs to user
    const existingReport = await prisma.workspaceReport.findFirst({
      where: {
        id: params.reportId,
        userId: user.id,
      },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Delete report (instances will be cascade deleted)
    await prisma.workspaceReport.delete({
      where: { id: params.reportId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
