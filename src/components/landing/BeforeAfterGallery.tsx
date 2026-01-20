import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";
import { BeforeAfterGalleryClient } from "./BeforeAfterGalleryClient";
import { FALLBACK_GALLERY_ITEMS, type GalleryItem } from "./gallery-fallback-data";

// Helper function to infer category from aspect ratio and image dimensions
function inferCategory(width: number, height: number): GalleryItem["category"] {
  const aspectRatio = width / height;

  // Portrait orientation (taller than wide)
  if (aspectRatio < 0.9) {
    return "portrait";
  }

  // Square-ish (1:1 ratio) - likely product photos
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
    return "product";
  }

  // Wide landscape
  if (aspectRatio > 1.5) {
    return "landscape";
  }

  // Default for other ratios
  return "architecture";
}

export async function BeforeAfterGallery() {
  let galleryItems: GalleryItem[];

  try {
    const photos = await getSuperAdminPublicPhotos();

    if (photos.length > 0) {
      galleryItems = photos.map((photo) => ({
        id: photo.id,
        title: photo.title,
        description: `Enhanced with ${photo.tier} from ${photo.albumName}`,
        category: inferCategory(photo.width, photo.height),
        originalUrl: photo.originalUrl,
        enhancedUrl: photo.enhancedUrl,
        width: photo.width,
        height: photo.height,
      }));
    } else {
      galleryItems = FALLBACK_GALLERY_ITEMS;
    }
  } catch (error) {
    // Database unavailable - use fallback gallery items
    console.debug(
      "[BeforeAfterGallery] Failed to fetch from database, using fallback:",
      error instanceof Error ? error.message : String(error),
    );
    galleryItems = FALLBACK_GALLERY_ITEMS;
  }

  return <BeforeAfterGalleryClient items={galleryItems} />;
}
