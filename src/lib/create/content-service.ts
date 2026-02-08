import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { type CreatedApp, CreatedAppStatus } from "@prisma/client";

export type CreatedAppWithUser = CreatedApp & {
  generatedBy: { name: string | null; image: string | null; } | null;
};

export async function getCreatedApp(slug: string): Promise<CreatedAppWithUser | null> {
  return prisma.createdApp.findUnique({
    where: { slug },
    include: {
      generatedBy: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });
}

export async function markAsGenerating(
  slug: string,
  path: string[],
  title: string,
  description: string,
  codespaceId: string,
  codespaceUrl: string,
  promptUsed: string,
  userId?: string,
): Promise<CreatedApp> {
  return prisma.createdApp.upsert({
    where: { slug },
    update: {
      status: CreatedAppStatus.GENERATING,
      path,
      title,
      description,
      codespaceId,
      codespaceUrl,
      promptUsed,
      // Don't update generatedById on update if not provided, or should we?
      // For now, assume re-generation might change it? No, keep original creator usually.
      // But if it's a new generation, maybe we update.
      generatedAt: new Date(),
    },
    create: {
      slug,
      path,
      title,
      description,
      codespaceId,
      codespaceUrl,
      status: CreatedAppStatus.GENERATING,
      promptUsed,
      generatedById: userId,
      viewCount: 0,
    },
  });
}

export async function updateAppContent(
  slug: string,
  title: string,
  description: string,
): Promise<CreatedApp> {
  return prisma.createdApp.update({
    where: { slug },
    data: {
      title,
      description,
    },
  });
}

export async function updateAppStatus(
  slug: string,
  status: CreatedAppStatus,
  outgoingLinks?: string[],
): Promise<CreatedApp | null> {
  try {
    return await prisma.createdApp.update({
      where: { slug },
      data: {
        status,
        ...(outgoingLinks ? { outgoingLinks } : {}),
      },
    });
  } catch (error) {
    // P2025: Record not found — can happen if markAsGenerating() failed
    if (
      error instanceof Error
      && error.message.includes("Record to update not found")
    ) {
      logger.error(`Cannot update status for non-existent app: ${slug}`);
      return null;
    }
    throw error;
  }
}

export async function incrementViewCount(slug: string): Promise<void> {
  try {
    await prisma.createdApp.update({
      where: { slug },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    // Ignore error if app doesn't exist or other race condition
    logger.error(`Failed to increment view count for ${slug}:`, { error });
  }
}

export async function getTopApps(limit = 10): Promise<CreatedApp[]> {
  return prisma.createdApp.findMany({
    where: { status: CreatedAppStatus.PUBLISHED },
    orderBy: { viewCount: "desc" },
    take: limit,
  });
}

export async function getRecentApps(limit = 10): Promise<CreatedApp[]> {
  return prisma.createdApp.findMany({
    where: { status: CreatedAppStatus.PUBLISHED },
    orderBy: { generatedAt: "desc" },
    take: limit,
  });
}

export async function getRelatedPublishedApps(
  excludeSlug: string,
  limit = 6,
): Promise<CreatedApp[]> {
  return prisma.createdApp.findMany({
    where: {
      status: CreatedAppStatus.PUBLISHED,
      slug: { not: excludeSlug },
      codespaceId: { not: "" },
    },
    orderBy: { viewCount: "desc" },
    take: limit,
  });
}
