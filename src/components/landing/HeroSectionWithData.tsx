import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { HeroSection } from "./HeroSection";

// Cache the top featured item for 1 hour to reduce database queries
const getTopFeaturedItem = unstable_cache(
  async () => {
    return await prisma.featuredGalleryItem.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        originalUrl: true,
        enhancedUrl: true,
      },
    });
  },
  ["top-featured-item"],
  { revalidate: 3600, tags: ["featured-gallery"] },
);

export async function HeroSectionWithData() {
  let originalUrl: string | undefined;
  let enhancedUrl: string | undefined;

  try {
    const topItem = await getTopFeaturedItem();

    if (topItem) {
      originalUrl = topItem.originalUrl;
      enhancedUrl = topItem.enhancedUrl;
    }
  } catch (error) {
    // Fall back to defaults if database unavailable
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch featured gallery item:", error);
    }
  }

  return <HeroSection originalUrl={originalUrl} enhancedUrl={enhancedUrl} />;
}
