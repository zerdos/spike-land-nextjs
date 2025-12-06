"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container mx-auto px-4 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center">
          {/* Social proof badge */}
          <div className="mb-10 flex justify-center">
            <Badge variant="secondary" className="px-5 py-2 text-sm shadow-lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Trusted by 10,000+ creators
            </Badge>
          </div>

          {/* Main headline */}
          <h1 className="mb-8 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Transform Your Images <span className="text-gradient-primary">with AI</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Enhance photos instantly with our AI-powered technology. Upscale resolution, improve
            quality, and bring your images to life in seconds.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col gap-5 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-base font-semibold">
              <Link href="/enhance">
                <Sparkles className="mr-2 h-5 w-5" />
                Enhance Your First Image
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base font-semibold">
              <a href="#gallery">
                <Play className="mr-2 h-5 w-5" />
                See Examples
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-glow-primary" />
              <span>No signup required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-glow-primary" />
              <span>Free first enhancement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-glow-primary" />
              <span>Results in seconds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration - More vivid */}
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl opacity-60" />
      <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-accent/15 to-primary/15 blur-3xl opacity-60" />
    </section>
  );
}
