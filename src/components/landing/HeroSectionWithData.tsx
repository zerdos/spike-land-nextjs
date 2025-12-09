import prisma from "@/lib/prisma";
import { HeroSection } from "./HeroSection";

export async function HeroSectionWithData() {
  let originalUrl: string | undefined;
  let enhancedUrl: string | undefined;

  try {
    const topItem = await prisma.featuredGalleryItem.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        originalUrl: true,
        enhancedUrl: true,
      },
    });

    if (topItem) {
      originalUrl = topItem.originalUrl;
      enhancedUrl = topItem.enhancedUrl;
    }
  } catch {
    // Fall back to defaults if database unavailable
  }

  return <HeroSection originalUrl={originalUrl} enhancedUrl={enhancedUrl} />;
}
