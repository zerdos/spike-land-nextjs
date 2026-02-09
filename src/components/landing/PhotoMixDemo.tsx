"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Blend } from "lucide-react";
import { motion } from "framer-motion";

export function PhotoMixDemo() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container relative mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400 mb-8"
          >
            <Blend className="w-4 h-4" />
            <span className="font-semibold tracking-widest uppercase text-[10px]">Neural Synthesis</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-7xl font-bold text-white mb-8 tracking-tight"
          >
            Beyond{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
              Hybridization
            </span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-zinc-500 mb-16 max-w-2xl mx-auto font-light"
          >
            PhotoMix isn't just a layer blend. It's a semantic reconstruction that merges style, 
            lighting, and essence into a singular masterpiece.
          </motion.p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-48 h-48 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/5 flex items-center justify-center relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.2)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-zinc-500 font-bold group-hover:text-cyan-400 transition-colors uppercase tracking-tighter">Essence A</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.5 }}
              className="text-5xl font-thin text-zinc-800"
            >
              +
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-48 h-48 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,38,211,0.2)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-zinc-500 font-bold group-hover:text-fuchsia-400 transition-colors uppercase tracking-tighter">Essence B</span>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, scale: 0 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.7 }}
               className="text-5xl font-thin text-zinc-800 hidden md:block"
            >
              =
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.8, ease: "anticipate" }}
              className="w-64 h-64 rounded-[3rem] bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 flex items-center justify-center relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.1)]"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.3)_0%,transparent_70%)]" 
              />
              <Blend className="w-16 h-16 text-white/40 z-10" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold border-0 gap-3 group px-10 h-16 rounded-2xl transition-all duration-300 shadow-xl shadow-purple-500/10"
            >
              <Link href="/apps/pixel/mix">
                Synthesize Now
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
