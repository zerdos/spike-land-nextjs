/**
 * Admin Try-Catch Stats API
 *
 * Provides admin access to try-catch statistics.
 * GET: Fetch current stats
 * DELETE: Reset all stats
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { getStats, resetStats } from "@/lib/observability/try-catch-stats";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/try-catch-stats
 *
 * Fetches current try-catch statistics for the admin dashboard.
 */
export async function GET(): Promise<Response> {
  const { data: session, error: authError } = await tryCatch(auth(), {
    report: false,
  });

  if (authError) {
    console.error("[TryCatchStats API] Auth error:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
    { report: false },
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

  const { data: stats, error: statsError } = await tryCatch(getStats(), {
    report: false,
  });

  if (statsError) {
    console.error("[TryCatchStats API] Failed to get stats:", statsError);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }

  return NextResponse.json(stats);
}

/**
 * DELETE /api/admin/try-catch-stats
 *
 * Resets all try-catch statistics.
 */
export async function DELETE(): Promise<Response> {
  const { data: session, error: authError } = await tryCatch(auth(), {
    report: false,
  });

  if (authError) {
    console.error("[TryCatchStats API] Auth error:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
    { report: false },
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

  const { error: resetError } = await tryCatch(resetStats(), { report: false });

  if (resetError) {
    console.error("[TryCatchStats API] Failed to reset stats:", resetError);
    return NextResponse.json(
      { error: "Failed to reset stats" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Stats reset successfully" });
}
