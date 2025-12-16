import prisma from "@/lib/prisma";
import { AlbumPrivacy, EnhancementTier, JobStatus } from "@prisma/client";

export interface FeaturedPhoto {
  id: string;
  title: string;
  originalUrl: string;
  enhancedUrl: string;
  width: number;
  height: number;
  albumName: string;
  tier: EnhancementTier;
}

// Landing page album ID - used to display featured photos on /pixel
const LANDING_PAGE_ALBUM_ID = "cmit2mns8000004k07oqi2fa3";

export async function getSuperAdminPublicPhotos(
  limit?: number,
): Promise<FeaturedPhoto[]> {
  // Fetch the specific landing page album by ID
  const publicAlbums = await prisma.album.findMany({
    where: {
      id: LANDING_PAGE_ALBUM_ID,
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
                  enhancedUrl: { not: null },
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

  const photos: FeaturedPhoto[] = [];

  for (const album of publicAlbums) {
    for (const albumImage of album.albumImages) {
      const latestJob = albumImage.image.enhancementJobs[0];

      if (
        latestJob?.enhancedUrl && latestJob.enhancedWidth &&
        latestJob.enhancedHeight
      ) {
        photos.push({
          id: albumImage.image.id,
          title: albumImage.image.name,
          originalUrl: albumImage.image.originalUrl,
          enhancedUrl: latestJob.enhancedUrl,
          width: latestJob.enhancedWidth,
          height: latestJob.enhancedHeight,
          albumName: album.name,
          tier: latestJob.tier,
        });

        if (limit && photos.length >= limit) {
          return photos;
        }
      }
    }
  }

  return photos;
}
