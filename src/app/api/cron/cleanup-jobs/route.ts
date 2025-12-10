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
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
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
    const result = await cleanupStuckJobs();

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
  } catch (error) {
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
}
