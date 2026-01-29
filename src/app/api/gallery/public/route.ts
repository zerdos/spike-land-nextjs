/**
 * Public Gallery API Route
 *
 * Returns all public images from all users with optional filtering by tags and tier.
 * Used for the public gallery browser page (no authentication required).
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus, type EnhancementTier } from "@prisma/client";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

// Cache for 5 minutes, stale-while-revalidate for 10 minutes
export const revalidate = 300;

interface PublicGalleryItem {
  id: string;
  name: string;
  description: string | null;
  originalUrl: string;
  enhancedUrl: string;
  width: number;
  height: number;
  tier: EnhancementTier;
  tags: string[];
  createdAt: string;
  userName: string | null;
}

interface GalleryResponse {
  items: PublicGalleryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * GET /api/gallery/public?page=1&limit=20&tags=landscape,sunset&tier=TIER_2K
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  // Parse query parameters
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const tagsParam = searchParams.get("tags");
  const tierParam = searchParams.get("tier");

  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const tier = tierParam as EnhancementTier | undefined;

  // Build where clause
  const where: {
    isPublic: boolean;
    tags?: { hasSome: string[] };
    enhancementJobs?: {
      some: {
        tier: EnhancementTier;
        status: typeof JobStatus.COMPLETED;
      };
    };
  } = {
    isPublic: true,
  };

  // Add tag filtering if tags provided
  if (tags.length > 0) {
    where.tags = {
      hasSome: tags,
    };
  }

  // Add tier filtering if provided
  if (tier && ["FREE", "TIER_1K", "TIER_2K", "TIER_4K"].includes(tier)) {
    where.enhancementJobs = {
      some: {
        tier,
        status: JobStatus.COMPLETED,
      },
    };
  }

  // Get total count for pagination
  const { data: total, error: countError } = await tryCatch(
    prisma.enhancedImage.count({ where })
  );

  if (countError) {
    console.error("Failed to count public images:", countError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  // Fetch images with pagination
  const { data: images, error: imagesError } = await tryCatch(
    prisma.enhancedImage.findMany({
      where,
      include: {
        enhancementJobs: {
          where: { status: JobStatus.COMPLETED },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })
  );

  if (imagesError) {
    console.error("Failed to fetch public images:", imagesError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  // Transform to response format
  const items: PublicGalleryItem[] = [];

  for (const image of images || []) {
    const latestJob = image.enhancementJobs[0];

    // Skip if no completed enhancement job
    if (!latestJob) {
      continue;
    }

    // Skip if no enhanced URL available
    if (!latestJob.enhancedUrl || !latestJob.enhancedWidth || !latestJob.enhancedHeight) {
      continue;
    }

    items.push({
      id: image.id,
      name: image.name,
      description: image.description,
      originalUrl: image.originalUrl,
      enhancedUrl: latestJob.enhancedUrl,
      width: latestJob.enhancedWidth,
      height: latestJob.enhancedHeight,
      tier: latestJob.tier,
      tags: image.tags,
      createdAt: image.createdAt.toISOString(),
      userName: image.user.name,
    });
  }

  const response: GalleryResponse = {
    items,
    pagination: {
      page,
      limit,
      total: total || 0,
      hasMore: (page * limit) < (total || 0),
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
