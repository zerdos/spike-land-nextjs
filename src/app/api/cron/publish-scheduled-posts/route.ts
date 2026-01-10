/**
 * Scheduled Posts Publishing Cron Route
 *
 * GET /api/cron/publish-scheduled-posts
 *
 * Automatically triggered by Vercel Cron every minute.
 * Processes scheduled posts that are due for publishing.
 *
 * This endpoint is protected by Vercel's cron secret to prevent unauthorized access.
 *
 * Part of #576: Implement Calendar publishing
 */

import { processScheduledPosts } from "@/lib/calendar/publishing-service";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Process scheduled posts
  const { data: result, error } = await tryCatch(processScheduledPosts(50));

  if (error) {
    console.error("Scheduled posts publishing cron failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Publishing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  // Log summary for monitoring
  if (result.processedCount > 0) {
    console.log(
      `[publish-scheduled-posts] Processed ${result.processedCount} posts: ` +
        `${result.successCount} succeeded, ${result.partialSuccessCount} partial, ${result.failedCount} failed`,
    );
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    result: {
      processedCount: result.processedCount,
      successCount: result.successCount,
      partialSuccessCount: result.partialSuccessCount,
      failedCount: result.failedCount,
      errorCount: result.errors.length,
    },
  });
}
