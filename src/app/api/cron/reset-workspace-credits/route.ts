/**
 * Cron Workspace Credit Reset Route
 *
 * GET /api/cron/reset-workspace-credits
 *
 * Automatically triggered by Vercel Cron daily at midnight UTC.
 * Resets monthly AI credits for workspaces where the billing cycle anniversary is today.
 *
 * This endpoint is protected by Vercel's cron secret to prevent unauthorized access.
 */

import { WorkspaceSubscriptionService } from "@/lib/subscription/workspace-subscription";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  // Find workspaces with billing anniversary today
  const { data: workspaceIds, error: findError } = await tryCatch(
    WorkspaceSubscriptionService.findWorkspacesForCreditReset(),
  );

  if (findError) {
    console.error("Cron credit reset - failed to find workspaces:", findError);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to find workspaces",
        details: findError instanceof Error ? findError.message : String(findError),
      },
      { status: 500 },
    );
  }

  // Reset credits for each workspace
  const results = {
    total: workspaceIds.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const workspaceId of workspaceIds) {
    const { data: result, error } = await tryCatch(
      WorkspaceSubscriptionService.resetMonthlyCredits(workspaceId),
    );

    if (error || !result?.success) {
      results.failed++;
      results.errors.push(
        `${workspaceId}: ${
          error instanceof Error ? error.message : result?.error || "Unknown error"
        }`,
      );
    } else {
      results.success++;
    }
  }

  const durationMs = Date.now() - startTime;

  // Log results for monitoring
  console.log(
    `Cron credit reset completed: ${results.success}/${results.total} workspaces reset in ${durationMs}ms`,
  );

  if (results.errors.length > 0) {
    console.error("Cron credit reset errors:", results.errors);
  }

  return NextResponse.json({
    success: results.failed === 0,
    timestamp: new Date().toISOString(),
    durationMs,
    result: {
      totalFound: results.total,
      successfulResets: results.success,
      failedResets: results.failed,
      errorCount: results.errors.length,
    },
  });
}
