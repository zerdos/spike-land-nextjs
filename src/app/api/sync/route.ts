/**
 * Sync API Route
 *
 * POST /api/sync - Manually trigger BridgeMind -> GitHub Projects V2 sync
 *
 * Protected by AGENT_API_KEY (Bearer token) for agent-initiated syncs.
 */

import { verifyAgentAuth } from "@/lib/auth/agent";
import { syncBridgeMindToGitHub } from "@/lib/sync/bridgemind-github-sync";
import { createBridgeMindClient, createGitHubProjectsClient } from "@/lib/sync/create-sync-clients";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!verifyAgentAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bridgemind = createBridgeMindClient();
  const github = createGitHubProjectsClient();

  if (!bridgemind.isAvailable()) {
    return NextResponse.json(
      { error: "BridgeMind is not configured" },
      { status: 503 },
    );
  }

  if (!github.isAvailable()) {
    return NextResponse.json(
      { error: "GitHub Projects is not configured" },
      { status: 503 },
    );
  }

  const { data: result, error } = await tryCatch(
    syncBridgeMindToGitHub({ bridgemind, github }),
  );

  if (error) {
    console.error("Sync failed:", error);
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
