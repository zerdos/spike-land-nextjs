import prisma from "@/lib/prisma";
import { BeforeAfterGalleryClient } from "./BeforeAfterGalleryClient";
import { FALLBACK_GALLERY_ITEMS, type GalleryItem } from "./gallery-fallback-data";

export async function BeforeAfterGallery() {
  let galleryItems: GalleryItem[];

  try {
    const dbItems = await prisma.featuredGalleryItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        originalUrl: true,
        enhancedUrl: true,
        width: true,
        height: true,
      },
    });

    if (dbItems.length > 0) {
      galleryItems = dbItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || "",
        category: item.category.toLowerCase() as
          | "portrait"
          | "landscape"
          | "product"
          | "architecture",
        originalUrl: item.originalUrl,
        enhancedUrl: item.enhancedUrl,
        width: item.width,
        height: item.height,
      }));
    } else {
      galleryItems = FALLBACK_GALLERY_ITEMS;
    }
  } catch {
    // Fallback if database unavailable
    galleryItems = FALLBACK_GALLERY_ITEMS;
  }

  return <BeforeAfterGalleryClient items={galleryItems} />;
}
