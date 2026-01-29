import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import {
  generateReportData,
  // formatReportData,
} from "@/lib/workspace/report-generator";
import type { GenerateReportRequest } from "@/types/workspace-reports";

interface Params {
  params: {
    reportId: string;
  };
}

/**
 * POST /api/workspaces/reports/[reportId]/generate
 * Generate a report instance
 */
export async function POST(request: NextRequest, { params }: Params) {
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

    // Get report
    const report = await prisma.workspaceReport.findFirst({
      where: {
        id: params.reportId,
        userId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body: GenerateReportRequest = await request.json();
    const format = body.format || "JSON";

    // Use provided date range or report's default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateRange = body.dateRange || (report.dateRange as any);

    if (!dateRange) {
      return NextResponse.json(
        { error: "Date range is required" },
        { status: 400 }
      );
    }

    // Generate report data
    const reportData = await generateReportData(
      report.workspaceIds,
      dateRange,
      report.metrics
    );

    // Create report instance
    const instance = await prisma.workspaceReportInstance.create({
      data: {
        reportId: report.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: reportData as any,
        format,
        period: dateRange,
      },
    });

    // Update report's lastRunAt
    await prisma.workspaceReport.update({
      where: { id: report.id },
      data: {
        lastRunAt: new Date(),
      },
    });

    return NextResponse.json(instance, { status: 201 });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
