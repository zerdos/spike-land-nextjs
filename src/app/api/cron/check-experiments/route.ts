/**
 * Experiment Auto-Winner Selection Cron Route
 * Epic #516
 *
 * GET /api/cron/check-experiments
 *
 * Automatically triggered by Vercel Cron every hour.
 * Processes running experiments with auto-winner enabled to select winners
 * when statistical significance criteria are met.
 *
 * This endpoint is protected by Vercel's cron secret to prevent unauthorized access.
 */

import { processAutoWinnerSelection } from "@/lib/hypothesis-agent/core/auto-winner-processor";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process experiments with auto-winner enabled
  const { data: result, error } = await tryCatch(processAutoWinnerSelection(50));

  if (error) {
    console.error("Experiment auto-winner cron failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Auto-winner processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }

  // Log summary for monitoring
  if (result.winnersSelected > 0 || result.errors.length > 0) {
    console.log(
      `[check-experiments] Processed ${result.totalChecked} experiments: ` +
        `${result.winnersSelected} winners selected, ${result.stillRunning} still running, ` +
        `${result.errors.length} errors`
    );

    if (result.errors.length > 0) {
      console.error("[check-experiments] Errors:", result.errors);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    result: {
      totalChecked: result.totalChecked,
      winnersSelected: result.winnersSelected,
      stillRunning: result.stillRunning,
      errorCount: result.errors.length,
      errors: result.errors,
    },
  });
}
