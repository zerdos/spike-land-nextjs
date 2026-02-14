/**
 * Sentry Bridge MCP Tools
 *
 * Tools for querying Sentry issues, details, and project statistics.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

export function registerSentryBridgeTools(registry: ToolRegistry, _userId: string): void {
  registry.register({
    name: "sentry_issues",
    description: "List recent Sentry issues for the project. Requires SENTRY_MCP_AUTH_TOKEN.",
    category: "sentry",
    tier: "workspace",
    inputSchema: {
      query: z.string().optional().describe("Search query for filtering issues"),
      limit: z.number().int().min(1).max(100).optional().default(25),
    },
    handler: async ({ query, limit = 25 }: { query?: string; limit?: number }): Promise<CallToolResult> =>
      safeToolCall("sentry_issues", async () => {
        if (!process.env.SENTRY_MCP_AUTH_TOKEN) return textResult("Sentry not configured (SENTRY_MCP_AUTH_TOKEN missing).");
        const { listSentryIssues } = await import("@/lib/bridges/sentry");
        const issues = await listSentryIssues({ query, limit });
        if (!issues || issues.length === 0) return textResult("No Sentry issues found.");
        let text = `**Sentry Issues (${issues.length}):**\n\n`;
        for (const issue of issues) {
          text += `- **${issue.title}** [${issue.level}/${issue.status}]\n  Events: ${issue.count} | First: ${issue.firstSeen} | Last: ${issue.lastSeen}\n  ID: ${issue.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "sentry_issue_detail",
    description: "Get detailed information about a specific Sentry issue.",
    category: "sentry",
    tier: "workspace",
    inputSchema: { issue_id: z.string().min(1).describe("Sentry issue ID") },
    handler: async ({ issue_id }: { issue_id: string }): Promise<CallToolResult> =>
      safeToolCall("sentry_issue_detail", async () => {
        if (!process.env.SENTRY_MCP_AUTH_TOKEN) return textResult("Sentry not configured.");
        const { getSentryIssueDetail } = await import("@/lib/bridges/sentry");
        const issue = await getSentryIssueDetail(issue_id);
        if (!issue) return textResult("Issue not found.");
        return textResult(
          `**Sentry Issue: ${issue.title}**\n\n` +
          `- Type: ${issue.type}\n- Level: ${issue.level}\n- Status: ${issue.status}\n` +
          `- Events: ${issue.count}\n- First seen: ${issue.firstSeen}\n- Last seen: ${issue.lastSeen}\n` +
          `- Culprit: ${issue.culprit}\n- Link: ${issue.permalink}`,
        );
      }),
  });

  registry.register({
    name: "sentry_stats",
    description: "Get project error statistics from Sentry.",
    category: "sentry",
    tier: "workspace",
    inputSchema: {},
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("sentry_stats", async () => {
        if (!process.env.SENTRY_MCP_AUTH_TOKEN) return textResult("Sentry not configured.");
        const { getSentryStats } = await import("@/lib/bridges/sentry");
        const stats = await getSentryStats();
        if (!stats) return textResult("Could not fetch Sentry stats.");
        const totalReceived = stats.received.reduce((a, b) => a + b, 0);
        const totalRejected = stats.rejected.reduce((a, b) => a + b, 0);
        return textResult(
          `**Sentry Stats:**\n\n` +
          `- Total received: ${totalReceived}\n- Total rejected: ${totalRejected}\n` +
          `- Data points: ${stats.received.length}`,
        );
      }),
  });
}
