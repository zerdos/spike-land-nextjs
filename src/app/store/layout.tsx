import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skill Store | Spike Land",
  description: "Browse and install Claude Code skills for AI-assisted development. Quality gates, testing frameworks, and workflow automation.",
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-950 min-h-screen selection:bg-amber-500/30">
      {children}
    </div>
  );
}
