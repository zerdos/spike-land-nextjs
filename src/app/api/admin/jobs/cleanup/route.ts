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
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Jobs cleanup failed:", authError);
    return NextResponse.json(
      {
        error: "Failed to cleanup stuck jobs",
        details: authError.message,
      },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Require admin role
  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: "Failed to cleanup stuck jobs",
        details: adminError instanceof Error
          ? adminError.message
          : "Internal Server Error",
      },
      { status: 500 },
    );
  }

  // Parse request body for options
  const { data: body } = await tryCatch(request.json());
  const options: CleanupOptions = body
    ? {
      timeoutMs: body.timeoutMs,
      dryRun: body.dryRun,
      batchSize: body.batchSize,
    }
    : {};

  // Run cleanup
  const { data: result, error: cleanupError } = await tryCatch(
    cleanupStuckJobs(options),
  );

  if (cleanupError) {
    console.error("Jobs cleanup failed:", cleanupError);
    return NextResponse.json(
      {
        error: "Failed to cleanup stuck jobs",
        details: cleanupError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    result,
    message: result.cleanedUp > 0
      ? `Successfully cleaned up ${result.cleanedUp} stuck jobs and refunded ${result.tokensRefunded} tokens`
      : result.totalFound > 0 && options.dryRun
      ? `Dry run: Found ${result.totalFound} stuck jobs (no changes made)`
      : "No stuck jobs found",
  });
}
