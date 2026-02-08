"use client";

import { LiveAppCard } from "@/components/create/live-app-card";
import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { ShowcaseApp } from "@/lib/landing/showcase-feed";
import { ArrowRight, Blocks } from "lucide-react";

interface AppShowcaseSectionProps {
  apps: ShowcaseApp[];
}

export function AppShowcaseSection({ apps }: AppShowcaseSectionProps) {
  if (apps.length === 0) return null;

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400">
              <Blocks className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium text-cyan-400">Live Apps</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            What people are{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              building
            </span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-lg text-white/60 mb-12 max-w-2xl">
            Real apps created by our community, running live right now.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {apps.map((app, index) => (
            <ScrollReveal key={app.id} delay={0.1 * (index % 5)}>
              <LiveAppCard
                title={app.title}
                description={app.description}
                slug={app.slug}
                codespaceId={app.codespaceId}
                viewCount={app.viewCount}
              />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <div className="mt-12 text-center">
            <Button
              asChild
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white gap-2 group"
            >
              <Link href="/create">
                See all apps
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
