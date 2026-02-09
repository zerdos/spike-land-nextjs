import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus } from "@prisma/client";

export interface PublicPhoto {
  id: string;
  name: string;
  originalUrl: string;
  enhancedUrl: string | null;
  width: number;
  height: number;
}

export async function getRecentPublicPhotos(
  limit = 100,
): Promise<PublicPhoto[]> {
  const { data: images, error } = await tryCatch(
    prisma.enhancedImage.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        originalUrl: true,
        originalWidth: true,
        originalHeight: true,
        enhancementJobs: {
          where: {
            status: JobStatus.COMPLETED,
            enhancedUrl: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { enhancedUrl: true },
        },
      },
    }),
  );

  if (error) {
    console.error(`Failed to fetch public photos: ${error.message}`);
    return [];
  }

  return images.map((image) => ({
    id: image.id,
    name: image.name,
    originalUrl: image.originalUrl,
    enhancedUrl: image.enhancementJobs[0]?.enhancedUrl ?? null,
    width: image.originalWidth,
    height: image.originalHeight,
  }));
}
