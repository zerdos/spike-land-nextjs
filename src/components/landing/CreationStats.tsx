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
    <div className="flex flex-wrap justify-center gap-6 mt-12">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 * index }}
          className="glass-0 rounded-xl px-6 py-4 flex items-center gap-3 min-w-[180px]"
        >
          <stat.icon className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <div className="text-lg font-bold text-white">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-xs text-zinc-500">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
