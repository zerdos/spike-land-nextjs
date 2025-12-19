/**
 * Error Log Cleanup Cron Job
 *
 * GET /api/cron/cleanup-errors - Clean up old error logs
 *
 * This endpoint is designed to be called by Vercel Cron daily at 4 AM.
 * It deletes error logs older than 30 days to prevent database bloat.
 *
 * Security: Protected by CRON_SECRET header validation
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

const RETENTION_DAYS = 30;

/**
 * Validate the cron secret header
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, allow in development only
  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "CRON_SECRET not configured - allowing in development mode",
      );
      return true;
    }
    return false;
  }

  const authHeader = request.headers.get("authorization");

  // Check Bearer token format
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === cronSecret;
  }

  // Also check x-cron-secret header (Vercel Cron uses this)
  const cronSecretHeader = request.headers.get("x-cron-secret");
  return cronSecretHeader === cronSecret;
}

/**
 * Calculate the cutoff date for data retention
 */
function getCutoffDate(days: number = RETENTION_DAYS): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

/**
 * Clean up old error logs
 */
async function cleanupErrorLogs(): Promise<{ errorLogs: number; }> {
  const cutoffDate = getCutoffDate();

  console.log(
    `Error cleanup: Deleting error logs older than ${cutoffDate.toISOString()}`,
  );

  const result = await prisma.errorLog.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  return {
    errorLogs: result.count,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Validate cron secret
  if (!validateCronSecret(request)) {
    console.error("Cleanup errors cron: Invalid or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Cleanup errors cron: Starting cleanup...");

  // Run the cleanup
  const { data: stats, error } = await tryCatch(cleanupErrorLogs(), {
    report: false, // Don't report errors from the error cleanup itself
  });

  if (error) {
    const duration = Date.now() - startTime;
    console.error("Cleanup errors cron: Failed", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  const duration = Date.now() - startTime;

  const response = {
    success: true,
    retentionDays: RETENTION_DAYS,
    deleted: stats,
    totalDeleted: stats.errorLogs,
    durationMs: duration,
    timestamp: new Date().toISOString(),
  };

  console.log(
    `Cleanup errors cron: Completed. Deleted ${stats.errorLogs} error logs in ${duration}ms`,
  );

  return NextResponse.json(response);
}
