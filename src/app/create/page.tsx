import { CreateHero } from "@/components/create/create-hero";
import { LiveAppCard } from "@/components/create/live-app-card";
import { getRecentApps, getTopApps } from "@/lib/create/content-service";
import type { CreatedApp } from "@prisma/client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create | Spike Land AI",
  description:
    "Describe any app and watch AI build it live. One-shot React app generator powered by Spike Land.",
};

export default async function CreateLanding() {
  let popular: CreatedApp[] = [];
  let recent: CreatedApp[] = [];

  try {
    [popular, recent] = await Promise.all([
      getTopApps(12),
      getRecentApps(9),
    ]);
  } catch (error) {
    console.error("Failed to load created apps:", error);
  }

  // De-duplicate: remove any recent apps that already appear in popular
  const popularIds = new Set(popular.map((a) => a.id));
  const uniqueRecent = recent.filter((a) => !popularIds.has(a.id));

  return (
    <div className="container mx-auto px-4 space-y-16 py-8">
      {/* Hero Section with ComposerBox and starter idea chips */}
      <CreateHero />

      {/* Popular Apps — primary section */}
      {popular.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 text-white">Popular Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popular.map((app) => (
              <LiveAppCard
                key={app.id}
                title={app.title}
                description={app.description}
                slug={app.slug}
                codespaceId={app.codespaceId}
                viewCount={app.viewCount}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Created */}
      {uniqueRecent.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 text-white">Recently Created</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueRecent.map((app) => (
              <LiveAppCard
                key={app.id}
                title={app.title}
                description={app.description}
                slug={app.slug}
                codespaceId={app.codespaceId}
                viewCount={app.viewCount}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
