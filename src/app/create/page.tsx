import { AppCard } from "@/components/create/app-card";
import { ComposerBox } from "@/components/create/composer-box";
import { LiveAppCard } from "@/components/create/live-app-card";
import { getRecentApps, getTopApps } from "@/lib/create/content-service";
import type { CreatedApp } from "@prisma/client";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

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
    <div className="container mx-auto px-4 space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold tracking-widest uppercase text-[10px]">AI App Builder</span>
        </div>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-white tracking-tighter">
          Describe it.{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            We build it.
          </span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light">
          Type any app idea and watch AI generate a fully working React app in seconds. No setup, no
          boilerplate — just describe what you want.
        </p>
        <div className="pt-4">
          <ComposerBox />
        </div>
      </section>

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

      {/* Starter Ideas — secondary, smaller section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-zinc-500">
          Or try one of these ideas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STARTER_IDEAS.map((idea) => (
            <AppCard
              key={idea.slug}
              title={idea.title}
              description={idea.description}
              slug={idea.slug}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
