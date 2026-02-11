"use client";

import { LiveAppCard } from "@/components/create/live-app-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { ShowcaseApp } from "@/lib/landing/showcase-feed";
import { ArrowRight, Blocks } from "lucide-react";
import { motion } from "framer-motion";

interface AppShowcaseSectionProps {
  apps: ShowcaseApp[];
}

export function AppShowcaseSection({ apps }: AppShowcaseSectionProps) {
  if (apps.length === 0) return null;

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mb-6"
        >
          <span className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400">
            <Blocks className="w-5 h-5" />
          </span>
          <span className="text-sm font-semibold tracking-widest uppercase text-cyan-400">Live Cosmic Entities</span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight"
        >
          What people are{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            materializing
          </span>
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-zinc-500 mb-16 max-w-2xl font-light"
        >
          Witness the raw power of AI. Every app below was built starting from a single sentence.
        </motion.p>

        <div className="relative">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

          <div className="flex gap-6 overflow-x-auto scroll-snap-x-mandatory pb-4 px-4 scrollbar-none">
            {apps.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05 * (index % 4) }}
                whileHover={{ y: -8 }}
                className="relative shrink-0 w-[280px] sm:w-[320px] scroll-snap-align-start"
              >
                {index < 3 && (
                  <div className="absolute -top-2 -right-2 z-10 bg-cyan-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Featured
                  </div>
                )}
                <LiveAppCard
                  title={app.title}
                  description={app.description}
                  slug={app.slug}
                  codespaceId={app.codespaceId}
                  viewCount={app.viewCount}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <Button
            asChild
            variant="ghost"
            className="text-zinc-400 hover:text-white gap-2 transition-all duration-300"
          >
            <Link href="/create">
              View the Multiverse
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
