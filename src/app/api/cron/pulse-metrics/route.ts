/**
 * Pulse Metrics Collection Cron Job
 *
 * GET /api/cron/pulse-metrics
 *
 * Automatically triggered by Vercel Cron every 15 minutes.
 * Collects social media metrics from all active accounts
 * and stores them in the SocialMetrics table.
 *
 * This endpoint is protected by Vercel's cron secret.
 *
 * IMPORTANT: The 15-minute schedule (every 15 minutes) should be monitored
 * for potential rate limiting issues with social media APIs. Consider:
 * - Adjusting frequency based on the number of accounts monitored
 * - Implementing per-platform rate limit tracking
 * - Scaling back to 30-minute intervals if rate limits are reached
 *
 * Resolves #646
 */

import { collectPulseMetrics } from "@/lib/social/metrics-collector";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Validate the cron secret header
 *
 * Supports both:
 * - Bearer token (Authorization: Bearer <secret>)
 * - x-cron-secret header (Vercel Cron uses this)
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, allow in development only
  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[PulseMetrics] CRON_SECRET not configured - allowing in development mode",
      );
      return true;
    }
    return false;
  }

  // Check Authorization header (Bearer token format)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === cronSecret) {
      return true;
    }
  }

  // Also check x-cron-secret header (Vercel Cron uses this)
  const cronSecretHeader = request.headers.get("x-cron-secret");
  if (cronSecretHeader === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify the request is authorized
  if (!validateCronSecret(request)) {
    console.error("[PulseMetrics] Unauthorized cron request");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  console.log("[PulseMetrics] Starting metrics collection...");

  // Run the metrics collection
  const { data: result, error } = await tryCatch(collectPulseMetrics());

  if (error) {
    console.error("[PulseMetrics] Collection failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Metrics collection failed",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  console.log(
    `[PulseMetrics] Collection completed: ${result.successCount}/${result.totalAccounts} accounts processed in ${result.durationMs}ms`,
  );

  // Return summary (don't expose individual account results in response)
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    result: {
      totalAccounts: result.totalAccounts,
      successCount: result.successCount,
      failureCount: result.failureCount,
      skippedCount: result.skippedCount,
      durationMs: result.durationMs,
    },
  });
}
