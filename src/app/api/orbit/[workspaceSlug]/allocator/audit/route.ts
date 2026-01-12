import { auth } from "@/auth";
import { allocatorAuditLogger } from "@/lib/allocator/allocator-audit-logger";
import prisma from "@/lib/prisma";
import type { AllocatorDecisionType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

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
    const result = await allocatorAuditLogger.search({
      workspaceId: workspace.id,
      campaignId,
      correlationId,
      decisionType,
      executionId,
      startDate: fromDate,
      endDate: toDate,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.logs,
      meta: {
        total: result.total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching allocator audit logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
