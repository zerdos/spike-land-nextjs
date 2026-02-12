import { ComposerBox } from "@/components/create/composer-box";
import { LiveAppCard } from "@/components/create/live-app-card";
import { getRecentApps, getTopApps } from "@/lib/create/content-service";
import type { CreatedApp } from "@prisma/client";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create | Spike Land AI",
  description:
    "Describe any app and watch AI build it live. One-shot React app generator powered by Spike Land.",
};

const STARTER_IDEAS = [
  {
    title: "Todo List",
    description: "A simple task manager with add, complete, and delete",
    slug: "todo-list",
  },
  {
    title: "Calculator",
    description: "A functional calculator with basic arithmetic",
    slug: "calculator",
  },
  {
    title: "Color Picker",
    description: "An interactive color picker with hex/rgb output",
    slug: "color-picker",
  },
  {
    title: "Markdown Editor",
    description: "A live markdown editor with preview pane",
    slug: "markdown-editor",
  },
];

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
    <div className="min-h-screen relative overflow-hidden bg-zinc-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.2]"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
           }}
      />

      <div className="container mx-auto px-4 space-y-24 py-24 relative z-10">
        {/* Hero Section */}
        <section className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold tracking-widest uppercase text-[10px]">AI App Builder</span>
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-9xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 pb-2">
            Describe it.{" "}
            <span className="block sm:inline">We build it.</span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
            Type any app idea and watch AI generate a fully working React app in seconds. No setup, no
            boilerplate — just describe what you want.
          </p>

          <div className="pt-8 max-w-3xl mx-auto">
            <ComposerBox />

            {/* Starter Ideas as Chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="text-sm text-zinc-500 py-1.5">Try asking for:</span>
              {STARTER_IDEAS.map((idea) => (
                <Link key={idea.slug} href={`/create/${idea.slug}`}>
                  <Button variant="outline" size="sm" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-colors">
                    {idea.title}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Apps — primary section */}
        {popular.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold mb-8 text-white tracking-tight">Popular Apps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <h2 className="text-3xl font-bold mb-8 text-white tracking-tight">Recently Created</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
    </div>
  );
}
