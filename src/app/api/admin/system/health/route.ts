/**
 * System Health API Route
 *
 * Provides system health metrics including job processing and failure rates.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionResult = await tryCatch(auth());

  if (sessionResult.error) {
    console.error("Failed to authenticate:", sessionResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const session = sessionResult.data;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    const errorMessage = adminError instanceof Error
      ? adminError.message
      : "Unknown error";
    console.error("Admin check failed:", adminError);
    if (errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Get date ranges
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Jobs per hour (last 24 hours)
  const hourlyJobsResult = await tryCatch(
    prisma.$queryRaw<Array<{ hour: Date; count: bigint; }>>`
      SELECT DATE_TRUNC('hour', "createdAt") as hour, COUNT(*)::bigint as count
      FROM image_enhancement_jobs
      WHERE "createdAt" >= ${last24Hours}
      GROUP BY DATE_TRUNC('hour', "createdAt")
      ORDER BY hour ASC
    `,
  );

  if (hourlyJobsResult.error) {
    console.error("Failed to fetch hourly jobs:", hourlyJobsResult.error);
  }
  const hourlyJobs = hourlyJobsResult.data ?? [];

  // Average processing time by tier
  const avgProcessingTimeResult = await tryCatch(
    prisma.$queryRaw<Array<{ tier: string; avg_seconds: number; }>>`
      SELECT
        tier,
        AVG(EXTRACT(EPOCH FROM ("processingCompletedAt" - "processingStartedAt")))::float as avg_seconds
      FROM image_enhancement_jobs
      WHERE status = 'COMPLETED'
        AND "processingStartedAt" IS NOT NULL
        AND "processingCompletedAt" IS NOT NULL
        AND "createdAt" >= ${last7Days}
      GROUP BY tier
    `,
  );

  if (avgProcessingTimeResult.error) {
    console.error(
      "Failed to fetch average processing time:",
      avgProcessingTimeResult.error,
    );
  }
  const avgProcessingTime = avgProcessingTimeResult.data ?? [];

  // Failure rate by tier (last 7 days)
  const failuresByTierResult = await tryCatch(
    prisma.imageEnhancementJob.groupBy({
      by: ["tier", "status"],
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
      _count: true,
    }),
  );

  if (failuresByTierResult.error) {
    console.error(
      "Failed to fetch failures by tier:",
      failuresByTierResult.error,
    );
  }
  const failuresByTier = (failuresByTierResult.data ?? []) as Array<{
    tier: EnhancementTier;
    status: JobStatus;
    _count: number;
  }>;

  // Queue depth (pending + processing)
  const queueDepthResult = await tryCatch(
    prisma.imageEnhancementJob.count({
      where: {
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING],
        },
      },
    }),
  );

  if (queueDepthResult.error) {
    console.error("Failed to fetch queue depth:", queueDepthResult.error);
  }
  const queueDepth = queueDepthResult.data ?? 0;

  // Job status breakdown
  const jobsByStatusResult = await tryCatch(
    prisma.imageEnhancementJob.groupBy({
      by: ["status"],
      _count: true,
    }),
  );

  if (jobsByStatusResult.error) {
    console.error("Failed to fetch jobs by status:", jobsByStatusResult.error);
  }
  const jobsByStatus = (jobsByStatusResult.data ?? []) as Array<{
    status: JobStatus;
    _count: number;
  }>;

  // Recent failed jobs
  const recentFailuresResult = await tryCatch(
    prisma.imageEnhancementJob.findMany({
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
    }),
  );

  if (recentFailuresResult.error) {
    console.error(
      "Failed to fetch recent failures:",
      recentFailuresResult.error,
    );
  }
  const recentFailures = recentFailuresResult.data ?? [];

  // Calculate failure rates
  type FailureByTier = {
    tier: EnhancementTier;
    status: JobStatus;
    _count: number;
  };
  const tierStats = Object.values(EnhancementTier).map((tier) => {
    const tierJobs = Array.isArray(failuresByTier)
      ? failuresByTier.filter((f: FailureByTier) => f.tier === tier)
      : [];
    const total = tierJobs.reduce(
      (sum: number, j: FailureByTier) => sum + j._count,
      0,
    );
    const failed = tierJobs.find((j: FailureByTier) => j.status === JobStatus.FAILED)
      ?._count || 0;
    return {
      tier,
      total,
      failed,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    };
  });

  return NextResponse.json({
    hourlyJobs: Array.isArray(hourlyJobs)
      ? hourlyJobs.map((row: { hour: Date; count: bigint; }) => ({
        hour: row.hour.toISOString(),
        count: Number(row.count),
      }))
      : [],
    avgProcessingTime: Array.isArray(avgProcessingTime)
      ? avgProcessingTime.map((row: { tier: string; avg_seconds: number; }) => ({
        tier: row.tier,
        seconds: Math.round(row.avg_seconds || 0),
      }))
      : [],
    tierStats,
    queueDepth,
    jobsByStatus: Array.isArray(jobsByStatus)
      ? jobsByStatus.map((item: { status: JobStatus; _count: number; }) => ({
        status: item.status,
        count: item._count,
      }))
      : [],
    recentFailures: Array.isArray(recentFailures)
      ? recentFailures.map(
        (job: {
          id: string;
          tier: EnhancementTier;
          errorMessage: string | null;
          createdAt: Date;
        }) => ({
          id: job.id,
          tier: job.tier,
          error: job.errorMessage,
          timestamp: job.createdAt.toISOString(),
        }),
      )
      : [],
  });
}
