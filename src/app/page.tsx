import { BlogPreviewSection } from "@/components/orbit-landing";
import { AppShowcaseSection } from "@/components/landing/AppShowcaseSection";
import { CreateCTASection } from "@/components/landing/CreateCTASection";
import { LandingHero } from "@/components/landing/LandingHero";
import { LearnItSection } from "@/components/landing/LearnItSection";
import { PublicGallerySection } from "@/components/landing/PublicGallerySection";
import { LandingPageStructuredData } from "@/components/seo/LandingPageStructuredData";
import { getRecentPublicPhotos } from "@/lib/gallery/public-photos";
import { getLatestShowcaseApps } from "@/lib/landing/showcase-feed";
import { getCreationStats } from "@/lib/landing/creation-stats";
import { PhysicsBackground } from "@/components/landing/PhysicsBackground";

export default async function Home() {
  let showcaseApps: Awaited<ReturnType<typeof getLatestShowcaseApps>> = [];
  let publicPhotos: Awaited<ReturnType<typeof getRecentPublicPhotos>> = [];
  let stats: Awaited<ReturnType<typeof getCreationStats>> | null = null;
  try {
    [showcaseApps, publicPhotos, stats] = await Promise.all([
      getLatestShowcaseApps(10),
      getRecentPublicPhotos(100),
      getCreationStats(),
    ]);
  } catch (e) {
    console.error("Failed to load landing page data:", e);
  }

  return (
    <main className="relative min-h-screen bg-zinc-950">
      <LandingPageStructuredData />
      <PhysicsBackground />
      <div className="relative z-10">
        <LandingHero stats={stats ?? undefined} />
        <AppShowcaseSection apps={showcaseApps} />
        <PublicGallerySection photos={publicPhotos} />
        <LearnItSection />
        <BlogPreviewSection />
        <CreateCTASection />
      </div>
    </main>
  );
}
