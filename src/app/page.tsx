import { BlogPreviewSection } from "@/components/orbit-landing";
import { AppShowcaseSection } from "@/components/landing/AppShowcaseSection";
import { CreateCTASection } from "@/components/landing/CreateCTASection";
import { LandingHero } from "@/components/landing/LandingHero";
import { PhotoMixDemo } from "@/components/landing/PhotoMixDemo";
import { PublicGallerySection } from "@/components/landing/PublicGallerySection";
import { LandingPageStructuredData } from "@/components/seo/LandingPageStructuredData";
import { getRecentPublicPhotos } from "@/lib/gallery/public-photos";
import { getLatestShowcaseApps } from "@/lib/landing/showcase-feed";

export default async function Home() {
  let showcaseApps: Awaited<ReturnType<typeof getLatestShowcaseApps>> = [];
  let publicPhotos: Awaited<ReturnType<typeof getRecentPublicPhotos>> = [];
  try {
    [showcaseApps, publicPhotos] = await Promise.all([
      getLatestShowcaseApps(10),
      getRecentPublicPhotos(100),
    ]);
  } catch (e) {
    console.error("Failed to load landing page data:", e);
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <LandingPageStructuredData />
      <LandingHero />
      <AppShowcaseSection apps={showcaseApps} />
      <PublicGallerySection photos={publicPhotos} />
      <PhotoMixDemo />
      <BlogPreviewSection />
      <CreateCTASection />
    </main>
  );
}
