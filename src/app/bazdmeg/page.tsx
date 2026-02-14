"use client";

import { 
  BazdmegHero, 
  PrincipleCard, 
  EffortSplit, 
  QualityCheckpoints, 
  HourglassModel 
} from "@/components/bazdmeg";
import { 
  FileText, 
  Zap, 
  Layers, 
  ShieldCheck, 
  GitPullRequest, 
  Briefcase, 
  Box
} from "lucide-react";
import { TableOfContents } from "@/components/infographic/ai-tools/TableOfContents";

const PRINCIPLES = [
  {
    id: 1,
    title: "Requirements Are The Product",
    oneLiner: "The code is just the output. If you don't know the 'what', the AI will give you anything.",
    color: "#EF4444",
    icon: FileText
  },
  {
    id: 2,
    title: "Discipline Before Automation",
    oneLiner: "You cannot automate chaos. Fast garbage is still garbage.",
    color: "#F59E0B",
    icon: Zap
  },
  {
    id: 3,
    title: "Context Is Architecture",
    oneLiner: "What the model knows determines what it builds. Manage context like code.",
    color: "#3B82F6",
    icon: Layers
  },
  {
    id: 4,
    title: "Test The Lies",
    oneLiner: "LLMs are professional liars. Unit tests, E2E tests, and agent audits are your only truth.",
    color: "#10B981",
    icon: ShieldCheck
  },
  {
    id: 5,
    title: "Orchestrate, Do Not Operate",
    oneLiner: "Coordinate agents, not keystrokes. Think like a conductor, not a typist.",
    color: "#8B5CF6",
    icon: Briefcase
  },
  {
    id: 6,
    title: "Trust Is Earned In PRs",
    oneLiner: "Not in promises, not in demos. If the PR diff is a mess, the feature is a mess.",
    color: "#EC4899",
    icon: GitPullRequest
  },
  {
    id: 7,
    title: "Own What You Ship",
    oneLiner: "If you cannot explain it at 3am, do not ship it. You are responsible for the AI's output.",
    color: "#6366F1",
    icon: Box
  }
];

const SECTIONS = [
  { id: "hero", label: "Manifesto" },
  { id: "principles", label: "Principles" },
  { id: "effort", label: "Effort Split" },
  { id: "checkpoints", label: "Checkpoints" },
  { id: "hourglass", label: "Hourglass Model" },
  { id: "cta", label: "Get Started" },
];

export default function BazdmegPage() {
  return (
    <div className="relative text-white pb-32">
      <TableOfContents sections={SECTIONS} />

      <main>
        <section id="hero">
          <BazdmegHero />
        </section>

        <section id="principles" className="py-24 bg-zinc-950/50">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-bold mb-4">The Seven Principles</h2>
              <p className="text-zinc-400">
                Core values that separate "Agentic Developers" from those drowned in AI slop.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {PRINCIPLES.map((principle, i) => (
                <PrincipleCard key={principle.id} principle={principle} index={i} />
              ))}
            </div>
          </div>
        </section>

        <section id="effort" className="py-24 border-y border-white/5 bg-gradient-to-b from-transparent to-zinc-900/20">
          <div className="container mx-auto px-6 max-w-5xl">
            <EffortSplit />
          </div>
        </section>

        <section id="checkpoints" className="py-24">
          <div className="container mx-auto px-6">
            <QualityCheckpoints />
          </div>
        </section>

        <section id="hourglass" className="py-24 bg-zinc-900/30">
          <div className="container mx-auto px-6">
            <HourglassModel />
          </div>
        </section>

        <section id="cta" className="py-24">
          <div className="container mx-auto px-6 text-center max-w-3xl">
            <div className="bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-white/10 rounded-3xl p-12 backdrop-blur-xl">
              <h2 className="text-4xl font-black mb-6">Ready to stop coding and start orchestrating?</h2>
              <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
                Add the <code className="text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">bazdmeg</code> skill to your AI agent and enforce quality gates today.
              </p>
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <a
                  href="/store/skills/bazdmeg"
                  className="px-10 py-5 bg-white text-zinc-950 font-black rounded-2xl hover:bg-zinc-100 transition-all shadow-xl"
                >
                  Adopt the Skill
                </a>
                <a 
                  href="https://github.com/zerdos/spike-land-nextjs"
                  className="px-10 py-5 bg-zinc-900 text-white font-black rounded-2xl border border-white/10 hover:bg-zinc-800 transition-all"
                >
                  Join the Community
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-zinc-950 border-t border-white/5 text-center text-zinc-500 text-sm">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} Spike Land Ltd. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="/store/skills" className="hover:text-white transition-colors">Skill Store</a>
            <a href="https://github.com/zerdos/spike-land-nextjs" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://discord.com" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
