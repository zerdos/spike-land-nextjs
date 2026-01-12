import { auth } from "@/auth";
import { AllocatorAuditExportService } from "@/lib/allocator/allocator-audit-export";
import prisma from "@/lib/prisma";
import type { AllocatorDecisionType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve params
  const { workspaceSlug } = await params;

  // Resolve workspace by slug & check access
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
  }

  // Parse query params
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") as "csv" | "json") || "csv";

  const correlationId = searchParams.get("correlationId") || undefined;
  const decisionType = searchParams.get("decisionType") as AllocatorDecisionType || undefined;
  const executionId = searchParams.get("executionId") || undefined;
  const campaignId = searchParams.get("campaignId") || undefined;

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  const fromDateParam = searchParams.get("fromDate");
  if (fromDateParam) {
    fromDate = new Date(fromDateParam);
    if (isNaN(fromDate.getTime())) fromDate = undefined;
  }

  const toDateParam = searchParams.get("toDate");
  if (toDateParam) {
    toDate = new Date(toDateParam);
    if (isNaN(toDate.getTime())) toDate = undefined;
  }

  try {
    const exportData = await AllocatorAuditExportService.export({
      workspaceId: workspace.id,
      format,
      campaignId,
      correlationId,
      decisionType,
      executionId,
      startDate: fromDate,
      endDate: toDate,
    });

    const headers = new Headers();
    headers.set("Content-Type", exportData.mimeType);
    headers.set("Content-Disposition", `attachment; filename="${exportData.filename}"`);

    return new NextResponse(exportData.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error exporting allocator audit logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
