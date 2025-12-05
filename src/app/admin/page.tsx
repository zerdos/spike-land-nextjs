/**
 * Admin Dashboard Home Page
 *
 * Overview page showing key metrics and quick links to admin sections.
 * Uses real-time polling for live job status updates.
 */

import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import prisma from "@/lib/prisma";
import { JobStatus, UserRole } from "@prisma/client";

async function getDashboardMetrics() {
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
      _sum: {
        amount: true,
      },
    }),
    prisma.tokenTransaction.aggregate({
      where: {
        type: "SPEND_ENHANCEMENT",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.voucher.count({
      where: {
        status: "ACTIVE",
      },
    }),
  ]);

  return {
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
  };
}

export default async function AdminDashboard() {
  const metrics = await getDashboardMetrics();

  return <AdminDashboardClient initialMetrics={metrics} />;
}
