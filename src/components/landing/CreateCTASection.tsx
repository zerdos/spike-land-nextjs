"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function CreateCTASection() {
  return (
    <section className="relative py-48 overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.1)_0%,transparent_70%)]" />
      
      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-8xl font-bold text-white mb-10 tracking-tighter"
          >
            Ready to build the{" "}
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              unthinkable?
            </span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl md:text-2xl text-zinc-500 mb-16 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Join the collective of minds reshaping the digital frontier. 
            No gatekeepers. Just genesis.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8"
          >
            <Button
              asChild
              size="lg"
              className="bg-white text-zinc-950 hover:bg-zinc-200 border-0 gap-3 text-xl px-12 h-20 rounded-3xl font-black shadow-2xl shadow-cyan-500/20 transition-all duration-300 hover:scale-105"
            >
              <Link href="/create">
                <Sparkles className="w-6 h-6 animate-pulse" />
                Begin Creation
              </Link>
            </Button>
            
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-zinc-500 hover:text-white gap-2 transition-all duration-300 text-lg px-8"
            >
              <Link href="/create">
                Browse Archives
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
