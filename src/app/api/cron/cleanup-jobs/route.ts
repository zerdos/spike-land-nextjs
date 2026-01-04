/**
 * Cron Job Cleanup Route
 *
 * GET /api/cron/cleanup-jobs
 *
 * Automatically triggered by Vercel Cron every 15 minutes.
 * Cleans up stuck enhancement jobs and refunds tokens.
 *
 * This endpoint is protected by Vercel's cron secret to prevent unauthorized access.
 */

import { cleanupStuckJobs } from "@/lib/jobs/cleanup";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Run cleanup with default settings (5 minute timeout)
  const { data: result, error } = await tryCatch(cleanupStuckJobs());

  if (error) {
    console.error("Cron job cleanup failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    result: {
      totalFound: result.totalFound,
      cleanedUp: result.cleanedUp,
      failed: result.failed,
      tokensRefunded: result.tokensRefunded,
      errorCount: result.errors.length,
    },
  });
}
