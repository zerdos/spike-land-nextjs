import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BAZDMEG | The Quality First Manifesto",
  description: "Seven principles for AI-assisted development. Discipline before automation. Context is architecture. Own what you ship.",
};

export default function BazdmegLayout({
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
