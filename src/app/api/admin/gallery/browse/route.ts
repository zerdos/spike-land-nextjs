/**
 * Browse Images for Gallery API Route
 *
 * Browse user images with completed enhancement jobs for gallery selection (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { browseQuerySchema } from "@/lib/types/gallery";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod
    // Use || undefined so that .default() is applied when param is missing (null from get())
    const validatedQuery = browseQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      userId: searchParams.get("userId") || undefined,
      shareToken: searchParams.get("shareToken") || undefined,
    });

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

    const [images, total] = await Promise.all([
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
    ]);

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
  } catch (error) {
    console.error("Failed to browse images:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
