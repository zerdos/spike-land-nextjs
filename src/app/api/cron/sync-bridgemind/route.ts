/**
 * BridgeMind Sync Cron Job
 *
 * GET /api/cron/sync-bridgemind - Vercel cron-triggered sync
 *
 * Runs on a schedule to keep GitHub Projects V2 in sync with BridgeMind.
 * Protected by CRON_SECRET header validation.
 */

import { syncBridgeMindToGitHub } from "@/lib/sync/bridgemind-github-sync";
import { createBridgeMindClient, createGitHubProjectsClient } from "@/lib/sync/create-sync-clients";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * Validate the cron secret header
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") {
      return true;
    }
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === cronSecret;
  }

  const cronSecretHeader = request.headers.get("x-cron-secret");
  return cronSecretHeader === cronSecret;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const bridgemind = createBridgeMindClient();
  const github = createGitHubProjectsClient();

  if (!bridgemind.isAvailable() || !github.isAvailable()) {
    return NextResponse.json({
      success: true,
      message: "Sync skipped: BridgeMind or GitHub not configured",
      timestamp: new Date().toISOString(),
    });
  }

  const { data: result, error } = await tryCatch(
    syncBridgeMindToGitHub({ bridgemind, github }),
  );

  if (error) {
    console.error("Cron sync-bridgemind failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: result.success,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors,
    durationMs: result.durationMs,
    timestamp: new Date().toISOString(),
  });
}
