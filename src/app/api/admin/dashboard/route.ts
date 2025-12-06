/**
 * Admin Dashboard Real-time Metrics API
 *
 * Provides real-time dashboard metrics for polling.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { JobStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const [
      totalUsers,
      adminCount,
      totalEnhancements,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      totalTokensPurchased,
      totalTokensSpent,
      activeVouchers,
    ] = await Promise.all([
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
      prisma.tokenTransaction.aggregate({
        where: {
          type: {
            in: ["EARN_PURCHASE", "EARN_BONUS", "EARN_REGENERATION"],
          },
        },
        _sum: { amount: true },
      }),
      prisma.tokenTransaction.aggregate({
        where: { type: "SPEND_ENHANCEMENT" },
        _sum: { amount: true },
      }),
      prisma.voucher.count({
        where: { status: "ACTIVE" },
      }),
    ]);

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
      totalTokensPurchased: totalTokensPurchased._sum.amount || 0,
      totalTokensSpent: Math.abs(totalTokensSpent._sum.amount || 0),
      activeVouchers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch dashboard metrics:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
