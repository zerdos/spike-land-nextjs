import { auth } from "@/auth";
import prisma from "@/lib/prisma";
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

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  try {
    const [byType, byOutcome, volume] = await Promise.all([
      prisma.allocatorAuditLog.groupBy({
        by: ["decisionType"],
        where: {
          workspaceId: workspace.id,
          createdAt: { gte: fromDate },
        },
        _count: true,
      }),
      prisma.allocatorAuditLog.groupBy({
        by: ["decisionOutcome"],
        where: {
          workspaceId: workspace.id,
          createdAt: { gte: fromDate },
        },
        _count: true,
      }),
      // For volume over time, we might need a raw query or just fetch dates and aggregate in code if volume is low.
      // Or just return total count for now.
      // Let's do a basic aggregation.
      prisma.allocatorAuditLog.findMany({
        where: {
          workspaceId: workspace.id,
          createdAt: { gte: fromDate },
        },
        select: { createdAt: true },
      }),
    ]);

    // Aggregate volume by day in memory (assuming not millions of logs per month yet)
    const volumeByDay: Record<string, number> = {};
    for (const log of volume) {
      const date = log.createdAt.toISOString().split("T")[0] as string;
      const current = volumeByDay[date] || 0;
      volumeByDay[date] = current + 1;
    }

    const volumeSeries = Object.entries(volumeByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      breakdown: {
        byType,
        byOutcome,
      },
      volume: volumeSeries,
      total: volume.length,
    });
  } catch (error) {
    console.error("Error fetching allocator audit metrics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
