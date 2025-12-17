/**
 * Data Retention Cleanup Cron Job
 *
 * GET /api/cron/cleanup-tracking - Clean up old tracking data
 *
 * This endpoint is designed to be called by Vercel Cron daily at 3 AM.
 * It deletes tracking data older than 90 days to comply with data retention policies:
 * - visitor_sessions
 * - page_views
 * - analytics_events
 *
 * Note: campaign_attributions are kept for long-term ROI analysis.
 *
 * Security: Protected by CRON_SECRET header validation
 */

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const RETENTION_DAYS = 90;

interface CleanupStats {
  visitorSessions: number;
  pageViews: number;
  analyticsEvents: number;
  metricsCache: number;
}

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
 * Clean up old tracking data
 */
async function cleanupTrackingData(): Promise<CleanupStats> {
  const cutoffDate = getCutoffDate();

  console.log(`Cleanup: Deleting data older than ${cutoffDate.toISOString()}`);

  // Delete page views first (depends on sessions)
  const pageViewsResult = await prisma.pageView.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  // Delete analytics events (depends on sessions)
  const analyticsEventsResult = await prisma.analyticsEvent.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  // Delete visitor sessions
  // Only delete sessions that have no remaining page views or events
  // (i.e., sessions where all related data has been cleaned up)
  const visitorSessionsResult = await prisma.visitorSession.deleteMany({
    where: {
      sessionStart: {
        lt: cutoffDate,
      },
      // Ensure session has no remaining page views or events
      pageViews: {
        none: {},
      },
      events: {
        none: {},
      },
    },
  });

  // Also clean up expired metrics cache
  const metricsCacheResult = await prisma.campaignMetricsCache.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return {
    visitorSessions: visitorSessionsResult.count,
    pageViews: pageViewsResult.count,
    analyticsEvents: analyticsEventsResult.count,
    metricsCache: metricsCacheResult.count,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate cron secret
    if (!validateCronSecret(request)) {
      console.error("Cleanup tracking cron: Invalid or missing CRON_SECRET");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("Cleanup tracking cron: Starting cleanup...");

    // Run the cleanup
    const stats = await cleanupTrackingData();

    const duration = Date.now() - startTime;
    const totalDeleted = stats.visitorSessions +
      stats.pageViews +
      stats.analyticsEvents +
      stats.metricsCache;

    const response = {
      success: true,
      retentionDays: RETENTION_DAYS,
      deleted: stats,
      totalDeleted,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `Cleanup tracking cron: Completed. Deleted ${totalDeleted} records in ${duration}ms`,
      stats,
    );

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("Cleanup tracking cron: Failed", error);

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
