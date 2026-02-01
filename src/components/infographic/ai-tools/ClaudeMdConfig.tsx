"use client";

import { AlertTriangle, FileText } from "lucide-react";
import { CodeEditorMockup, GlassCard, ProgressGauge, ScrollReveal } from "../shared";

const GOOD_CONFIG = `# CLAUDE.md - Rules and Guidelines

## Build Commands
- Build: \`yarn build\`
- Test: \`yarn test:unit\`
- Lint: \`yarn lint\`

## Code Style
- Use functional components
- Prefer interface over type
- Tailwind for styling
`;

const BAD_CONFIG = `# Project Notes (DO NOT USE)

- This project is kinda messy
- Use that one weird script in /bin
- Don't touch the legacy folder
- Passwords are in sticky notes.txt
`;

export function ClaudeMdConfig() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-zinc-950">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="flex items-center gap-4 mb-12">
            <div className="px-4 py-2 rounded bg-indigo-500/20 text-indigo-400 font-mono text-sm border border-indigo-500/30">
              CLAUDE.md
            </div>
            <h2 className="text-3xl font-bold text-white">Context Optimization</h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Editor Showcase */}
          <ScrollReveal delay={0.2}>
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute -top-3 -left-3 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded shadow-lg z-10">
                  RECOMMENDED
                </div>
                <CodeEditorMockup
                  filename="CLAUDE.md"
                  code={GOOD_CONFIG}
                  variant="good"
                  className="h-64"
                />
              </div>

              <div className="relative opacity-60 hover:opacity-100 transition-opacity">
                <div className="absolute -top-3 -left-3 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded shadow-lg z-10">
                  AVOID
                </div>
                <CodeEditorMockup
                  filename="legacy_notes.txt"
                  code={BAD_CONFIG}
                  variant="bad"
                  className="h-48"
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Metrics & Info */}
          <div className="space-y-8">
            <ScrollReveal delay={0.4}>
              <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileText className="text-blue-400" />
                  Context Efficiency
                </h3>

                <div className="space-y-8">
                  <ProgressGauge
                    value={95}
                    label="Relevance Store (with CLAUDE.md)"
                    color="#10B981"
                  />
                  <ProgressGauge
                    value={40}
                    label="Relevance Store (without guidelines)"
                    color="#EF4444"
                  />
                </div>
              </GlassCard>
            </ScrollReveal>

            <ScrollReveal delay={0.6}>
              <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <div className="flex gap-3 mb-2">
                  <AlertTriangle className="text-amber-500 flex-shrink-0" />
                  <h4 className="font-bold">Anti-Pattern Warning</h4>
                </div>
                <p className="text-sm opacity-80 pl-9">
                  Don't treat CLAUDE.md as a documentation dump. Keep it actionable: commands, style
                  definitions, and architecture constraints only.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
