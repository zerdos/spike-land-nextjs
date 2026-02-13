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
  allocation_id: z.string().optional().describe("Filter by allocation ID."),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
});

const SetAutopilotSchema = z.object({
  enabled: z.boolean().describe("Enable or disable autopilot."),
  max_daily_spend: z.number().min(0).optional().describe("Max daily spend limit."),
  channels: z.array(z.string()).optional().describe("Channels to include in autopilot."),
});

const GetAutopilotStatusSchema = z.object({});

export function registerOrbitAllocatorTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "allocator_get_allocations",
    description: "Get current budget allocations across marketing channels.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetAllocationsSchema.shape,
    handler: async ({ period = "current" }: z.infer<typeof GetAllocationsSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_get_allocations", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const allocations = await prisma.allocatorDailyBudgetMove.findMany({
          where: { userId, period },
          select: { id: true, channel: true, amount: true, spent: true, period: true },
          orderBy: { amount: "desc" },
        });
        if (allocations.length === 0) return textResult(`No allocations found for period "${period}".`);
        const totalBudget = allocations.reduce((s, a) => s + a.amount, 0);
        const totalSpent = allocations.reduce((s, a) => s + (a.spent || 0), 0);
        let text = `**Budget Allocations (${period}):**\n\n`;
        text += `**Total Budget:** $${totalBudget.toFixed(2)}\n`;
        text += `**Total Spent:** $${totalSpent.toFixed(2)}\n\n`;
        for (const a of allocations) {
          const pct = a.amount > 0 ? (((a.spent || 0) / a.amount) * 100).toFixed(1) : "0.0";
          text += `- **${a.channel}**: $${(a.spent || 0).toFixed(2)} / $${a.amount.toFixed(2)} (${pct}%)\n  ID: ${a.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "allocator_update_allocation",
    description: "Update a budget allocation amount or channel.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: UpdateAllocationSchema.shape,
    handler: async ({ allocation_id, amount, channel }: z.infer<typeof UpdateAllocationSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_update_allocation", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = { amount };
        if (channel) data.channel = channel;
        const allocation = await prisma.allocatorDailyBudgetMove.update({
          where: { id: allocation_id },
          data,
        });
        return textResult(`**Allocation Updated!**\n\n**ID:** ${allocation.id}\n**Channel:** ${allocation.channel}\n**Amount:** $${allocation.amount.toFixed(2)}`);
      }),
  });

  registry.register({
    name: "allocator_create_allocation",
    description: "Create a new budget allocation for a marketing channel.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: CreateAllocationSchema.shape,
    handler: async ({ channel, amount, period = "current" }: z.infer<typeof CreateAllocationSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_create_allocation", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const allocation = await prisma.allocatorDailyBudgetMove.create({
          data: { channel, amount, spent: 0, period, userId },
        });
        return textResult(`**Allocation Created!**\n\n**ID:** ${allocation.id}\n**Channel:** ${channel}\n**Amount:** $${amount.toFixed(2)}\n**Period:** ${period}`);
      }),
  });

  registry.register({
    name: "allocator_dashboard",
    description: "Get an overview dashboard of budget performance across all channels.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetDashboardSchema.shape,
    handler: async ({ period = "30d" }: z.infer<typeof GetDashboardSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_dashboard", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const allocations = await prisma.allocatorDailyBudgetMove.findMany({
          where: { userId },
          select: { channel: true, amount: true, spent: true },
        });
        const totalBudget = allocations.reduce((s, a) => s + a.amount, 0);
        const totalSpent = allocations.reduce((s, a) => s + (a.spent || 0), 0);
        const utilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0.0";
        let text = `**Allocator Dashboard (${period}):**\n\n`;
        text += `**Total Budget:** $${totalBudget.toFixed(2)}\n`;
        text += `**Total Spent:** $${totalSpent.toFixed(2)}\n`;
        text += `**Utilization:** ${utilization}%\n`;
        text += `**Channels:** ${allocations.length}\n`;
        return textResult(text);
      }),
  });

  registry.register({
    name: "allocator_audit_trail",
    description: "View audit trail of budget changes and transactions.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetAuditTrailSchema.shape,
    handler: async ({ allocation_id, limit = 20 }: z.infer<typeof GetAuditTrailSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_audit_trail", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = allocation_id ? { allocationId: allocation_id, userId } : { userId };
        const entries = await prisma.auditLog.findMany({
          where,
          select: { id: true, action: true, details: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (entries.length === 0) return textResult("No audit entries found.");
        let text = `**Audit Trail (${entries.length} entries):**\n\n`;
        for (const e of entries) {
          text += `- **${e.action}** at ${e.createdAt.toISOString()}\n  ${e.details || "(no details)"}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "allocator_set_autopilot",
    description: "Enable or disable autopilot budget optimization.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: SetAutopilotSchema.shape,
    handler: async ({ enabled, max_daily_spend, channels }: z.infer<typeof SetAutopilotSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_set_autopilot", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.allocatorAutopilotConfig.upsert({
          where: { userId },
          create: { userId, enabled, maxDailySpend: max_daily_spend, channels: channels || [] },
          update: { enabled, ...(max_daily_spend !== undefined ? { maxDailySpend: max_daily_spend } : {}), ...(channels ? { channels } : {}) },
        });
        return textResult(`**Autopilot ${enabled ? "Enabled" : "Disabled"}!**\n\n${max_daily_spend ? `**Max Daily Spend:** $${max_daily_spend}\n` : ""}${channels ? `**Channels:** ${channels.join(", ")}` : ""}`);
      }),
  });

  registry.register({
    name: "allocator_autopilot_status",
    description: "Get current autopilot configuration and status.",
    category: "orbit-allocator",
    tier: "workspace",
    inputSchema: GetAutopilotStatusSchema.shape,
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("allocator_autopilot_status", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const config = await prisma.allocatorAutopilotConfig.findUnique({ where: { userId } });
        if (!config) return textResult("**Autopilot:** Not configured.\n\nUse `allocator_set_autopilot` to enable.");
        return textResult(
          `**Autopilot Status**\n\n` +
          `**Enabled:** ${config.enabled}\n` +
          `**Max Daily Spend:** ${config.maxDailySpend ? `$${config.maxDailySpend}` : "unlimited"}\n` +
          `**Channels:** ${(config.channels as string[])?.join(", ") || "all"}`
        );
      }),
  });
}
