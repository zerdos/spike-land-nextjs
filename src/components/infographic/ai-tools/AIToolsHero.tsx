"use client";

import { motion } from "framer-motion";
import { ArrowDown, Cloud, Terminal } from "lucide-react";
import { HERO_CONTENT } from "../constants/content";
import { AnimatedCounter, GlassCard, ScrollReveal } from "../shared";

export function AIToolsHero() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden py-24">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-zinc-950">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-amber-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-emerald-500/10 blur-[150px] rounded-full" />
      </div>

      <div className="container relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <motion.h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-emerald-200">
            {HERO_CONTENT.title}
          </motion.h1>
          <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto">
            {HERO_CONTENT.subtitle}
          </p>
        </ScrollReveal>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Claude Code Side */}
          <ScrollReveal delay={0.2} className="relative group">
            <GlassCard
              variant="claude"
              className="p-8 h-full flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 ring-1 ring-amber-500/40 group-hover:scale-110 transition-transform duration-500">
                <Cloud size={40} className="text-amber-500" />
              </div>
              <h2 className="text-3xl font-bold text-amber-500 mb-4">{HERO_CONTENT.claude.name}</h2>
              <p className="text-zinc-400 mb-8 flex-grow">
                {HERO_CONTENT.claude.description}
              </p>

              <div className="grid grid-cols-2 gap-8 w-full border-t border-amber-500/20 pt-8">
                <div className="text-center">
                  <AnimatedCounter
                    value={HERO_CONTENT.claude.stats.stars}
                    suffix="+"
                    numberClassName="text-amber-400"
                  />
                  <div className="text-xs text-amber-500/60 uppercase tracking-widest mt-1">
                    Stars
                  </div>
                </div>
                <div className="text-center">
                  <AnimatedCounter
                    value={HERO_CONTENT.claude.stats.users}
                    suffix="+"
                    numberClassName="text-amber-400"
                  />
                  <div className="text-xs text-amber-500/60 uppercase tracking-widest mt-1">
                    Users
                  </div>
                </div>
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* OpenClaw Side */}
          <ScrollReveal delay={0.4} className="relative group">
            <GlassCard
              variant="openClaw"
              className="p-8 h-full flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 ring-1 ring-emerald-500/40 group-hover:scale-110 transition-transform duration-500">
                <Terminal size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold text-emerald-500 mb-4">
                {HERO_CONTENT.openClaw.name}
              </h2>
              <p className="text-zinc-400 mb-8 flex-grow">
                {HERO_CONTENT.openClaw.description}
              </p>

              <div className="grid grid-cols-2 gap-8 w-full border-t border-emerald-500/20 pt-8">
                <div className="text-center">
                  <AnimatedCounter
                    value={HERO_CONTENT.openClaw.stats.downloads}
                    suffix=""
                    numberClassName="text-emerald-400"
                  />
                  <div className="text-xs text-emerald-500/60 uppercase tracking-widest mt-1">
                    Downloads
                  </div>
                </div>
                <div className="text-center">
                  <AnimatedCounter
                    value={HERO_CONTENT.openClaw.stats.contributors}
                    suffix="+"
                    numberClassName="text-emerald-400"
                  />
                  <div className="text-xs text-emerald-500/60 uppercase tracking-widest mt-1">
                    Contributors
                  </div>
                </div>
              </div>
            </GlassCard>
          </ScrollReveal>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1, repeat: Infinity, repeatType: "reverse" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-600"
      >
        <ArrowDown size={32} />
      </motion.div>
    </div>
  );
}
