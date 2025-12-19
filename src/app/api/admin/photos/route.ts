/**
 * Admin Photos API Route
 *
 * View all uploaded photos with pagination and filtering.
 * VIEW-ONLY mode - no delete/manage actions.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const CUID_PATTERN = /^(c[a-z0-9]{24}|user_[a-f0-9]+)$/;

export async function GET(request: NextRequest) {
  // Authenticate user
  const authResult = await tryCatch(auth());

  if (authResult.error) {
    console.error("Failed to authenticate:", authResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const session = authResult.data;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin access
  const adminResult = await tryCatch(requireAdminByUserId(session.user.id));

  if (adminResult.error) {
    const errorMessage = adminResult.error instanceof Error
      ? adminResult.error.message
      : "Access denied";
    if (errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    console.error("Admin check failed:", adminResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
    MAX_LIMIT,
  );
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Validate pagination
  if (page < 1 || limit < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters" },
      { status: 400 },
    );
  }

  // Validate userId format
  if (userId && !CUID_PATTERN.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 },
    );
  }

  // Build where clause
  const where: {
    userId?: string;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate format" },
          { status: 400 },
        );
      }
      where.createdAt.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate format" },
          { status: 400 },
        );
      }
      where.createdAt.lte = end;
    }
  }

  // Get total count
  const countResult = await tryCatch(prisma.enhancedImage.count({ where }));

  if (countResult.error) {
    console.error("Failed to count photos:", countResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const total = countResult.data;

  // Get paginated images
  const imagesResult = await tryCatch(
    prisma.enhancedImage.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enhancementJobs: {
          select: {
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            enhancementJobs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
  );

  if (imagesResult.error) {
    console.error("Failed to fetch photos:", imagesResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const images = imagesResult.data;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    images: images.map((img) => ({
      id: img.id,
      name: img.name,
      originalUrl: img.originalUrl,
      thumbnailUrl: img.originalUrl,
      width: img.originalWidth,
      height: img.originalHeight,
      sizeBytes: img.originalSizeBytes,
      format: img.originalFormat,
      createdAt: img.createdAt.toISOString(),
      user: {
        id: img.user.id,
        name: img.user.name,
        email: img.user.email,
      },
      enhancementCount: img._count.enhancementJobs,
      latestJobStatus: img.enhancementJobs[0]?.status,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}
