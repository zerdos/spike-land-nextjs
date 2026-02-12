import { McpPageClient } from "@/components/mcp/McpPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Server - Spike Land",
  description:
    "34 AI tools with Progressive Context Disclosure. Connect your AI agent to spike.land's MCP server.",
  openGraph: {
    title: "MCP Server - Spike Land",
    description:
      "34 AI tools with Progressive Context Disclosure. Connect your AI agent to spike.land's MCP server.",
  },
};

export default function McpPage() {
  return <McpPageClient />;
}
