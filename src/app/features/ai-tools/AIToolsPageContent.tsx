"use client";

import {
  AIToolsHero,
  ClaudeMdConfig,
  ClaudeWorkflow,
  CriticalPitfalls,
  HybridWorkflows,
  ModelSelection,
  OpenClawOverview,
  OpenClawSecurity,
  TableOfContents,
  ToolComparison,
} from "@/components/infographic/ai-tools";

const SECTIONS = [
  { id: "hero", label: "Overview" },
  { id: "comparison", label: "Comparison" },
  { id: "workflow", label: "The Workflow" },
  { id: "claude-md", label: "Configuration" },
  { id: "models", label: "Model Selection" },
  { id: "pitfalls", label: "Critical Pitfalls" },
  { id: "openclaw", label: "OpenClaw Runtime" },
  { id: "security", label: "Security" },
  { id: "hybrid", label: "Hybrid Patterns" },
];

export function AIToolsPageContent() {
  return (
    <div className="relative bg-zinc-950 min-h-screen text-white selection:bg-emerald-500/30">
      <TableOfContents sections={SECTIONS} />

      <main>
        <section id="hero">
          <AIToolsHero />
        </section>

        <section id="comparison">
          <ToolComparison />
        </section>

        <section id="workflow">
          <ClaudeWorkflow />
        </section>

        <section id="claude-md">
          <ClaudeMdConfig />
        </section>

        <section id="models">
          <ModelSelection />
        </section>

        <section id="pitfalls">
          <CriticalPitfalls />
        </section>

        <section id="openclaw">
          <OpenClawOverview />
        </section>

        <section id="security">
          <OpenClawSecurity />
        </section>

        <section id="hybrid">
          <HybridWorkflows />
        </section>
      </main>

      <footer className="py-12 bg-[#0c0c12] border-t border-white/5 text-center text-zinc-500 text-sm">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} Spike Land Ltd. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
