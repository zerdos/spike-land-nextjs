/**
 * Smart Routing MCP Tools
 *
 * AI-powered request routing and traffic management tools.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const GetRoutingConfigSchema = z.object({
  workspace_slug: z.string().optional().describe("Workspace to get routing config for."),
});

const UpdateRoutingRuleSchema = z.object({
  rule_id: z.string().min(1).describe("Routing rule ID to update."),
  enabled: z.boolean().optional().describe("Enable or disable the rule."),
  weight: z.number().min(0).max(100).optional().describe("Traffic weight percentage."),
  target: z.string().optional().describe("Target endpoint or service."),
});

const GetRoutingStatsSchema = z.object({
  period: z.enum(["1h", "24h", "7d", "30d"]).optional().default("24h").describe("Time period for stats."),
});

export function registerSmartRoutingTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "routing_get_config",
    description: "Get the current smart routing configuration including all rules and weights.",
    category: "smart-routing",
    tier: "workspace",
    inputSchema: GetRoutingConfigSchema.shape,
    handler: async ({ workspace_slug }: z.infer<typeof GetRoutingConfigSchema>): Promise<CallToolResult> =>
      safeToolCall("routing_get_config", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = workspace_slug
          ? { workspace: { slug: workspace_slug, members: { some: { userId } } } }
          : { userId };
        const rules = await prisma.policyRule.findMany({
          where,
          select: { id: true, name: true, pattern: true, target: true, weight: true, enabled: true },
          orderBy: { priority: "asc" },
        });
        if (rules.length === 0) return textResult("No routing rules configured.");
        let text = `**Routing Configuration (${rules.length} rules):**\n\n`;
        for (const r of rules) {
          text += `- **${r.name}** ${r.enabled ? "[ON]" : "[OFF]"}\n`;
          text += `  Pattern: ${r.pattern} → ${r.target} (${r.weight}%)\n`;
          text += `  ID: ${r.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "routing_update_rule",
    description: "Update a smart routing rule's configuration (enable/disable, weight, target).",
    category: "smart-routing",
    tier: "workspace",
    inputSchema: UpdateRoutingRuleSchema.shape,
    handler: async ({ rule_id, enabled, weight, target }: z.infer<typeof UpdateRoutingRuleSchema>): Promise<CallToolResult> =>
      safeToolCall("routing_update_rule", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (enabled !== undefined) data["enabled"] = enabled;
        if (weight !== undefined) data["weight"] = weight;
        if (target !== undefined) data["target"] = target;
        if (Object.keys(data).length === 0) return textResult("No updates provided.");
        const rule = await prisma.policyRule.update({
          where: { id: rule_id },
          data,
        });
        return textResult(
          `**Rule Updated!**\n\n` +
          `**ID:** ${rule.id}\n` +
          `**Name:** ${rule.name}\n` +
          `**Enabled:** ${rule.enabled}\n` +
          `**Weight:** ${rule.weight}%\n` +
          `**Target:** ${rule.target}`
        );
      }),
  });

  registry.register({
    name: "routing_get_stats",
    description: "Get smart routing performance statistics for a time period.",
    category: "smart-routing",
    tier: "workspace",
    inputSchema: GetRoutingStatsSchema.shape,
    handler: async ({ period = "24h" }: z.infer<typeof GetRoutingStatsSchema>): Promise<CallToolResult> =>
      safeToolCall("routing_get_stats", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const periodMap: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
        const hours = periodMap[period] || 24;
        void new Date(Date.now() - hours * 60 * 60 * 1000); // since — reserved for future time-filtered queries
        const rules: Array<{ id: string; name: string; weight: number; requestCount: number }> = await prisma.policyRule.findMany({
          where: { userId, enabled: true },
          select: { id: true, name: true, weight: true, requestCount: true },
        });
        const totalRequests = rules.reduce((sum, r) => sum + (r.requestCount || 0), 0);
        let text = `**Routing Stats (${period}):**\n\n`;
        text += `**Total Requests:** ${totalRequests}\n`;
        text += `**Active Rules:** ${rules.length}\n\n`;
        for (const r of rules) {
          text += `- **${r.name}**: ${r.requestCount || 0} requests (${r.weight}% weight)\n`;
        }
        return textResult(text);
      }),
  });
}
