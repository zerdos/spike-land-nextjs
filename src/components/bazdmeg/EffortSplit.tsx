"use client";

import { GlassCard } from "@/components/infographic/shared/GlassCard";
import { ScrollReveal } from "@/components/infographic/shared/ScrollReveal";
import { motion } from "framer-motion";

const EFFORT_DATA = [
  { label: "Planning", percentage: 30, color: "#3B82F6", why: "Understanding the problem, planning interview, verifying understanding" },
  { label: "Testing", percentage: 50, color: "#10B981", why: "Writing tests, running agent-based tests, verifying everything works" },
  { label: "Quality", percentage: 20, color: "#F59E0B", why: "Edge cases, maintainability, polish" },
  { label: "Coding", percentage: 0, color: "#6B7280", why: "AI writes the code; you make sure the code is right" },
];

export function EffortSplit() {
  return (
    <ScrollReveal>
      <GlassCard className="p-8">
        <h3 className="text-2xl font-bold text-white mb-8 text-center">The Effort Split</h3>
        
        <div className="flex flex-col gap-8">
          <div className="h-12 w-full bg-zinc-900 rounded-full overflow-hidden flex shadow-inner">
            {EFFORT_DATA.filter(d => d.percentage > 0).map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ width: 0 }}
                whileInView={{ width: `${d.percentage}%` }}
                transition={{ duration: 1, delay: i * 0.2, ease: "easeOut" }}
                style={{ backgroundColor: d.color }}
                className="h-full relative group"
              >
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.label} {d.percentage}%
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {EFFORT_DATA.map((d) => (
              <div key={d.label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-bold text-white">{d.label}</span>
                  <span className="ml-auto text-sm font-mono text-zinc-500">{d.percentage}%</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {d.why}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
          <p className="text-amber-400 text-sm italic">
            "Stop coding. Start orchestrating. Coding is the side effect of good requirements."
          </p>
        </div>
      </GlassCard>
    </ScrollReveal>
  );
}
