"use client";

import { ComposerBox } from "@/components/create/composer-box";
import { TemplateCards } from "@/components/landing/TemplateCards";
import { CreationStats } from "@/components/landing/CreationStats";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useCallback } from "react";

interface LandingHeroProps {
  stats?: { appsCreated: number; creatorCount: number };
}

export function LandingHero({ stats }: LandingHeroProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [templatePrompt, setTemplatePrompt] = useState("");
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const handleTemplateSelect = useCallback((prompt: string) => {
    setTemplatePrompt(prompt);
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center py-24 sm:py-32 overflow-hidden"
    >
      <motion.div
        style={{ opacity, scale, y }}
        className="container relative mx-auto px-4 text-center z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400 mb-8 backdrop-blur-md overflow-hidden"
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 animate-shimmer pointer-events-none" />
          <Sparkles className="w-4 h-4 animate-pulse relative" />
          <span className="font-medium tracking-wide uppercase text-[10px] relative">The Future of Creation</span>
        </motion.div>

        {/* Headline */}
        <div className="relative inline-block py-4">
          <div className="absolute -inset-10 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="relative text-5xl sm:text-7xl md:text-9xl font-bold text-white max-w-5xl mx-auto leading-none mb-8 tracking-tighter py-2"
          >
            Build the <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x font-black drop-shadow-[0_0_30px_rgba(168,85,247,0.25)]">
              Impossible.
            </span>
          </motion.h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg sm:text-2xl text-zinc-400 max-w-3xl mx-auto mb-16 font-light leading-relaxed"
        >
          Spike Land is an AI-powered universe where your ideas become reality instantly.
          No limits. No friction. Just pure creation.
        </motion.p>

        {/* Composer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="max-w-2xl mx-auto"
        >
          <ComposerBox initialPrompt={templatePrompt} />
        </motion.div>

        {/* Template Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <TemplateCards onSelect={handleTemplateSelect} />
        </motion.div>

        {/* Creation Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <CreationStats appsCreated={stats.appsCreated} creatorCount={stats.creatorCount} />
          </motion.div>
        )}

        {/* Explore link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-12 flex flex-wrap justify-center gap-6"
        >
          <Button
            asChild
            variant="ghost"
            className="text-zinc-500 hover:text-white gap-2 group transition-colors duration-300"
          >
            <Link href="/create">
              Explore the Galaxy
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Decorative elements - Overlapping color orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[120px] animate-float-slow" style={{ top: "20%", left: "30%" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/[0.04] blur-[120px] animate-float-slow-reverse" style={{ top: "60%", left: "60%" }} />
      </div>
    </section>
  );
}
