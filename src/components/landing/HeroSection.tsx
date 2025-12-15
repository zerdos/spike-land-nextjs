"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Fallback demo images (used when no featured gallery items exist)
const FALLBACK_ORIGINAL = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=60";
const FALLBACK_ENHANCED =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=95";

interface HeroSectionProps {
  originalUrl?: string;
  enhancedUrl?: string;
}

export function HeroSection({
  originalUrl = FALLBACK_ORIGINAL,
  enhancedUrl = FALLBACK_ENHANCED,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-24 pb-8">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          {/* Main headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
            Enhance Your Photos in <br className="hidden sm:block" />
            <span className="text-gradient-primary">Seconds</span> with AI.
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Bring old, blurry images back to life. Pixel&apos;s advanced AI restores details and
            clarity instantly.
          </p>

          {/* Comparison Slider */}
          <div className="mx-auto max-w-4xl mb-12 rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
            <ImageComparisonSlider
              originalUrl={originalUrl}
              enhancedUrl={enhancedUrl}
              originalLabel="Original"
              enhancedLabel="Enhanced by Pixel"
            />
          </div>

          {/* CTA Button */}
          <Button
            asChild
            size="lg"
            className="text-lg font-semibold px-10 py-6 shadow-glow-cyan"
          >
            <Link href="/auth/signin?callbackUrl=/apps/pixel">Start here!</Link>
          </Button>
        </div>
      </div>

      {/* Decorative spark elements */}
      <div className="absolute top-20 right-10 opacity-20 pointer-events-none hidden lg:block">
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
      <div className="absolute bottom-32 left-10 opacity-10 pointer-events-none hidden lg:block">
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
