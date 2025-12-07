"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HeroComparisonSlider } from "./HeroComparisonSlider";

// Mountain landscape demo images from Unsplash
const DEMO_ORIGINAL = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=60";
const DEMO_ENHANCED = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=95";

export function HeroSection() {
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
          <div className="mx-auto max-w-4xl mb-12">
            <HeroComparisonSlider
              originalUrl={DEMO_ORIGINAL}
              enhancedUrl={DEMO_ENHANCED}
            />
          </div>

          {/* CTA Button */}
          <Button
            asChild
            size="lg"
            className="text-lg font-semibold px-10 py-6 shadow-glow-cyan"
          >
            <Link href="/enhance">Try it Free</Link>
          </Button>
        </div>
      </div>

      {/* Decorative spark elements */}
      <div className="absolute top-20 right-10 opacity-20 pointer-events-none hidden lg:block">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="absolute bottom-32 left-10 opacity-10 pointer-events-none hidden lg:block">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
