/**
 * Admin Dashboard Real-time Metrics API
 *
 * Provides real-time dashboard metrics for polling.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to fetch dashboard metrics:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { data: metricsData, error: metricsError } = await tryCatch(
    Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          OR: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
        },
      }),
      prisma.imageEnhancementJob.count(),
      prisma.imageEnhancementJob.count({
        where: { status: JobStatus.PENDING },
      }),
      prisma.imageEnhancementJob.count({
        where: { status: JobStatus.PROCESSING },
      }),
      prisma.imageEnhancementJob.count({
        where: { status: JobStatus.COMPLETED },
      }),
      prisma.imageEnhancementJob.count({
        where: { status: JobStatus.FAILED },
      }),
      prisma.workspace.aggregate({
        _sum: { monthlyAiCredits: true },
      }),
      prisma.workspace.aggregate({
        _sum: { usedAiCredits: true },
      }),
      prisma.workspace.count(),
    ]),
  );

  if (metricsError) {
    console.error("Failed to fetch dashboard metrics:", metricsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const [
    totalUsers,
    adminCount,
    totalEnhancements,
    pendingJobs,
    processingJobs,
    completedJobs,
    failedJobs,
    creditsAllocated,
    creditsUsed,
    totalWorkspaces,
  ] = metricsData;

  return NextResponse.json({
    totalUsers,
    adminCount,
    totalEnhancements,
    jobStatus: {
      pending: pendingJobs,
      processing: processingJobs,
      completed: completedJobs,
      failed: failedJobs,
      active: pendingJobs + processingJobs,
    },
    totalCreditsAllocated: creditsAllocated._sum.monthlyAiCredits || 0,
    totalCreditsUsed: creditsUsed._sum.usedAiCredits || 0,
    totalWorkspaces,
    timestamp: new Date().toISOString(),
  });
}
