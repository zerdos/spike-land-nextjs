"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Cloud, Database, Link, Server, Shield, Wallet, X } from "lucide-react";
import { useState } from "react";
import { FlowDiagram, GlassCard, ScrollReveal } from "../shared";

// Map for dynamic colors to ensure Tailwind JIT picks them up
const colorClasses: Record<string, string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/20",
  amber: "bg-amber-500/10 border-amber-500/20",
  blue: "bg-blue-500/10 border-blue-500/20",
};

const WORKFLOWS = [
  {
    id: 0,
    icon: <Shield size={32} className="text-emerald-400" />,
    title: "Privacy First",
    desc: "Sensitive logic runs locally on OpenClaw. Public helpers run on Claude Cloud.",
    color: "emerald",
    diagram: {
      nodes: [
        {
          icon: <Database size={24} className="text-emerald-400" />,
          label: "Private Data",
          x: 100,
          y: 150,
        },
        {
          icon: <Server size={24} className="text-emerald-400" />,
          label: "Local Agent",
          x: 300,
          y: 150,
        },
        {
          icon: <Cloud size={24} className="text-amber-400" />,
          label: "Claude Cloud",
          x: 500,
          y: 150,
        },
      ],
      connections: [
        { from: { x: 120, y: 150 }, to: { x: 280, y: 150 }, color: "#10B981" },
        { from: { x: 320, y: 150 }, to: { x: 480, y: 150 }, color: "#F59E0B", dashed: true },
      ],
    },
  },
  {
    id: 1,
    icon: <Wallet size={32} className="text-amber-400" />,
    title: "Cost Optimized",
    desc: "Use Haiku/DeepSeek locally for bulk tasks. Escalate hard problems to Opus.",
    color: "amber",
    diagram: {
      nodes: [
        { icon: <Server size={24} className="text-blue-400" />, label: "Router", x: 100, y: 150 },
        {
          icon: <Server size={24} className="text-emerald-400" />,
          label: "Local LLM",
          x: 300,
          y: 100,
        },
        {
          icon: <Cloud size={24} className="text-amber-400" />,
          label: "Claude Opus",
          x: 300,
          y: 200,
        },
      ],
      connections: [
        { from: { x: 120, y: 150 }, to: { x: 280, y: 100 }, color: "#34D399" },
        { from: { x: 120, y: 150 }, to: { x: 280, y: 200 }, color: "#F59E0B" },
      ],
    },
  },
  {
    id: 2,
    icon: <Link size={32} className="text-blue-400" />,
    title: "The Coordinator",
    desc: "Claude acts as the Project Manager (Planning), OpenClaw agents execute the tickets.",
    color: "blue",
    diagram: {
      nodes: [
        { icon: <Cloud size={24} className="text-amber-400" />, label: "Planner", x: 150, y: 150 },
        { icon: <Server size={24} className="text-blue-400" />, label: "Worker 1", x: 450, y: 100 },
        { icon: <Server size={24} className="text-blue-400" />, label: "Worker 2", x: 450, y: 200 },
      ],
      connections: [
        { from: { x: 170, y: 150 }, to: { x: 430, y: 100 }, color: "#60A5FA", dashed: true },
        { from: { x: 170, y: 150 }, to: { x: 430, y: 200 }, color: "#60A5FA", dashed: true },
      ],
    },
  },
];

export function HybridWorkflows() {
  const [activeDiagram, setActiveDiagram] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-[#0c0c12]">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold font-heading mb-6 tracking-tight">
              The Hybrid Future
            </h2>
            <p className="text-xl text-zinc-400">Why choose one? Connect them for maximum power.</p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {WORKFLOWS.map((flow, idx) => (
            <ScrollReveal key={idx} delay={idx * 0.2}>
              <GlassCard className="h-full p-8 flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <div
                  className={`
                   w-20 h-20 rounded-full flex items-center justify-center mb-6 
                   ${
                    colorClasses[flow.color] || "bg-gray-500/10 border-gray-500/20"
                  } group-hover:scale-110 transition-transform
                 `}
                >
                  {flow.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{flow.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{flow.desc}</p>

                <div className="mt-8 pt-6 border-t border-white/5 w-full">
                  <button
                    onClick={() => setActiveDiagram(flow.id)}
                    className="text-sm flex items-center justify-center gap-2 hover:gap-3 transition-all opacity-60 hover:opacity-100 w-full py-2 hover:bg-white/5 rounded"
                  >
                    View Diagram <ArrowRight size={14} />
                  </button>
                </div>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>

        {/* Diagram Modal */}
        <AnimatePresence>
          {activeDiagram !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveDiagram(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                layoutId={`card-${activeDiagram}`}
                className="relative w-full max-w-3xl aspect-video z-10"
              >
                {(() => {
                  const flow = WORKFLOWS[activeDiagram];
                  if (!flow) return null;

                  return (
                    <GlassCard variant="highlighted" className="w-full h-full p-8 flex flex-col">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">{flow.title}</h3>
                          <p className="text-zinc-400">{flow.desc}</p>
                        </div>
                        <button
                          onClick={() =>
                            setActiveDiagram(null)}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                          <X />
                        </button>
                      </div>

                      <div className="flex-grow relative bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                        {/* Nodes */}
                        {flow.diagram.nodes.map((node, i) => (
                          <div
                            key={i}
                            className="absolute flex flex-col items-center gap-2 transform -translate-x-1/2 -translate-y-1/2"
                            style={{ left: node.x, top: node.y }}
                          >
                            <div className="p-3 bg-white/10 rounded-lg border border-white/10 backdrop-blur-md">
                              {node.icon}
                            </div>
                            <span className="text-xs font-mono text-zinc-500">{node.label}</span>
                          </div>
                        ))}

                        {/* Connections */}
                        <FlowDiagram
                          connections={flow.diagram.connections}
                          className="absolute inset-0"
                        />
                      </div>
                    </GlassCard>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <ScrollReveal delay={0.6}>
          <div className="mt-24 p-12 rounded-3xl bg-gradient-to-r from-zinc-900 to-black border border-white/10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-white to-emerald-500" />

            <h3 className="text-3xl font-bold mb-6">Ready to upgrade your workflow?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform">
                Get Claude Code
              </button>
              <button className="px-8 py-4 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-500 hover:scale-105 transition-all">
                Install OpenClaw
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
