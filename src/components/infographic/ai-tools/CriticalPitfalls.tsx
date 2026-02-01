"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { PITFALLS_CONTENT } from "../constants/content";
import { GlassCard, ScrollReveal, SeverityBadge } from "../shared";

export function CriticalPitfalls() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-red-950/20 border-y border-red-900/10">
      <div className="container max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <div className="flex items-center justify-center gap-4 mb-16 text-red-200">
            <AlertOctagon size={40} className="text-red-500" />
            <h2 className="text-4xl font-bold">Critical Pitfalls</h2>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {PITFALLS_CONTENT.map((pitfall, idx) => (
            <ScrollReveal key={pitfall.id} delay={idx * 0.1}>
              <GlassCard
                variant={pitfall.severity === "critical"
                  ? "critical"
                  : pitfall.severity === "high"
                  ? "high"
                  : "neutral"}
                className="overflow-hidden transition-all duration-300"
                hoverEffect={false}
              >
                <div
                  className="p-6 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedId(expandedId === pitfall.id ? null : pitfall.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(expandedId === pitfall.id ? null : pitfall.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-4">
                    <SeverityBadge level={pitfall.severity} />
                    <h3 className="text-lg font-semibold">{pitfall.title}</h3>
                  </div>
                  {expandedId === pitfall.id
                    ? <ChevronUp className="opacity-50" />
                    : <ChevronDown className="opacity-50" />}
                </div>

                <AnimatePresence>
                  {expandedId === pitfall.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0 flex gap-8 text-sm">
                        <div className="flex-1 p-4 rounded bg-red-500/10 border border-red-500/20">
                          <strong className="block text-red-300 mb-2 uppercase text-xs tracking-wider">
                            The Problem
                          </strong>
                          <p className="text-red-100/80 leading-relaxed">{pitfall.problem}</p>
                        </div>
                        <div className="flex-1 p-4 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <strong className="block text-emerald-300 mb-2 uppercase text-xs tracking-wider">
                            The Solution
                          </strong>
                          <p className="text-emerald-100/80 leading-relaxed">{pitfall.solution}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
