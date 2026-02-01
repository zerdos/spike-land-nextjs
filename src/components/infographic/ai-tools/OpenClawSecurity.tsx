"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { FlowDiagram, InteractiveChecklist, ProgressGauge, ScrollReveal } from "../shared";

const SECURITY_CHECKLIST = [
  { id: "1", label: "Rotate API Keys monthly" },
  { id: "2", label: "Use Least Privilege Policy" },
  { id: "3", label: "Audit Agent Logs" },
  { id: "4", label: "Sandbox File Application" },
];

export function OpenClawSecurity() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-zinc-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-emerald-900/10 to-transparent pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">RAK Security Framework</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Root, Agency, Keys. The three pillars of secure autonomous development.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Visual: Diagram */}
          <ScrollReveal
            delay={0.2}
            className="relative h-[400px] border border-white/10 rounded-2xl bg-black/40 backdrop-blur"
          >
            <div className="absolute inset-0 p-8 flex flex-col items-center justify-center">
              <div className="w-full h-full relative">
                {/* Nodes */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-blue-500/20 p-4 rounded-xl border border-blue-500/40 text-blue-200 text-center w-32 z-10">
                  <ShieldCheck size={20} className="mx-auto mb-2" />
                  <div className="font-bold text-sm">ROOT</div>
                </div>

                <div className="absolute top-1/2 left-10 -translate-y-1/2 bg-red-500/20 p-4 rounded-xl border border-red-500/40 text-red-200 text-center w-32 z-10">
                  <Lock size={20} className="mx-auto mb-2" />
                  <div className="font-bold text-sm">KEYS</div>
                </div>

                <div className="absolute top-1/2 right-10 -translate-y-1/2 bg-amber-500/20 p-4 rounded-xl border border-amber-500/40 text-amber-200 text-center w-32 z-10">
                  <div className="font-bold text-xl mb-1">🤖</div>
                  <div className="font-bold text-sm">AGENCY</div>
                </div>

                {/* Root provides security context to Keys and Agency */}
                <FlowDiagram
                  connections={[
                    // Root to Keys (blue)
                    { from: { x: 300, y: 100 }, to: { x: 150, y: 200 }, color: "#3B82F6" },
                    // Root to Agency (blue)
                    { from: { x: 300, y: 100 }, to: { x: 450, y: 200 }, color: "#3B82F6" },
                    // Keys govern Agency (red, dashed)
                    {
                      from: { x: 150, y: 200 },
                      to: { x: 450, y: 200 },
                      color: "#EF4444",
                      dashed: true,
                    },
                  ]}
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Interaction: Audit */}
          <div className="space-y-8">
            <ScrollReveal delay={0.4}>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Security Score</h3>
                <ProgressGauge value={85} type="bar" color="#10B981" label="Current Posture" />
                <p className="mt-4 text-xs text-zinc-500">Based on recent activity analysis.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.6}>
              <InteractiveChecklist
                items={SECURITY_CHECKLIST}
                title="Security Best Practices"
                className="bg-black/40 border-emerald-500/20"
              />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
