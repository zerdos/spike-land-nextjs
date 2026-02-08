"use client";

import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Blend } from "lucide-react";

export function PhotoMixDemo() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-purple-400 mb-8">
              <Blend className="w-4 h-4" />
              PhotoMix
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Blend images with{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI magic
              </span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="text-lg text-white/60 mb-12 max-w-xl mx-auto">
              Combine two images into something entirely new. Our AI understands
              composition, style, and context to create stunning blends.
            </p>
          </ScrollReveal>

          {/* Visual demo */}
          <ScrollReveal delay={0.3} preset="scale">
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-12">
              <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center">
                <span className="text-white/40 text-sm">Image A</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white/30">+</div>
              <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center">
                <span className="text-white/40 text-sm">Image B</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white/30">=</div>
              <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-white/20 shadow-lg shadow-purple-500/10 flex items-center justify-center">
                <Blend className="w-8 h-8 text-white/60" />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 gap-2 group"
            >
              <Link href="/apps/pixel/mix">
                Try PhotoMix
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
