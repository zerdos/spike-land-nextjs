/**
 * Browse Images for Gallery API Route
 *
 * Browse user images with completed enhancement jobs for gallery selection (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { browseQuerySchema } from "@/lib/types/gallery";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import type { ZodError } from "zod";

export async function GET(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to browse images:", authError);
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
    console.error("Failed to browse images:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);

  // Validate query parameters with Zod
  // Use || undefined so that .default() is applied when param is missing (null from get())
  const { data: validatedQuery, error: validationError } = await tryCatch(
    Promise.resolve().then(() =>
      browseQuerySchema.parse({
        page: searchParams.get("page") || undefined,
        limit: searchParams.get("limit") || undefined,
        userId: searchParams.get("userId") || undefined,
        shareToken: searchParams.get("shareToken") || undefined,
      })
    ),
  );

  if (validationError) {
    console.error("Failed to browse images:", validationError);
    const zodError = validationError as unknown as ZodError;
    if (zodError.issues) {
      return NextResponse.json(
        { error: "Validation failed", details: zodError.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const where: {
    userId?: string;
    shareToken?: string;
    enhancementJobs?: {
      some: {
        status: JobStatus;
      };
    };
  } = {
    enhancementJobs: {
      some: {
        status: JobStatus.COMPLETED,
      },
    },
  };

  if (validatedQuery.userId) {
    where.userId = validatedQuery.userId;
  }

  if (validatedQuery.shareToken) {
    where.shareToken = validatedQuery.shareToken;
  }

  const { data: queryResult, error: queryError } = await tryCatch(
    Promise.all([
      prisma.enhancedImage.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          enhancementJobs: {
            where: {
              status: JobStatus.COMPLETED,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10, // Limit to prevent N+1 query pattern
            select: {
              id: true,
              tier: true,
              enhancedUrl: true,
              enhancedWidth: true,
              enhancedHeight: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit,
      }),
      prisma.enhancedImage.count({ where }),
    ]),
  );

  if (queryError) {
    console.error("Failed to browse images:", queryError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const [images, total] = queryResult;

  return NextResponse.json({
    images: images.map((image) => ({
      id: image.id,
      name: image.name,
      description: image.description,
      originalUrl: image.originalUrl,
      originalWidth: image.originalWidth,
      originalHeight: image.originalHeight,
      isPublic: image.isPublic,
      shareToken: image.shareToken,
      createdAt: image.createdAt.toISOString(),
      user: image.user,
      enhancementJobs: image.enhancementJobs.map((job) => ({
        id: job.id,
        tier: job.tier,
        enhancedUrl: job.enhancedUrl,
        enhancedWidth: job.enhancedWidth,
        enhancedHeight: job.enhancedHeight,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      })),
    })),
    pagination: {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      total,
      pages: Math.ceil(total / validatedQuery.limit),
    },
  });
}
