import { McpPageClient } from "@/components/mcp/McpPageClient";
import { TOTAL_TOOL_COUNT } from "@/components/mcp/mcp-tool-registry";
import type { Metadata } from "next";

const desc = `${TOTAL_TOOL_COUNT} AI tools with Progressive Context Disclosure. Connect your AI agent to spike.land's MCP server.`;

export const metadata: Metadata = {
  title: "MCP Server - Spike Land",
  description: desc,
  openGraph: {
    title: "MCP Server - Spike Land",
    description: desc,
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Server - Spike Land",
    description: desc,
  },
};

export default function McpPage() {
  return <McpPageClient />;
}
