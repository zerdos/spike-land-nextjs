import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export interface AllocatorAuditMetricsResponse {
  breakdown: {
    byType: { decisionType: string; _count: number }[];
    byOutcome: { decisionOutcome: string; _count: number }[];
  };
  volume: { date: string; count: number }[];
  total: number;
}

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
      // Optimized volume query using findMany is still okay for moderate volume,
      // but strictly we should use raw query for time bucketing if volume is huge.
      // For now, fetching date only is better than full objects.
      prisma.allocatorAuditLog.findMany({
        where: {
          workspaceId: workspace.id,
          createdAt: { gte: fromDate },
        },
        select: { createdAt: true },
      }),
    ]);

    // Aggregate volume by day in memory
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
