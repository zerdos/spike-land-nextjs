/**
 * Admin Jobs Cleanup API Route
 *
 * POST /api/admin/jobs/cleanup
 *
 * Manually trigger cleanup of stuck enhancement jobs.
 * Admin-only endpoint that finds and cleans up jobs stuck in PROCESSING state.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { type CleanupOptions, cleanupStuckJobs } from "@/lib/jobs/cleanup";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require admin role
    await requireAdminByUserId(session.user.id);

    // Parse request body for options
    let options: CleanupOptions = {};
    try {
      const body = await request.json();
      options = {
        timeoutMs: body.timeoutMs,
        dryRun: body.dryRun,
        batchSize: body.batchSize,
      };
    } catch {
      // Use defaults if no body or invalid JSON
      options = {};
    }

    // Run cleanup
    const result = await cleanupStuckJobs(options);

    return NextResponse.json({
      success: true,
      result,
      message: result.cleanedUp > 0
        ? `Successfully cleaned up ${result.cleanedUp} stuck jobs and refunded ${result.tokensRefunded} tokens`
        : result.totalFound > 0 && options.dryRun
        ? `Dry run: Found ${result.totalFound} stuck jobs (no changes made)`
        : "No stuck jobs found",
    });
  } catch (error) {
    console.error("Jobs cleanup failed:", error);

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Failed to cleanup stuck jobs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
