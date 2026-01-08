/**
 * Social Media Anomaly Detection API
 *
 * GET /api/admin/social/anomalies - Get recent anomalies for a workspace
 * POST /api/admin/social/anomalies - Trigger anomaly detection for a workspace
 *
 * Resolves #647
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { detectAnomalies, getRecentAnomalies, storeAnomaly } from "@/lib/social/anomaly-detection";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Get recent anomalies for a workspace
 */
export async function GET(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error &&
      adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 },
    );
  }

  const { data: anomalies, error } = await tryCatch(
    getRecentAnomalies(workspaceId, limit),
  );

  if (error) {
    console.error("[AnomalyAPI] Failed to get recent anomalies:", error);
    return NextResponse.json(
      { error: "Failed to fetch anomalies" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    anomalies,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Trigger anomaly detection for a workspace
 */
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error &&
      adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError || !body?.workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 },
    );
  }

  const { workspaceId, config } = body;

  console.log("[AnomalyAPI] Starting anomaly detection for workspace:", workspaceId);

  const { data: result, error } = await tryCatch(
    detectAnomalies(workspaceId, config),
  );

  if (error) {
    console.error("[AnomalyAPI] Anomaly detection failed:", error);
    return NextResponse.json(
      { error: "Anomaly detection failed" },
      { status: 500 },
    );
  }

  // Store detected anomalies
  let storedCount = 0;
  const storeErrors: { index: number; error: string; }[] = [];
  let anomalyIndex = 0;

  for (const anomaly of result.anomalies) {
    const { error: storeError } = await tryCatch(storeAnomaly(anomaly));
    if (storeError) {
      console.error("[AnomalyAPI] Failed to store anomaly:", storeError);
      storeErrors.push({
        index: anomalyIndex,
        error: storeError instanceof Error
          ? storeError.message
          : String(storeError),
      });
    } else {
      storedCount += 1;
    }
    anomalyIndex += 1;
  }

  const responseStatus = storeErrors.length > 0 ? 207 : 200;

  console.log(
    `[AnomalyAPI] Detection completed: ${result.anomalies.length} anomalies found in ${result.durationMs}ms`,
  );

  return NextResponse.json(
    {
      success: true,
      result: {
        analyzedAccounts: result.analyzedAccounts,
        anomalyCount: result.anomalies.length,
        criticalCount: result.anomalies.filter((a) => a.severity === "critical")
          .length,
        warningCount: result.anomalies.filter((a) => a.severity === "warning")
          .length,
        durationMs: result.durationMs,
      },
      anomalies: result.anomalies,
      storeSummary: {
        storedCount,
        failedCount: storeErrors.length,
        errors: storeErrors,
      },
      timestamp: new Date().toISOString(),
    },
    { status: responseStatus },
  );
}
