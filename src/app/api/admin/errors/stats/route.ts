/**
 * GET /api/admin/errors/stats
 *
 * Returns quick stats for error dashboard overview.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth(), {
    report: false,
  });

  if (authError) {
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

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);

  const { data, error } = await tryCatch(
    Promise.all([
      // Last hour count
      prisma.errorLog.count({
        where: { timestamp: { gte: oneHourAgo } },
      }),
      // Last 24h count
      prisma.errorLog.count({
        where: { timestamp: { gte: twentyFourHoursAgo } },
      }),
      // Previous 24h count (for trend calculation)
      prisma.errorLog.count({
        where: {
          timestamp: {
            gte: fortyEightHoursAgo,
            lt: twentyFourHoursAgo,
          },
        },
      }),
      // Top files (last 24h)
      prisma.errorLog.groupBy({
        by: ["sourceFile"],
        _count: { sourceFile: true },
        where: {
          timestamp: { gte: twentyFourHoursAgo },
          sourceFile: { not: null },
        },
        orderBy: { _count: { sourceFile: "desc" } },
        take: 5,
      }),
      // Top error types (last 24h)
      prisma.errorLog.groupBy({
        by: ["errorType"],
        _count: { errorType: true },
        where: {
          timestamp: { gte: twentyFourHoursAgo },
          errorType: { not: null },
        },
        orderBy: { _count: { errorType: "desc" } },
        take: 5,
      }),
      // Frontend vs Backend breakdown (last 24h)
      prisma.errorLog.groupBy({
        by: ["environment"],
        _count: { environment: true },
        where: { timestamp: { gte: twentyFourHoursAgo } },
      }),
    ]),
    { report: false },
  );

  if (error) {
    console.error("[Admin Error Stats API] Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const [
    lastHour,
    last24h,
    previous24h,
    topFiles,
    topErrors,
    byEnvironment,
  ] = data;

  // Calculate trend
  let trend: "up" | "down" | "stable" = "stable";
  if (previous24h > 0) {
    const change = (last24h - previous24h) / previous24h;
    if (change > 0.1) trend = "up";
    else if (change < -0.1) trend = "down";
  } else if (last24h > 0) {
    trend = "up";
  }

  return NextResponse.json({
    lastHour,
    last24h,
    previous24h,
    trend,
    topFiles: topFiles.map((f) => ({
      file: f.sourceFile,
      count: f._count.sourceFile,
    })),
    topErrors: topErrors.map((e) => ({
      type: e.errorType,
      count: e._count.errorType,
    })),
    byEnvironment: Object.fromEntries(
      byEnvironment.map((e) => [e.environment, e._count.environment]),
    ),
    timestamp: new Date().toISOString(),
  });
}
