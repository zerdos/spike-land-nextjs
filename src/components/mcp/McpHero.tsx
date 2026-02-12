"use client";

import { Button } from "@/components/ui/button";
import { ArrowDown, Sparkles, Wrench, LayoutGrid, Zap } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface McpHeroProps {
  onExploreClick?: () => void;
}

const stats = [
  { icon: Wrench, value: "34", label: "Tools" },
  { icon: LayoutGrid, value: "19", label: "Categories" },
  { icon: Zap, value: "5", label: "Gateway Tools" },
];

const configSnippet = `{
  "mcpServers": {
    "spike-land": {
      "url": "https://testing.spike.land/mcp"
    }
  }
}`;

export function McpHero({ onExploreClick }: McpHeroProps) {
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
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-400 mb-8 backdrop-blur-md overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 animate-shimmer pointer-events-none" />
          <Sparkles className="w-4 h-4 animate-pulse relative" />
          <span className="font-medium tracking-wide uppercase text-[10px] relative">
            Model Context Protocol
          </span>
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
            40+ AI Tools.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x font-black drop-shadow-[0_0_30px_rgba(168,85,247,0.25)]">
              One Protocol.
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
          Spike Land&apos;s MCP server uses{" "}
          <span className="text-white font-medium">Progressive Context Disclosure</span>
          {" "}&mdash; agents start with 5 lightweight gateway tools and progressively
          discover 40+ tools across 19 categories.
        </motion.p>

        {/* Stats Row */}
        <div className="flex flex-wrap justify-center items-center gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + 0.1 * index }}
                whileHover={{
                  y: -4,
                  transition: { type: "spring", stiffness: 400, damping: 25 },
                }}
                className="glass-1 rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[180px] border border-white/[0.06]"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                  <stat.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tight text-white">
                    {stat.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
              {index < stats.length - 1 && (
                <div className="hidden md:block w-px h-8 bg-white/[0.06]" />
              )}
            </div>
          ))}
        </div>

        {/* Config Snippet Teaser */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-md mx-auto mb-12"
        >
          <div className="glass-1 glass-edge rounded-2xl border border-white/[0.06] p-4 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-[10px] text-zinc-500 font-mono">.mcp.json</span>
            </div>
            <pre className="text-xs font-mono text-zinc-300 leading-relaxed overflow-hidden">
              <code>{configSnippet}</code>
            </pre>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button
            variant="ghost"
            onClick={onExploreClick}
            className="text-zinc-500 hover:text-white gap-2 group transition-colors duration-300"
          >
            Explore Tools
            <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-1" />
          </Button>
        </motion.div>
      </motion.div>

      {/* Decorative orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[120px] animate-float-slow"
          style={{ top: "20%", left: "30%" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/[0.04] blur-[120px] animate-float-slow-reverse"
          style={{ top: "60%", left: "60%" }}
        />
      </div>
    </section>
  );
}
