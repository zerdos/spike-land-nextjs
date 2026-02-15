import type { Metadata } from "next";
import { AIToolsPageContent } from "./AIToolsPageContent";

export const metadata: Metadata = {
  title: "AI Tools | Claude Code & OpenClaw",
  description:
    "Master the next generation of AI-assisted development. Compare Claude Code workflows with OpenClaw local execution.",
};

export default function AIToolsPage() {
  return <AIToolsPageContent />;
}
