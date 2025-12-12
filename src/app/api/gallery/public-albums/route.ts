/**
 * Public Albums Gallery API Route
 *
 * Returns before/after image pairs from PUBLIC albums owned by super admin.
 * Used for showcase galleries on public pages (no authentication required).
 */

import prisma from "@/lib/prisma";
import { AlbumPrivacy, EnhancementTier, JobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const SUPER_ADMIN_EMAIL = "zolika84@gmail.com";
const DEFAULT_LIMIT = 12;

// Cache for 5 minutes, stale-while-revalidate for 10 minutes
export const revalidate = 300;

interface PublicAlbumPhoto {
  id: string;
  title: string;
  originalUrl: string;
  enhancedUrl: string;
  width: number;
  height: number;
  albumName: string;
  tier: EnhancementTier;
}

export async function GET() {
  try {
    // 1. Find super admin user
    const superAdmin = await prisma.user.findFirst({
      where: {
        email: SUPER_ADMIN_EMAIL,
      },
      select: {
        id: true,
      },
    });

    if (!superAdmin) {
      return NextResponse.json(
        { error: "Super admin user not found" },
        { status: 404 },
      );
    }

    // 2. Get PUBLIC albums with enhanced images
    const albums = await prisma.album.findMany({
      where: {
        userId: superAdmin.id,
        privacy: AlbumPrivacy.PUBLIC,
      },
      include: {
        albumImages: {
          include: {
            image: {
              include: {
                enhancementJobs: {
                  where: {
                    status: JobStatus.COMPLETED,
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3. Transform data to response format
    const items: PublicAlbumPhoto[] = [];

    for (const album of albums) {
      for (const albumImage of album.albumImages) {
        const { image } = albumImage;

        // Only include images with completed enhancement jobs
        const latestJob = image.enhancementJobs[0];

        if (!latestJob) {
          continue;
        }

        // Skip if no enhanced URL available
        if (!latestJob.enhancedUrl || !latestJob.enhancedWidth || !latestJob.enhancedHeight) {
          continue;
        }

        items.push({
          id: image.id,
          title: image.name,
          originalUrl: image.originalUrl,
          enhancedUrl: latestJob.enhancedUrl,
          width: latestJob.enhancedWidth,
          height: latestJob.enhancedHeight,
          albumName: album.name,
          tier: latestJob.tier,
        });

        // Stop if we've reached the limit
        if (items.length >= DEFAULT_LIMIT) {
          break;
        }
      }

      // Stop if we've reached the limit
      if (items.length >= DEFAULT_LIMIT) {
        break;
      }
    }

    return NextResponse.json(
      {
        items,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch public album photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
