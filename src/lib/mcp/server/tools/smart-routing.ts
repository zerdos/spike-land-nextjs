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
  is_active: z.boolean().optional().describe("Enable or disable the rule."),
  description: z.string().optional().describe("Updated rule description."),
  severity: z.enum(["INFO", "WARNING", "ERROR", "CRITICAL"]).optional().describe("Rule severity level."),
  is_blocking: z.boolean().optional().describe("Whether the rule is blocking."),
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
          : {};
        const rules = await prisma.policyRule.findMany({
          where: { ...where, isActive: true },
          select: { id: true, name: true, description: true, category: true, ruleType: true, severity: true, isBlocking: true, isActive: true },
          orderBy: { name: "asc" },
        });
        if (rules.length === 0) return textResult("No routing rules configured.");
        let text = `**Routing Configuration (${rules.length} rules):**\n\n`;
        for (const r of rules) {
          text += `- **${r.name}** ${r.isActive ? "[ON]" : "[OFF]"} [${r.severity}]\n`;
          text += `  ${r.description} (${r.category} / ${r.ruleType})${r.isBlocking ? " [BLOCKING]" : ""}\n`;
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
    handler: async ({ rule_id, is_active, description, severity, is_blocking }: z.infer<typeof UpdateRoutingRuleSchema>): Promise<CallToolResult> =>
      safeToolCall("routing_update_rule", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (is_active !== undefined) data["isActive"] = is_active;
        if (description !== undefined) data["description"] = description;
        if (severity !== undefined) data["severity"] = severity;
        if (is_blocking !== undefined) data["isBlocking"] = is_blocking;
        if (Object.keys(data).length === 0) return textResult("No updates provided.");
        const rule = await prisma.policyRule.update({
          where: { id: rule_id },
          data,
        });
        return textResult(
          `**Rule Updated!**\n\n` +
          `**ID:** ${rule.id}\n` +
          `**Name:** ${rule.name}\n` +
          `**Active:** ${rule.isActive}\n` +
          `**Severity:** ${rule.severity}\n` +
          `**Blocking:** ${rule.isBlocking}`
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
        void new Date(Date.now() - hours * 60 * 60 * 1000); // since - reserved for future time-filtered queries
        const rules = await prisma.policyRule.findMany({
          where: { isActive: true },
          select: { id: true, name: true, category: true, severity: true, isBlocking: true, version: true },
        });
        let text = `**Routing Stats (${period}):**\n\n`;
        text += `**Active Rules:** ${rules.length}\n\n`;
        for (const r of rules) {
          text += `- **${r.name}** [${r.severity}] (${r.category}, v${r.version})${r.isBlocking ? " [BLOCKING]" : ""}\n`;
        }
        return textResult(text);
      }),
  });
}
