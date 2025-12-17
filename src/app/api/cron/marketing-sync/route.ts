/**
 * Marketing Sync Cron Job
 *
 * GET /api/cron/marketing-sync - Sync external campaign data from marketing platforms
 *
 * This endpoint is designed to be called by Vercel Cron on an hourly schedule.
 * It syncs campaign metrics from connected Facebook and Google Ads accounts
 * for ROI calculation.
 *
 * Security: Protected by CRON_SECRET header validation
 */

import { syncExternalCampaigns } from "@/lib/marketing/campaign-sync";
import { cleanupExpiredCache } from "@/lib/tracking/metrics-cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Validate the cron secret header
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, allow in development only
  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("CRON_SECRET not configured - allowing in development mode");
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate cron secret
    if (!validateCronSecret(request)) {
      console.error("Marketing sync cron: Invalid or missing CRON_SECRET");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("Marketing sync cron: Starting sync...");

    // Run the sync
    const syncResult = await syncExternalCampaigns();

    // Also cleanup expired cache entries
    const expiredCacheCleanedUp = await cleanupExpiredCache();

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      synced: syncResult.synced,
      errors: syncResult.errors,
      cacheCleanedUp: expiredCacheCleanedUp,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    if (syncResult.errors.length > 0) {
      console.warn(
        `Marketing sync cron: Completed with ${syncResult.errors.length} errors`,
        syncResult.errors,
      );
    } else {
      console.log(
        `Marketing sync cron: Completed successfully. Synced ${syncResult.synced} campaigns in ${duration}ms`,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("Marketing sync cron: Failed", error);

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
}
