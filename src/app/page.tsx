import { CTASection } from "@/components/landing/CTASection";
import { FeaturedAppCard, PlatformFeatures, PlatformHero } from "@/components/platform-landing";
import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";
import { Image as ImageIcon } from "lucide-react";
import { unstable_cache } from "next/cache";

// Cache the super admin's top public photo for 1 hour to reduce database queries
const getTopPublicPhoto = unstable_cache(
  async () => {
    const photos = await getSuperAdminPublicPhotos(1);
    return photos[0] || null;
  },
  ["homepage-super-admin-top-photo-v2"],
  { revalidate: 3600, tags: ["super-admin-gallery"] },
);

// Fallback images if no super admin photos available
const FALLBACK_COMPARISON_IMAGES = {
  originalUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=70",
  enhancedUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=95",
};

export default async function Home() {
  // Fetch super admin's public photo for the featured card
  let comparisonImages = FALLBACK_COMPARISON_IMAGES;
  try {
    const topPhoto = await getTopPublicPhoto();
    if (topPhoto) {
      comparisonImages = {
        originalUrl: topPhoto.originalUrl,
        enhancedUrl: topPhoto.enhancedUrl,
      };
    }
  } catch (error) {
    // Fall back to defaults if database unavailable
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch super admin public photo:", error);
    }
  }

  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* Hero Section */}
      <PlatformHero />

      {/* Featured Apps Section */}
      <section id="apps" className="container mx-auto py-16 px-4">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Featured Applications
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Discover AI-powered apps built on Spike Land
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
          <FeaturedAppCard
            name="Pixel"
            description="Bring old, blurry photos back to life with advanced machine learning that restores details and clarity instantly."
            icon={<ImageIcon className="h-8 w-8" />}
            href="/pixel"
            featured
            usePixelLogo
            tagline="AI Image Enhancement"
            comparisonImages={comparisonImages}
          />
          {/* More apps coming soon */}
        </div>
      </section>

      {/* Platform Features */}
      <PlatformFeatures />

      {/* Final CTA Section */}
      <CTASection />
    </div>
  );
}
