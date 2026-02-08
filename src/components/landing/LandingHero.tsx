"use client";

import { CreateSearch } from "@/components/create/create-search";
import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center py-24 sm:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container relative mx-auto px-4 text-center">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-primary mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered App Builder
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white max-w-4xl mx-auto leading-tight mb-6">
            Build anything.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Ship instantly.
            </span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-12">
            Describe your idea and watch AI build a live, shareable app in seconds.
            No setup, no deployment — just create.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <CreateSearch />
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <div className="mt-8">
            <Button
              asChild
              variant="ghost"
              className="text-white/60 hover:text-white gap-2 group"
            >
              <Link href="/create">
                Explore all apps
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
