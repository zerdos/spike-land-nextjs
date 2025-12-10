/**
 * Admin Jobs API
 *
 * GET endpoint for fetching job listings with filtering, pagination, and search.
 * Admin-only access.
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES: JobStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isAdminByUserId(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as JobStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    // Build where clause
    const where: {
      status?: JobStatus;
      OR?: Array<
        { id: { contains: string; }; } | {
          user: { email: { contains: string; mode: "insensitive"; }; };
        }
      >;
    } = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Get jobs with pagination
    const [jobs, total, statusCounts] = await Promise.all([
      prisma.imageEnhancementJob.findMany({
        where,
        include: {
          image: {
            select: {
              id: true,
              name: true,
              originalUrl: true,
              originalWidth: true,
              originalHeight: true,
              originalSizeBytes: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.imageEnhancementJob.count({ where }),
      // Get counts for all statuses for the tab badges
      prisma.imageEnhancementJob.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    // Transform status counts to a map
    const statusCountsMap: Record<string, number> = {};
    for (const item of statusCounts) {
      statusCountsMap[item.status] = item._count.status;
    }

    // Calculate total count across all statuses
    const totalAll = Object.values(statusCountsMap).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: {
        ALL: totalAll,
        ...statusCountsMap,
      },
    });
  } catch (error) {
    console.error("[Admin Jobs API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
