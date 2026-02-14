/**
 * Allocator MCP Tools
 *
 * Budget allocation recommendations, campaign management, audit logs,
 * and guardrail configuration for ad spend optimization.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const GetRecommendationsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  campaign_id: z.string().optional().describe("Filter recommendations by campaign ID."),
});

const ListCampaignsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  platform: z.string().optional().describe("Filter by platform: FACEBOOK_ADS, GOOGLE_ADS, or LINKEDIN_ADS."),
});

const GetBenchmarksSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  campaign_id: z.string().min(1).describe("Campaign ID to get benchmarks for."),
});

const ExecuteMoveSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  execution_id: z.string().min(1).describe("Execution ID to approve."),
  confirm: z.boolean().describe("Must be true to confirm execution."),
});

const GetAuditLogSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  campaign_id: z.string().optional().describe("Filter audit log by campaign ID."),
  limit: z.number().optional().default(20).describe("Max entries to return (default 20)."),
});

const SetGuardrailsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  campaign_id: z.string().optional().describe("Campaign ID (workspace-wide if omitted)."),
  max_daily_budget_change: z.number().optional().describe("Max daily budget change in currency."),
  max_single_change: z.number().optional().describe("Max single budget adjustment."),
  min_roas_threshold: z.number().optional().describe("Minimum ROAS before pausing."),
  max_cpa_threshold: z.number().optional().describe("Maximum CPA threshold."),
  pause_on_anomaly: z.boolean().optional().describe("Pause allocations on metric anomaly."),
});

export function registerAllocatorTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "allocator_get_recommendations",
    description: "Get pending budget allocation recommendations for a workspace, optionally filtered by campaign.",
    category: "allocator",
    tier: "free",
    inputSchema: GetRecommendationsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetRecommendationsSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_get_recommendations", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = {
          workspaceId: workspace.id,
          status: "PENDING",
        };
        if (args.campaign_id) where["campaignId"] = args.campaign_id;
        const executions = await prisma.allocatorAutopilotExecution.findMany({
          where,
          orderBy: { executedAt: "desc" },
          take: 10,
          include: {
            campaign: { select: { name: true, platform: true } },
          },
        });
        if (executions.length === 0) {
          return textResult("**Allocator Recommendations**\n\nNo pending recommendations found.");
        }
        let text = `**Pending Recommendations** (${executions.length})\n\n`;
        for (const e of executions) {
          const campaignName = e.campaign?.name ?? "Unknown";
          const platform = e.campaign?.platform ?? "N/A";
          text += `- **${e.recommendationType}** — ${campaignName} (${platform})\n`;
          text += `  ID: \`${e.id}\` | Budget change: ${e.budgetChange ?? "N/A"} | Created: ${e.executedAt?.toISOString() ?? "N/A"}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "allocator_list_campaigns",
    description: "List allocator campaigns in a workspace with optional platform filter.",
    category: "allocator",
    tier: "free",
    inputSchema: ListCampaignsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListCampaignsSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_list_campaigns", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.platform) where["platform"] = args.platform;
        const campaigns = await prisma.allocatorCampaign.findMany({
          where,
          include: {
            autopilotConfig: { select: { isEnabled: true, mode: true } },
            _count: { select: { adSets: true } },
          },
        });
        if (campaigns.length === 0) {
          return textResult("**Allocator Campaigns**\n\nNo campaigns found.");
        }
        let text = `**Allocator Campaigns** (${campaigns.length})\n\n`;
        for (const c of campaigns) {
          const autopilot = c.autopilotConfig;
          const autopilotStatus = autopilot
            ? `${autopilot.isEnabled ? "ON" : "OFF"} (${autopilot.mode})`
            : "Not configured";
          text += `- **${c.name}** (${c.platform})\n`;
          text += `  ID: \`${c.id}\` | Status: ${c.status} | Budget: ${c.budget ?? "N/A"} | Spend: ${c.spend ?? "N/A"}\n`;
          text += `  Autopilot: ${autopilotStatus} | Ad Sets: ${c._count.adSets}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "allocator_get_benchmarks",
    description: "Get performance benchmarks for a specific campaign (CPA, ROAS, CTR, CPM).",
    category: "allocator",
    tier: "free",
    inputSchema: GetBenchmarksSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetBenchmarksSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_get_benchmarks", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const campaign = await prisma.allocatorCampaign.findFirst({
          where: { id: args.campaign_id },
          select: { id: true, name: true, platform: true, metrics: true },
        });
        if (!campaign) {
          return textResult("**Error: NOT_FOUND**\nCampaign not found.\n**Retryable:** false");
        }
        const metrics = campaign.metrics as Record<string, unknown> | null;
        if (!metrics) {
          return textResult(`**Benchmarks for ${campaign.name}**\n\nNo metrics data available.`);
        }
        let text = `**Benchmarks for ${campaign.name}** (${campaign.platform})\n\n`;
        text += `| Metric | Value |\n|--------|-------|\n`;
        text += `| CPA | ${metrics["cpa"] ?? "N/A"} |\n`;
        text += `| ROAS | ${metrics["roas"] ?? "N/A"} |\n`;
        text += `| CTR | ${metrics["ctr"] ?? "N/A"} |\n`;
        text += `| CPM | ${metrics["cpm"] ?? "N/A"} |\n`;
        const otherKeys = Object.keys(metrics).filter(
          (k) => !["cpa", "roas", "ctr", "cpm"].includes(k),
        );
        for (const key of otherKeys) {
          text += `| ${key} | ${metrics[key]} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "allocator_execute_move",
    description: "Execute a pending budget allocation recommendation. Requires explicit confirmation.",
    category: "allocator",
    tier: "free",
    inputSchema: ExecuteMoveSchema.shape,
    annotations: { destructiveHint: true },
    handler: async (args: z.infer<typeof ExecuteMoveSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_execute_move", async () => {
        if (!args.confirm) {
          return textResult("**Error: VALIDATION_ERROR**\nYou must set confirm=true to execute this move.\n**Retryable:** false");
        }
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const execution = await prisma.allocatorAutopilotExecution.findFirst({
          where: { id: args.execution_id, status: "PENDING" },
          include: { campaign: { select: { name: true } } },
        });
        if (!execution) {
          return textResult("**Error: NOT_FOUND**\nPending execution not found.\n**Retryable:** false");
        }
        const updated = await prisma.allocatorAutopilotExecution.update({
          where: { id: args.execution_id },
          data: { status: "COMPLETED", executedAt: new Date() },
        });
        return textResult(
          `**Execution Completed**\n\n` +
          `**ID:** \`${updated.id}\`\n` +
          `**Campaign:** ${execution.campaign?.name ?? "Unknown"}\n` +
          `**Type:** ${execution.recommendationType}\n` +
          `**Budget Change:** ${execution.budgetChange ?? "N/A"}\n` +
          `**Status:** COMPLETED`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "allocator_get_audit_log",
    description: "View the audit log of budget allocation executions for a workspace.",
    category: "allocator",
    tier: "free",
    inputSchema: GetAuditLogSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetAuditLogSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_get_audit_log", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.campaign_id) where["campaignId"] = args.campaign_id;
        const executions = await prisma.allocatorAutopilotExecution.findMany({
          where,
          orderBy: { executedAt: "desc" },
          take: args.limit ?? 20,
          include: { campaign: { select: { name: true } } },
        });
        if (executions.length === 0) {
          return textResult("**Audit Log**\n\nNo executions found.");
        }
        let text = `**Audit Log** (${executions.length} entries)\n\n`;
        for (const e of executions) {
          text += `- **${e.recommendationType}** — ${e.campaign?.name ?? "Unknown"}\n`;
          text += `  ID: \`${e.id}\` | Status: ${e.status} | Budget Change: ${e.budgetChange ?? "N/A"} | At: ${e.executedAt?.toISOString() ?? "N/A"}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "allocator_set_guardrails",
    description: "Set budget allocation guardrails for a workspace or specific campaign.",
    category: "allocator",
    tier: "free",
    inputSchema: SetGuardrailsSchema.shape,
    handler: async (args: z.infer<typeof SetGuardrailsSchema>): Promise<CallToolResult> =>
      safeToolCall("allocator_set_guardrails", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const data: Record<string, unknown> = {};
        if (args.max_daily_budget_change !== undefined) data["maxDailyBudgetChange"] = args.max_daily_budget_change;
        if (args.max_single_change !== undefined) data["maxSingleChange"] = args.max_single_change;
        if (args.min_roas_threshold !== undefined) data["minRoasThreshold"] = args.min_roas_threshold;
        if (args.max_cpa_threshold !== undefined) data["maxCpaThreshold"] = args.max_cpa_threshold;
        if (args.pause_on_anomaly !== undefined) data["pauseOnAnomaly"] = args.pause_on_anomaly;

        const config = await prisma.allocatorAutopilotConfig.upsert({
          where: {
            workspaceId_campaignId: {
              workspaceId: workspace.id,
              campaignId: args.campaign_id ?? "",
            },
          },
          update: data,
          create: {
            workspaceId: workspace.id,
            campaignId: args.campaign_id ?? "",
            ...data,
          },
        });
        let text = `**Guardrails Updated**\n\n`;
        text += `**Workspace:** ${workspace.name}\n`;
        text += `**Campaign:** ${args.campaign_id ?? "Workspace-wide"}\n`;
        text += `**Config ID:** \`${config.id}\`\n\n`;
        text += `| Setting | Value |\n|---------|-------|\n`;
        text += `| Max Daily Budget Change | ${config.maxDailyBudgetChange ?? "N/A"} |\n`;
        text += `| Max Single Change | ${config.maxSingleChange ?? "N/A"} |\n`;
        text += `| Min ROAS Threshold | ${config.minRoasThreshold ?? "N/A"} |\n`;
        text += `| Max CPA Threshold | ${config.maxCpaThreshold ?? "N/A"} |\n`;
        text += `| Pause on Anomaly | ${config.pauseOnAnomaly ?? "N/A"} |\n`;
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
