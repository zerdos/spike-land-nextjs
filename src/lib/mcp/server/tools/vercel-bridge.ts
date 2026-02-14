/**
 * Vercel Bridge MCP Tools
 *
 * Tools for querying Vercel deployments, deployment details, and analytics.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

export function registerVercelBridgeTools(registry: ToolRegistry, _userId: string): void {
  registry.register({
    name: "vercel_deployments",
    description: "List recent Vercel deployments. Requires VERCEL_TOKEN.",
    category: "vercel",
    tier: "workspace",
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional().default(20),
      state: z.string().optional().describe("Filter by deployment state (e.g. READY, ERROR, BUILDING)"),
    },
    handler: async ({ limit = 20, state }: { limit?: number; state?: string }): Promise<CallToolResult> =>
      safeToolCall("vercel_deployments", async () => {
        if (!process.env["VERCEL_TOKEN"]) return textResult("Vercel not configured (VERCEL_TOKEN missing).");
        const { listVercelDeployments } = await import("@/lib/bridges/vercel");
        const deployments = await listVercelDeployments({ limit, state });
        if (!deployments || deployments.length === 0) return textResult("No Vercel deployments found.");
        let text = `**Vercel Deployments (${deployments.length}):**\n\n`;
        for (const d of deployments) {
          const createdAt = new Date(d.created).toISOString();
          text += `- **${d.name}** [${d.state}]\n  URL: ${d.url}\n  Source: ${d.source} | Created: ${createdAt}\n  UID: ${d.uid}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "vercel_deployment_detail",
    description: "Get detailed information about a specific Vercel deployment.",
    category: "vercel",
    tier: "workspace",
    inputSchema: { deployment_id: z.string().min(1).describe("Vercel deployment UID") },
    handler: async ({ deployment_id }: { deployment_id: string }): Promise<CallToolResult> =>
      safeToolCall("vercel_deployment_detail", async () => {
        if (!process.env["VERCEL_TOKEN"]) return textResult("Vercel not configured.");
        const { getVercelDeployment } = await import("@/lib/bridges/vercel");
        const d = await getVercelDeployment(deployment_id);
        if (!d) return textResult("Deployment not found.");
        return textResult(
          `**Vercel Deployment: ${d.name}**\n\n` +
          `- State: ${d.readyState}\n- URL: ${d.url}\n` +
          `- Aliases: ${d.alias.length > 0 ? d.alias.join(", ") : "none"}\n` +
          `- Regions: ${d.regions.join(", ")}\n` +
          `- Source: ${d.source}\n- Inspector: ${d.inspectorUrl}`,
        );
      }),
  });

  registry.register({
    name: "vercel_analytics",
    description: "Get Vercel analytics data (page views, visitors, bounce rate).",
    category: "vercel",
    tier: "workspace",
    inputSchema: {},
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("vercel_analytics", async () => {
        if (!process.env["VERCEL_TOKEN"]) return textResult("Vercel not configured.");
        const { getVercelAnalytics } = await import("@/lib/bridges/vercel");
        const analytics = await getVercelAnalytics();
        if (!analytics) return textResult("Could not fetch Vercel analytics.");
        let text =
          `**Vercel Analytics:**\n\n` +
          `- Page views: ${analytics.pageViews}\n- Visitors: ${analytics.visitors}\n` +
          `- Bounce rate: ${analytics.bounceRate}%\n- Avg duration: ${analytics.avgDuration}s\n`;
        if (analytics.topPages.length > 0) {
          text += `\n**Top Pages:**\n`;
          for (const page of analytics.topPages) {
            text += `- ${page.path}: ${page.views} views\n`;
          }
        }
        return textResult(text);
      }),
  });
}
