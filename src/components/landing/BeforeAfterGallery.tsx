import prisma from "@/lib/prisma";
import { BeforeAfterGalleryClient, type CategoryTab } from "./BeforeAfterGalleryClient";
import { FALLBACK_GALLERY_ITEMS, type GalleryItem } from "./gallery-fallback-data";

// Type-safe category mapping from database enum to frontend type
const CATEGORY_MAP: Record<string, GalleryItem["category"]> = {
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
  PRODUCT: "product",
  ARCHITECTURE: "architecture",
};

// Human-readable labels for categories
const CATEGORY_LABELS: Record<string, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
  product: "Product",
  architecture: "Architecture",
};

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
        category: CATEGORY_MAP[item.category] || "portrait",
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

  // Extract unique categories from items and build dynamic tabs
  const uniqueCategories = [...new Set(galleryItems.map(item => item.category))];
  const categories: CategoryTab[] = [
    { value: "all", label: "All" },
    ...uniqueCategories.map(cat => ({
      value: cat,
      label: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
    })),
  ];

  return <BeforeAfterGalleryClient items={galleryItems} categories={categories} />;
}
