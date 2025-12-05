/**
 * System Health API Route
 *
 * Provides system health metrics including job processing and failure rates.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    // Get date ranges
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Jobs per hour (last 24 hours)
    const hourlyJobs = await prisma.$queryRaw<
      Array<{ hour: Date; count: bigint; }>
    >`
      SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*)::bigint as count
      FROM image_enhancement_jobs
      WHERE created_at >= ${last24Hours}
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour ASC
    `;

    // Average processing time by tier
    const avgProcessingTime = await prisma.$queryRaw<
      Array<{ tier: string; avg_seconds: number; }>
    >`
      SELECT
        tier,
        AVG(EXTRACT(EPOCH FROM (processing_completed_at - processing_started_at)))::float as avg_seconds
      FROM image_enhancement_jobs
      WHERE status = 'COMPLETED'
        AND processing_started_at IS NOT NULL
        AND processing_completed_at IS NOT NULL
        AND created_at >= ${last7Days}
      GROUP BY tier
    `;

    // Failure rate by tier (last 7 days)
    const failuresByTier = await prisma.imageEnhancementJob.groupBy({
      by: ["tier", "status"],
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
      _count: true,
    });

    // Queue depth (pending + processing)
    const queueDepth = await prisma.imageEnhancementJob.count({
      where: {
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING],
        },
      },
    });

    // Job status breakdown
    const jobsByStatus = await prisma.imageEnhancementJob.groupBy({
      by: ["status"],
      _count: true,
    });

    // Recent failed jobs
    const recentFailures = await prisma.imageEnhancementJob.findMany({
      where: {
        status: JobStatus.FAILED,
        createdAt: {
          gte: last7Days,
        },
      },
      select: {
        id: true,
        tier: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Calculate failure rates
    type FailureByTier = { tier: EnhancementTier; status: JobStatus; _count: number; };
    const tierStats = Object.values(EnhancementTier).map((tier) => {
      const tierJobs = failuresByTier.filter((f: FailureByTier) => f.tier === tier);
      const total = tierJobs.reduce((sum: number, j: FailureByTier) => sum + j._count, 0);
      const failed = tierJobs.find((j: FailureByTier) => j.status === JobStatus.FAILED)?._count ||
        0;
      return {
        tier,
        total,
        failed,
        failureRate: total > 0 ? (failed / total) * 100 : 0,
      };
    });

    return NextResponse.json({
      hourlyJobs: hourlyJobs.map((row: { hour: Date; count: bigint; }) => ({
        hour: row.hour.toISOString(),
        count: Number(row.count),
      })),
      avgProcessingTime: avgProcessingTime.map((row: { tier: string; avg_seconds: number; }) => ({
        tier: row.tier,
        seconds: Math.round(row.avg_seconds),
      })),
      tierStats,
      queueDepth,
      jobsByStatus: jobsByStatus.map((item: { status: JobStatus; _count: number; }) => ({
        status: item.status,
        count: item._count,
      })),
      recentFailures: recentFailures.map((
        job: { id: string; tier: EnhancementTier; errorMessage: string | null; createdAt: Date; },
      ) => ({
        id: job.id,
        tier: job.tier,
        error: job.errorMessage,
        timestamp: job.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch system health:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
