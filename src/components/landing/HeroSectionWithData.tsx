import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";
import { unstable_cache } from "next/cache";
import { HeroSection } from "./HeroSection";

// Cache the super admin's top public photo for 1 hour to reduce database queries
const getTopPublicPhoto = unstable_cache(
  async () => {
    const photos = await getSuperAdminPublicPhotos(1);
    return photos[0] || null;
  },
  ["super-admin-top-photo-v2"],
  { revalidate: 3600, tags: ["super-admin-gallery"] },
);

export async function HeroSectionWithData() {
  let originalUrl: string | undefined;
  let enhancedUrl: string | undefined;

  try {
    const topPhoto = await getTopPublicPhoto();

    if (topPhoto) {
      originalUrl = topPhoto.originalUrl;
      enhancedUrl = topPhoto.enhancedUrl;
    }
  } catch (error) {
    // Fall back to defaults if database unavailable
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch super admin public photo:", error);
    }
  }

  return <HeroSection originalUrl={originalUrl} enhancedUrl={enhancedUrl} />;
}
