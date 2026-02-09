"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cloud, Cpu, Layout, Lock, Terminal, Zap } from "lucide-react";
import { useState } from "react";
import { GlassCard, ScrollReveal } from "../shared";

const COMPARISON_DATA = [
  {
    id: "philosophy",
    label: "Philosophy",
    icon: <Layout size={20} />,
    title: "Core Philosophy & Architecture",
    claude: {
      title: "Cloud-Powered CLI",
      desc:
        "Built as a command-line interface relying on cloud-based intelligence. It uses the local environment as context for the AI to explore and manipulate.",
      points: [
        '"Explore, Plan, Code, Commit" linear workflow',
        "Requires explicit user guidance",
        "Uses CLAUDE.md for architectural rules",
      ],
      color: "amber",
    },
    claw: {
      title: "Gateway Runtime",
      desc:
        "A self-hosted runtime connecting agents to the world via WebSockets. It acts as a gateway between AI and external messaging platforms.",
      points: [
        '"Heartbeat" for autonomous wake-ups',
        "Proactive: can alert users unprompted",
        "Persistent memory across sessions",
      ],
      color: "emerald",
    },
  },
  {
    id: "scope",
    label: "Scope",
    icon: <Zap size={20} />,
    title: "Operational Scope",
    claude: {
      title: "Strictly Development",
      desc: "Excels at complex refactoring and multi-agent orchestration for software tasks.",
      points: [
        "Complex refactoring & architecture",
        "TypeScript / Angular specialization",
        "Task queue / Pipeline execution",
      ],
      color: "amber",
    },
    claw: {
      title: "Operations & Ops",
      desc:
        "Extends beyond code into personal productivity, business ops, and physical world control.",
      points: [
        "Calendar & Smart Home management",
        "Web scraping & GitHub automation",
        "Running company operations",
      ],
      color: "emerald",
    },
  },
  {
    id: "security",
    label: "Security",
    icon: <Lock size={20} />,
    title: "Security Models",
    claude: {
      title: "Managed Tool",
      desc:
        "Operates within development boundaries. Security is managed through permission checks.",
      points: [
        "Standard permission flags",
        "Optional sandboxing",
        "Project-scoped access",
      ],
      color: "amber",
    },
    claw: {
      title: "Spicy / High Risk",
      desc:
        'Grants autonomous shell access and external connections. No "perfectly secure" setup exists.',
      points: [
        "Lethal Trifecta: Data + Shell + External",
        "Requires strict isolation (Docker/VM)",
        "Must run on secondary machines/tunnels",
      ],
      color: "emerald",
    },
  },
  {
    id: "models",
    label: "Models",
    icon: <Cpu size={20} />,
    title: "Model Integration",
    claude: {
      title: "Anthropic First",
      desc: "Deeply integrated with Anthropic's cloud models for maximum performance.",
      points: [
        "Sonnet 4.5 for daily work",
        "Opus 4.6 for reasoning",
        "Local models are secondary",
      ],
      color: "amber",
    },
    claw: {
      title: "Model Agnostic",
      desc: "Supports various backends but has strict recommendations for safety.",
      points: [
        "Strongly recommends Claude Pro/Max",
        "Opus 4.6 needed for injection resistance",
        "Local models often too limited",
      ],
      color: "emerald",
    },
  },
];

export function ToolComparison() {
  const [activeTab, setActiveTab] = useState("philosophy");

  const currentData = COMPARISON_DATA.find(d => d.id === activeTab);

  // Early return guard - COMPARISON_DATA always has matching entries
  if (!currentData) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-zinc-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full" />

      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6 tracking-tight">
              Two Philosophies
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Distinct approaches to AI autonomy. Choose the right tool for the job.
            </p>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {COMPARISON_DATA.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 border
                ${
                activeTab === tab.id
                  ? "bg-white/10 border-white/20 text-white scale-105 shadow-lg shadow-white/5"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }
              `}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Claude Side */}
              <GlassCard
                variant="claude"
                className="p-8 md:p-10 flex flex-col h-full border-t-4 border-t-amber-500"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                    <Cloud size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Claude Code</h3>
                    <p className="text-amber-500 text-sm font-mono uppercase tracking-wider">
                      {currentData.claude.title}
                    </p>
                  </div>
                </div>

                <div className="flex-grow">
                  <p className="text-zinc-300 leading-relaxed mb-6">
                    {currentData.claude.desc}
                  </p>
                  <ul className="space-y-4">
                    {currentData.claude.points.map((point, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + (i * 0.1) }}
                        className="flex items-start gap-3 text-zinc-400"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span>{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* OpenClaw Side */}
              <GlassCard
                variant="openClaw"
                className="p-8 md:p-10 flex flex-col h-full border-t-4 border-t-emerald-500"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Terminal size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">OpenClaw</h3>
                    <p className="text-emerald-500 text-sm font-mono uppercase tracking-wider">
                      {currentData.claw.title}
                    </p>
                  </div>
                </div>

                <div className="flex-grow">
                  <p className="text-zinc-300 leading-relaxed mb-6">
                    {currentData.claw.desc}
                  </p>
                  <ul className="space-y-4">
                    {currentData.claw.points.map((point, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="flex items-start gap-3 text-zinc-400"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span>{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
