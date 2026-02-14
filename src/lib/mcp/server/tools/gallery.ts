import { z } from "zod";
import type { ToolRegistry } from "../tool-registry";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { JobStatus, AlbumPrivacy, type EnhancementTier } from "@prisma/client";
import { safeToolCall, textResult } from "./tool-helpers";

const SUPER_ADMIN_EMAIL = process.env["SPIKE_LAND_SUPER_ADMIN_EMAIL"] || "zolika84@gmail.com";

const GalleryListSchema = z.object({
  activeOnly: z.boolean().optional().default(true),
});

const GalleryPublicSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().max(100).optional().default(20),
  tags: z.array(z.string()).optional().default([]),
  tier: z.string().optional(),
});

const GalleryPublicAlbumsSchema = z.object({
  limit: z.number().optional().default(12),
});

export function registerGalleryTools(registry: ToolRegistry, userId: string): void {
  registry.register({
    name: "gallery_list",
    description: "Returns active featured gallery items for the landing page",
    category: "gallery",
    tier: "free",
    inputSchema: GalleryListSchema.shape,
    handler: async ({ activeOnly }: z.infer<typeof GalleryListSchema>): Promise<CallToolResult> =>
      safeToolCall("gallery_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const items = await prisma.featuredGalleryItem.findMany({
          where: activeOnly ? { isActive: true } : {},
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            originalUrl: true,
            enhancedUrl: true,
            width: true,
            height: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        });

        return textResult(JSON.stringify({ items }));
      }, { userId, input: { activeOnly } }),
  });

  registry.register({
    name: "gallery_public",
    description: "Returns public gallery items with pagination and filters",
    category: "gallery",
    tier: "free",
    inputSchema: GalleryPublicSchema.shape,
    handler: async ({ page, limit, tags, tier }: z.infer<typeof GalleryPublicSchema>): Promise<CallToolResult> =>
      safeToolCall("gallery_public", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = {
          isPublic: true,
          ...(tags.length > 0 && { tags: { hasSome: tags } }),
          ...(tier && {
            enhancementJobs: {
              some: {
                tier: tier as EnhancementTier,
                status: JobStatus.COMPLETED,
              },
            },
          }),
        };

        const [images, total] = await Promise.all([
          prisma.enhancedImage.findMany({
            where,
            include: {
              enhancementJobs: {
                where: { status: JobStatus.COMPLETED },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              user: {
                select: { name: true, image: true },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.enhancedImage.count({ where }),
        ]);

        return textResult(JSON.stringify({
          items: images,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        }));
      }, { userId, input: { page, limit, tags, tier } }),
  });

  registry.register({
    name: "gallery_public_albums",
    description: "Returns before/after image pairs from PUBLIC albums owned by super admin",
    category: "gallery",
    tier: "free",
    inputSchema: GalleryPublicAlbumsSchema.shape,
    handler: async ({ limit }: z.infer<typeof GalleryPublicAlbumsSchema>): Promise<CallToolResult> =>
      safeToolCall("gallery_public_albums", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const superAdmin = await prisma.user.findFirst({
          where: { email: SUPER_ADMIN_EMAIL },
          select: { id: true },
        });

        if (!superAdmin) {
          throw new Error("Super admin user not found");
        }

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
                      where: { status: JobStatus.COMPLETED },
                      orderBy: { createdAt: "desc" },
                      take: 1,
                    },
                  },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const items = [];
        for (const album of albums) {
          for (const albumImage of album.albumImages) {
            const { image } = albumImage;
            const latestJob = image.enhancementJobs[0];

            if (!latestJob || !latestJob.enhancedUrl || !latestJob.enhancedWidth || !latestJob.enhancedHeight) {
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

            if (items.length >= limit) break;
          }
          if (items.length >= limit) break;
        }

        return textResult(JSON.stringify({ items }));
      }, { userId, input: { limit } }),
  });
}
