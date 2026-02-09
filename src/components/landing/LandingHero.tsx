"use client";

import { CreateSearch } from "@/components/create/create-search";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center py-24 sm:py-32 overflow-hidden"
    >
      <motion.div 
        style={{ opacity, scale, y }}
        className="container relative mx-auto px-4 text-center z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400 mb-8 backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="font-medium tracking-wide uppercase text-[10px]">The Future of Creation</span>
        </motion.div>

        <div className="relative inline-block">
          <div className="absolute -inset-10 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="relative text-5xl sm:text-7xl md:text-9xl font-bold text-white max-w-5xl mx-auto leading-[0.9] mb-8 tracking-tighter"
          >
            Build the <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x font-black shadow-[0_0_30px_rgba(232,121,249,0.3)]">
              Impossible.
            </span>
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg sm:text-2xl text-zinc-400 max-w-3xl mx-auto mb-16 font-light leading-relaxed"
        >
          Spike Land is an AI-powered universe where your ideas become reality instantly. 
          No limits. No friction. Just pure creation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <CreateSearch />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
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

      {/* Decorative elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)]" />
      </div>
    </section>
  );
}
