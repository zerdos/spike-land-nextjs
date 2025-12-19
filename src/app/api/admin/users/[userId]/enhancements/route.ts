/**
 * User Enhancement History API Route
 *
 * Get enhancement history for a specific user.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

async function handleGetUserEnhancements(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; }>; },
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, {
      status: 400,
    });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
    MAX_LIMIT,
  );

  if (page < 1 || limit < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [total, enhancements] = await Promise.all([
    prisma.imageEnhancementJob.count({
      where: { userId },
    }),
    prisma.imageEnhancementJob.findMany({
      where: { userId },
      include: {
        image: {
          select: {
            id: true,
            name: true,
            originalUrl: true,
            originalWidth: true,
            originalHeight: true,
            originalFormat: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    user,
    enhancements: enhancements.map((job) => ({
      id: job.id,
      tier: job.tier,
      status: job.status,
      tokenCost: job.tokensCost,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      processingStartedAt: job.processingStartedAt?.toISOString(),
      processingCompletedAt: job.processingCompletedAt?.toISOString(),
      resultUrl: job.enhancedUrl,
      image: job.image
        ? {
          id: job.image.id,
          name: job.image.name,
          originalUrl: job.image.originalUrl,
          width: job.image.originalWidth,
          height: job.image.originalHeight,
          format: job.image.originalFormat,
        }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string; }>; },
) {
  const { data, error } = await tryCatch(
    handleGetUserEnhancements(request, context),
  );

  if (error) {
    console.error("Failed to fetch user enhancements:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return data;
}
