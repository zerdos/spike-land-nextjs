/**
 * Admin Dashboard Home Page
 *
 * Overview page showing key metrics and quick links to admin sections.
 * Uses real-time polling for live job status updates.
 */

import { auth } from "@/auth";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import prisma from "@/lib/prisma";
import { JobStatus, UserRole } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function getDashboardMetrics() {
  try {
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
  } catch (error) {
    console.error("Failed to fetch dashboard metrics:", error);
    // Return default metrics so the dashboard still renders
    return {
      totalUsers: 0,
      adminCount: 0,
      totalEnhancements: 0,
      jobStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        active: 0,
      },
      totalTokensPurchased: 0,
      totalTokensSpent: 0,
      activeVouchers: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function AdminDashboard() {
  // Check for E2E bypass (middleware already validated the header)
  const headersList = await headers();
  const e2eBypassHeader = headersList.get("x-e2e-auth-bypass");
  const isE2EBypass = e2eBypassHeader && process.env.E2E_BYPASS_SECRET &&
    e2eBypassHeader === process.env.E2E_BYPASS_SECRET &&
    process.env.NODE_ENV !== "production";

  console.log("[AdminDashboard] E2E bypass check:", {
    isE2EBypass,
    hasHeader: !!e2eBypassHeader,
    hasSecret: !!process.env.E2E_BYPASS_SECRET,
    nodeEnv: process.env.NODE_ENV,
  });

  let session;
  try {
    session = await auth();
  } catch (error) {
    // Auth may fail with invalid JWT in E2E tests - continue as unauthenticated
    console.debug(
      "[AdminDashboard] Auth failed:",
      error instanceof Error ? error.message : String(error),
    );
    session = null;
  }

  // For E2E bypass, allow access with default metrics
  if (isE2EBypass && !session) {
    console.log("[AdminDashboard] E2E bypass active, showing dashboard with default metrics");
    const defaultMetrics = {
      totalUsers: 0,
      adminCount: 0,
      totalEnhancements: 0,
      jobStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        active: 0,
      },
      totalTokensPurchased: 0,
      totalTokensSpent: 0,
      activeVouchers: 0,
      timestamp: new Date().toISOString(),
    };
    return <AdminDashboardClient initialMetrics={defaultMetrics} />;
  }

  // For non-authenticated users, redirect to sign in
  if (!session?.user?.id) {
    console.log("[AdminDashboard] No session, redirecting to sign in");
    redirect("/auth/signin?callbackUrl=/admin");
  }

  // Check if user is admin
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
    console.warn("[AdminDashboard] Non-admin user attempted access:", session.user.id);
    redirect("/");
  }

  const metrics = await getDashboardMetrics();

  return <AdminDashboardClient initialMetrics={metrics} />;
}
