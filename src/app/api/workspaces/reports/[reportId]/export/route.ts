import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import { formatReportData } from "@/lib/workspace/report-generator";
import type { ReportFormat } from "@prisma/client";

interface Params {
  params: {
    reportId: string;
  };
}

/**
 * GET /api/workspaces/reports/[reportId]/export?instanceId=xxx&format=xxx
 * Export a report instance in the specified format
 */
export async function GET(request: NextRequest, { params }: Params) {
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

    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("instanceId");
    const format = (searchParams.get("format") as ReportFormat) || "JSON";

    if (!instanceId) {
      return NextResponse.json(
        { error: "Instance ID is required" },
        { status: 400 }
      );
    }

    // Get report instance
    const instance = await prisma.workspaceReportInstance.findFirst({
      where: {
        id: instanceId,
        report: {
          id: params.reportId,
          userId: user.id,
        },
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: "Report instance not found" },
        { status: 404 }
      );
    }

    // Format data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedData = formatReportData(instance.data as any, format);

    // Set appropriate headers based on format
    const headers: Record<string, string> = {
      "Content-Type":
        format === "CSV"
          ? "text/csv"
          : format === "PDF"
            ? "application/pdf"
            : "application/json",
      "Content-Disposition": `attachment; filename="report-${params.reportId}-${instance.id}.${format.toLowerCase()}"`,
    };

    return new NextResponse(formattedData, { headers });
  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
