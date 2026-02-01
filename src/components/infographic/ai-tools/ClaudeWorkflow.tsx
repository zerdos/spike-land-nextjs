"use client";

import { Code, GitCommit, PenTool, Search } from "lucide-react";
import { useState } from "react";
import { FlowDiagram, GlassCard, ScrollReveal } from "../shared";

const steps = [
  {
    id: "explore",
    label: "Explore",
    icon: <Search size={24} />,
    desc: "Understand the codebase & requirements",
  },
  {
    id: "plan",
    label: "Plan",
    icon: <PenTool size={24} />,
    desc: "Propose changes & architect solutions",
  },
  {
    id: "code",
    label: "Code",
    icon: <Code size={24} />,
    desc: "Implement logic & refactor patterns",
  },
  {
    id: "commit",
    label: "Commit",
    icon: <GitCommit size={24} />,
    desc: "Verify, test, and push changes",
  },
];

export function ClaudeWorkflow() {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col justify-center py-24 relative overflow-hidden bg-black/40">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">The Agentic Workflow</h2>
            <p className="text-xl text-zinc-400">How Claude Code orchestrates complex tasks</p>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Animated connection line */}
          <div className="absolute top-12 left-0 w-full h-20 -z-10 opacity-30">
            <FlowDiagram
              connections={[
                { from: { x: 100, y: 50 }, to: { x: 300, y: 50 }, color: "#F59E0B" },
                { from: { x: 350, y: 50 }, to: { x: 550, y: 50 }, color: "#F59E0B" },
                { from: { x: 600, y: 50 }, to: { x: 800, y: 50 }, color: "#F59E0B" },
              ]}
              duration={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <ScrollReveal key={step.id} delay={index * 0.2}>
                <div
                  className="relative group"
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  <GlassCard
                    className={`
                      p-6 flex flex-col items-center text-center h-full transition-all duration-300
                      ${
                      activeStep === step.id
                        ? "bg-amber-500/10 border-amber-500/40 scale-105 z-10"
                        : "bg-zinc-900/50 border-zinc-800"
                    }
                    `}
                    hoverEffect={false}
                  >
                    <div
                      className={`
                      w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300
                      ${
                        activeStep === step.id
                          ? "bg-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                          : "bg-zinc-800 text-zinc-400"
                      }
                    `}
                    >
                      {step.icon}
                    </div>

                    <h3
                      className={`text-xl font-bold mb-2 ${
                        activeStep === step.id ? "text-amber-400" : "text-zinc-300"
                      }`}
                    >
                      {step.label}
                    </h3>

                    <p className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      {step.desc}
                    </p>
                  </GlassCard>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
