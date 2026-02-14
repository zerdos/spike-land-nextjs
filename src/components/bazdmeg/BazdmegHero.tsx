"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/infographic/shared/ScrollReveal";
import { slideUpVariants } from "@/lib/animation-variants";

export function BazdmegHero() {
  return (
    <div className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal threshold={0} variants={slideUpVariants}>
          <div className="flex flex-col items-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-xs font-bold uppercase tracking-widest mb-6"
            >
              The Quality First Manifesto
            </motion.div>
            
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight">
              BAZD<span className="text-amber-500">MEG</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl leading-relaxed mb-10">
              Seven principles for AI-assisted development. <br className="hidden md:block" />
              Born from pain. <span className="text-white font-medium">Tested in production.</span>
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-zinc-950 font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all"
                onClick={() => document.getElementById('principles')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn the Principles
              </motion.button>
              
              <a 
                href="https://github.com/zerdos/spike-land-nextjs"
                className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-xl border border-white/10 hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* Decorative Grid or Sparkles could go here */}
      </div>

      {/* Decorative Wave/Transition at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}
