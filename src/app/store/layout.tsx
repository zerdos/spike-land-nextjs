import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Store | Spike Land",
  description: "Discover MCP-powered apps that supercharge your workflow. AI image creation, brand management, social media automation, and DevOps monitoring.",
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
