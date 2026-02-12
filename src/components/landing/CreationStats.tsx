"use client";

import { AnimatedCounter } from "./animated-counter";
import { motion } from "framer-motion";
import { Blocks, Users, Zap } from "lucide-react";

interface CreationStatsProps {
  appsCreated: number;
  creatorCount: number;
}

export function CreationStats({ appsCreated, creatorCount }: CreationStatsProps) {
  const stats = [
    { icon: Blocks, value: appsCreated, label: "Apps Created", suffix: "+" },
    { icon: Users, value: creatorCount, label: "Creators", suffix: "+" },
    { icon: Zap, value: 30, label: "Built in seconds", suffix: "s" },
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-6 mt-12">
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
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
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">{stat.label}</div>
            </div>
          </motion.div>
          {/* Vertical divider between stats (desktop only, not after last) */}
          {index < stats.length - 1 && (
            <div className="hidden md:block w-px h-8 bg-white/[0.06]" />
          )}
        </div>
      ))}
    </div>
  );
}
