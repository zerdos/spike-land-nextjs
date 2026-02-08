"use client";

import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function CreateCTASection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container relative mx-auto px-4 text-center">
        <ScrollReveal>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 max-w-3xl mx-auto">
            Ready to build your{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              next app?
            </span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Join thousands of creators building live apps with AI. No code required.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 gap-2 text-lg px-8"
            >
              <Link href="/create">
                <Sparkles className="w-5 h-5" />
                Start Creating
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/10 hover:bg-white/5 text-white gap-2 group"
            >
              <Link href="/create">
                Explore Apps
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
