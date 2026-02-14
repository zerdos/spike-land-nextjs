/**
 * Orbit Allocator MCP Tools
 *
 * Budget allocation, dashboard, audit trails, and autopilot tools for Orbit marketing.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const GetAllocationsSchema = z.object({
  workspace_slug: z.string().optional().describe("Workspace slug."),
  period: z.enum(["current", "last_month", "last_quarter"]).optional().default("current").describe("Budget period."),
});

const UpdateAllocationSchema = z.object({
  allocation_id: z.string().min(1).describe("Allocation ID."),
  amount: z.number().min(0).describe("New budget amount."),
  channel: z.string().optional().describe("Marketing channel."),
});

const CreateAllocationSchema = z.object({
  channel: z.string().min(1).describe("Marketing channel (e.g., social, email, paid)."),
  amount: z.number().min(0).describe("Budget amount."),
  period: z.string().optional().default("current").describe("Budget period."),
});

const GetDashboardSchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional().default("30d").describe("Dashboard period."),
});

const GetAuditTrailSchema = z.object({
  campaign_id: z.string().optional().describe("Filter by campaign ID."),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
});

const SetAutopilotSchema = z.object({
  enabled: z.boolean().describe("Enable or disable autopilot."),
  workspace_id: z.string().min(1).describe("Workspace ID."),
  campaign_id: z.string().optional().describe("Campaign ID (optional, for campaign-specific config)."),
});

const GetAutopilotStatusSchema = z.object({
  workspace_id: z.string().min(1).describe("Workspace ID."),
});

export function registerOrbitAllocatorTools(
  registry: ToolRegistry,
  _userId: string,
): void {
  registry.register({
    name: "allocator_get_allocations",
    description: "Get current budget allocations across marketing channels. Note: Per-channel allocation tracking is not yet available; returns campaign-level daily budget moves.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetAllocationsSchema.shape,
    handler: async ({ period: _period = "current" }: z.infer<typeof GetAllocationsSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_get_allocations", async () => {
        return textResult(
          "**Allocator - Get Allocations**\n\n" +
          "Per-channel budget allocation tracking is not yet available. " +
          "The current schema supports campaign-level daily budget moves via `AllocatorDailyBudgetMove`. " +
          "Use `allocator_dashboard` to view campaign-level budget data."
        );
      }),
  });

  registry.register({
    name: "allocator_update_allocation",
    description: "Update a budget allocation amount or channel. Note: Direct allocation updates are not yet supported; use campaign budget management instead.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: UpdateAllocationSchema.shape,
    handler: async ({ allocation_id: _allocation_id }: z.infer<typeof UpdateAllocationSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_update_allocation", async () => {
        return textResult(
          "**Allocator - Update Allocation**\n\n" +
          "Direct per-channel allocation updates are not yet available. " +
          "Budget changes are managed through autopilot executions and campaign-level budget adjustments."
        );
      }),
  });

  registry.register({
    name: "allocator_create_allocation",
    description: "Create a new budget allocation for a marketing channel. Note: Per-channel allocation creation is not yet available.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: CreateAllocationSchema.shape,
    handler: async ({ channel: _channel }: z.infer<typeof CreateAllocationSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_create_allocation", async () => {
        return textResult(
          "**Allocator - Create Allocation**\n\n" +
          "Per-channel budget allocation creation is not yet available. " +
          "Budget allocations are tracked at the campaign level via `AllocatorCampaign`."
        );
      }),
  });

  registry.register({
    name: "allocator_dashboard",
    description: "Get an overview dashboard of budget performance across all campaigns.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetDashboardSchema.shape,
    handler: async ({ period = "30d" }: z.infer<typeof GetDashboardSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_dashboard", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const now = new Date();
        const daysBack = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        const moves = await prisma.allocatorDailyBudgetMove.findMany({
          where: { date: { gte: since } },
          select: { id: true, campaignId: true, totalMoved: true, netChange: true, executionCount: true, date: true },
        });
        if (moves.length === 0) {
          return textResult(`**Allocator Dashboard (${period}):**\n\nNo budget moves found in the last ${daysBack} days.`);
        }
        const totalMoved = moves.reduce((s, m) => s + Number(m.totalMoved), 0);
        const totalNetChange = moves.reduce((s, m) => s + Number(m.netChange), 0);
        const totalExecutions = moves.reduce((s, m) => s + m.executionCount, 0);
        const uniqueCampaigns = new Set(moves.map((m) => m.campaignId)).size;
        let text = `**Allocator Dashboard (${period}):**\n\n`;
        text += `**Total Moved:** $${totalMoved.toFixed(2)}\n`;
        text += `**Net Change:** $${totalNetChange.toFixed(2)}\n`;
        text += `**Total Executions:** ${totalExecutions}\n`;
        text += `**Campaigns:** ${uniqueCampaigns}\n`;
        text += `**Budget Moves:** ${moves.length}\n`;
        return textResult(text);
      }),
  });

  registry.register({
    name: "allocator_audit_trail",
    description: "View audit trail of allocator budget decisions and changes.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetAuditTrailSchema.shape,
    handler: async ({ campaign_id, limit = 20 }: z.infer<typeof GetAuditTrailSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_audit_trail", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where: Record<string, unknown> = {};
        if (campaign_id) where["campaignId"] = campaign_id;
        const entries = await prisma.allocatorAuditLog.findMany({
          where,
          select: {
            id: true,
            decisionType: true,
            decisionOutcome: true,
            aiReasoning: true,
            triggeredBy: true,
            createdAt: true,
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (entries.length === 0) return textResult("No audit entries found.");
        let text = `**Audit Trail (${entries.length} entries):**\n\n`;
        for (const e of entries) {
          text += `- **${e.decisionType}** (${e.decisionOutcome}) at ${e.createdAt.toISOString()}\n`;
          text += `  Triggered by: ${e.triggeredBy}\n`;
          if (e.aiReasoning) text += `  Reasoning: ${e.aiReasoning}\n`;
          text += `  ID: ${e.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "allocator_set_autopilot",
    description: "Enable or disable autopilot budget optimization for a workspace.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: SetAutopilotSchema.shape,
    handler: async ({ enabled, workspace_id, campaign_id }: z.infer<typeof SetAutopilotSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_set_autopilot", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.allocatorAutopilotConfig.upsert({
          where: { workspaceId_campaignId: { workspaceId: workspace_id, campaignId: campaign_id ?? "" } },
          create: {
            workspaceId: workspace_id,
            campaignId: campaign_id,
            isEnabled: enabled,
          },
          update: { isEnabled: enabled },
        });
        return textResult(
          `**Autopilot ${enabled ? "Enabled" : "Disabled"}!**\n\n` +
          `**Workspace:** ${workspace_id}\n` +
          (campaign_id ? `**Campaign:** ${campaign_id}\n` : "")
        );
      }),
  });

  registry.register({
    name: "allocator_autopilot_status",
    description: "Get current autopilot configuration and status for a workspace.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetAutopilotStatusSchema.shape,
    handler: async ({ workspace_id }: z.infer<typeof GetAutopilotStatusSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_autopilot_status", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const configs = await prisma.allocatorAutopilotConfig.findMany({
          where: { workspaceId: workspace_id },
          select: {
            id: true,
            campaignId: true,
            isEnabled: true,
            mode: true,
            maxDailyBudgetChange: true,
            maxSingleChange: true,
            isEmergencyStopped: true,
            createdAt: true,
          },
        });
        if (configs.length === 0) {
          return textResult("**Autopilot:** Not configured for this workspace.\n\nUse `allocator_set_autopilot` to enable.");
        }
        let text = `**Autopilot Status (${configs.length} config(s)):**\n\n`;
        for (const config of configs) {
          text += `- **Config ID:** ${config.id}\n`;
          text += `  **Campaign:** ${config.campaignId || "workspace-wide"}\n`;
          text += `  **Enabled:** ${config.isEnabled}\n`;
          text += `  **Mode:** ${config.mode}\n`;
          text += `  **Max Daily Budget Change:** $${Number(config.maxDailyBudgetChange).toFixed(2)}\n`;
          text += `  **Max Single Change:** $${Number(config.maxSingleChange).toFixed(2)}\n`;
          text += `  **Emergency Stopped:** ${config.isEmergencyStopped}\n\n`;
        }
        return textResult(text);
      }),
  });
}
