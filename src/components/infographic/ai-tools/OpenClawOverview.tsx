"use client";

import { Box, Cloud, Cpu, Database, Globe, Shield, Terminal, Zap } from "lucide-react";
import React from "react";
import { AnimatedCounter, IconCarousel, ScrollReveal, TerminalMockup } from "../shared";

const CAPABILITIES = [
  { icon: <Box />, label: "Sandboxed" },
  { icon: <Shield />, label: "Secure" },
  { icon: <Zap />, label: "Fast" },
  { icon: <Globe />, label: "Web Access" },
  { icon: <Cpu />, label: "Local LLM" },
  { icon: <Database />, label: "Postgres" },
];

export function OpenClawOverview() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-gradient-to-b from-[#0c0c12] to-zinc-950 overflow-hidden">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Info */}
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 mb-6">
              <Terminal size={12} />
              <span>Local Runtime</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold font-heading mb-6 leading-tight">
              Build Agents that <span className="text-emerald-500">Run Anywhere</span>
            </h2>
            <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
              OpenClaw provides a secure, self-hosted runtime for your AI agents. No more sending
              keys to the cloud. You control the environment.
            </p>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <AnimatedCounter
                  value={1200000}
                  suffix=""
                  label="Docker Pulls"
                  numberClassName="text-3xl text-emerald-400"
                />
              </div>
              <div>
                <AnimatedCounter
                  value={450}
                  suffix="+"
                  label="Contributors"
                  numberClassName="text-3xl text-emerald-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {CAPABILITIES.map((cap, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-zinc-300 text-sm border border-white/5 hover:border-emerald-500/30 transition-colors cursor-default"
                >
                  {React.cloneElement(
                    cap.icon as React.ReactElement<{ size: number; className: string; }>,
                    { size: 16, className: "text-emerald-500" },
                  )}
                  {cap.label}
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Right: Terminal */}
          <ScrollReveal delay={0.2} className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-20" />
            <TerminalMockup
              command={[
                "npx openclaw init my-agent",
                "cd my-agent && npm start",
              ]}
              output={
                <div className="text-emerald-400 text-xs space-y-1 font-mono">
                  <div>[INFO] OpenClaw Runtime v2.0.0 initializing...</div>
                  <div className="text-gray-400">Loading secure sandbox environment</div>
                  <div className="text-gray-400">Verifying capabilities...</div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-emerald-500">✓</span> Network Access
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-emerald-500">✓</span> File System (Strict)
                  </div>
                  <div className="mt-2 text-cyan-400">
                    Agent is ready and listening on port 3000 🚀
                  </div>
                </div>
              }
            />
          </ScrollReveal>
        </div>

        {/* Marquee */}
        <div className="mt-24 pt-12 border-t border-white/5">
          <p className="text-center text-sm text-zinc-500 mb-8 uppercase tracking-widest">
            Supports All Major Platforms
          </p>
          <IconCarousel
            icons={[
              <Cloud key="aws" size={32} />,
              <Database key="db" size={32} />,
              <Globe key="web" size={32} />,
              <Terminal key="term" size={32} />,
              <Cpu key="cpu" size={32} />,
              <Box key="dock" size={32} />,
            ]}
            className="opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
