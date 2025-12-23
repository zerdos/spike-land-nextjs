/**
 * GET /api/admin/errors
 *
 * Returns paginated error logs for admin dashboard with filtering.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { ErrorEnvironment, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { data: session, error: authError } = await tryCatch(auth());

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

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
  );
  const search = searchParams.get("search") || "";
  const sourceFile = searchParams.get("sourceFile") || "";
  const errorType = searchParams.get("errorType") || "";
  const environment = searchParams.get("environment") as
    | ErrorEnvironment
    | null;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build where clause
  const where: Prisma.ErrorLogWhereInput = {};

  // Text search using ILIKE
  if (search) {
    where.OR = [
      { message: { contains: search, mode: "insensitive" } },
      { sourceFile: { contains: search, mode: "insensitive" } },
      { stack: { contains: search, mode: "insensitive" } },
      { callerName: { contains: search, mode: "insensitive" } },
    ];
  }

  // Filter by source file
  if (sourceFile) {
    where.sourceFile = { contains: sourceFile, mode: "insensitive" };
  }

  // Filter by error type
  if (errorType) {
    where.errorType = { contains: errorType, mode: "insensitive" };
  }

  // Filter by environment
  if (environment && ["FRONTEND", "BACKEND"].includes(environment)) {
    where.environment = environment;
  }

  // Filter by date range
  if (startDate) {
    where.timestamp = {
      ...((where.timestamp as Prisma.DateTimeFilter) || {}),
      gte: new Date(startDate),
    };
  }
  if (endDate) {
    where.timestamp = {
      ...((where.timestamp as Prisma.DateTimeFilter) || {}),
      lte: new Date(endDate),
    };
  }

  const { data, error } = await tryCatch(
    Promise.all([
      // Get errors with pagination
      prisma.errorLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // Get total count
      prisma.errorLog.count({ where }),
      // Get stats for last 24 hours
      prisma.errorLog.count({
        where: {
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      // Get error counts by type (last 24h)
      prisma.errorLog.groupBy({
        by: ["errorType"],
        _count: { errorType: true },
        where: {
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          errorType: { not: null },
        },
        orderBy: { _count: { errorType: "desc" } },
        take: 10,
      }),
      // Get error counts by file (last 24h)
      prisma.errorLog.groupBy({
        by: ["sourceFile"],
        _count: { sourceFile: true },
        where: {
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          sourceFile: { not: null },
        },
        orderBy: { _count: { sourceFile: "desc" } },
        take: 10,
      }),
    ]),
  );

  if (error) {
    console.error("[Admin Errors API] Failed to fetch errors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const [errors, total, total24h, errorsByType, errorsByFile] = data;

  return NextResponse.json({
    errors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      total24h,
      totalByType: Object.fromEntries(
        errorsByType.map((e) => [e.errorType, e._count.errorType]),
      ),
      totalByFile: Object.fromEntries(
        errorsByFile.map((e) => [e.sourceFile, e._count.sourceFile]),
      ),
    },
    timestamp: new Date().toISOString(),
  });
}

export async function DELETE() {
  const { data: session, error: authError } = await tryCatch(auth());

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

  const { data: result, error } = await tryCatch(
    prisma.errorLog.deleteMany({}),
  );

  if (error) {
    console.error("[Admin Errors API] Failed to delete errors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    deletedCount: result.count,
    message: `Deleted ${result.count} error logs`,
  });
}
