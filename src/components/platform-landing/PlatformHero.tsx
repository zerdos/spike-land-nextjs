"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function PlatformHero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-8">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          {/* Main headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
            Build & Share <span className="text-gradient-primary">AI-Powered</span> Apps
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Create innovative applications with AI assistance. Spike Land connects you with AI
            agents to build, deploy, and monetize your ideas.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-5 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="text-lg font-semibold px-10 py-6 shadow-glow-cyan"
            >
              <Link href="/auth/signin?callbackUrl=/apps/pixel">
                <Sparkles className="mr-2 h-5 w-5" />
                Try Pixel Free
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg font-semibold px-10 py-6"
            >
              <Link href="/apps">
                Browse Apps
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute top-20 right-10 h-64 w-64 bg-primary/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />
      <div className="absolute bottom-20 left-10 h-48 w-48 bg-accent/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />

      {/* Decorative spark elements */}
      <div className="absolute top-32 right-20 opacity-20 pointer-events-none hidden lg:block">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary"
        >
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="absolute bottom-40 left-16 opacity-10 pointer-events-none hidden lg:block">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary"
        >
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
