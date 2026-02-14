/**
 * Pulse MCP Tools
 *
 * Social account health monitoring, anomaly detection, and metrics analysis.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const GetHealthScoreSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  account_id: z.string().min(1).describe("Social account ID."),
});

const ListAnomaliesSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  severity: z.string().optional().describe("Filter by severity (e.g., LOW, MEDIUM, HIGH, CRITICAL)."),
  limit: z.number().optional().default(20).describe("Max anomalies to return (default 20)."),
});

const GetMetricsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  account_id: z.string().min(1).describe("Social account ID."),
  days: z.number().optional().default(7).describe("Number of days of metrics to retrieve (default 7)."),
});

const GetAccountHealthSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
});

const ListHealthEventsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  account_id: z.string().optional().describe("Filter by social account ID."),
  event_type: z.string().optional().describe("Filter by event type."),
  limit: z.number().optional().default(20).describe("Max events to return (default 20)."),
});

export function registerPulseTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "pulse_get_health_score",
    description: "Get the health score and status for a specific social account.",
    category: "pulse",
    tier: "free",
    inputSchema: GetHealthScoreSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetHealthScoreSchema>): Promise<CallToolResult> =>
      safeToolCall("pulse_get_health_score", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const health = await prisma.socialAccountHealth.findUnique({
          where: { accountId: args.account_id },
          include: { account: { select: { platform: true, accountName: true } } },
        });
        if (!health) {
          return textResult("**Error: NOT_FOUND**\nHealth record not found for this account.\n**Retryable:** false");
        }
        let text = `**Account Health**\n\n`;
        text += `**Account:** ${health.account.accountName} (${health.account.platform})\n`;
        text += `**Health Score:** ${health.healthScore}/100\n`;
        text += `**Status:** ${health.status}\n`;
        text += `**Last Successful Sync:** ${health.lastSuccessfulSync?.toISOString() ?? "Never"}\n`;
        text += `**Last Sync Attempt:** ${health.lastSyncAttempt?.toISOString() ?? "Never"}\n`;
        text += `**Consecutive Errors:** ${health.consecutiveErrors}\n`;
        text += `**Errors (24h):** ${health.totalErrorsLast24h}\n`;
        if (health.rateLimitTotal !== null) {
          text += `**Rate Limit:** ${health.rateLimitRemaining ?? "?"} / ${health.rateLimitTotal} remaining`;
          if (health.rateLimitResetAt) text += ` (resets ${health.rateLimitResetAt.toISOString()})`;
          text += `\n`;
        }
        text += `**Rate Limited:** ${health.isRateLimited ? "Yes" : "No"}\n`;
        text += `**Token Refresh Required:** ${health.tokenRefreshRequired ? "Yes" : "No"}\n`;
        if (health.tokenExpiresAt) {
          text += `**Token Expires:** ${health.tokenExpiresAt.toISOString()}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "pulse_list_anomalies",
    description: "List detected metric anomalies for social accounts in a workspace.",
    category: "pulse",
    tier: "free",
    inputSchema: ListAnomaliesSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListAnomaliesSchema>): Promise<CallToolResult> =>
      safeToolCall("pulse_list_anomalies", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const accounts = await prisma.socialAccount.findMany({
          where: { workspaceId: workspace.id },
          select: { id: true },
        });
        const accountIds = accounts.map((a: { id: string }) => a.id);
        if (accountIds.length === 0) {
          return textResult("**Anomalies**\n\nNo social accounts in this workspace.");
        }
        const where: Record<string, unknown> = { accountId: { in: accountIds } };
        if (args.severity) where["severity"] = args.severity;
        const anomalies = await prisma.socialMetricAnomaly.findMany({
          where,
          orderBy: { detectedAt: "desc" },
          take: args.limit ?? 20,
          include: { account: { select: { accountName: true, platform: true } } },
        });
        if (anomalies.length === 0) {
          return textResult("**Anomalies**\n\nNo anomalies detected.");
        }
        let text = `**Anomalies** (${anomalies.length})\n\n`;
        for (const a of anomalies) {
          text += `- **${a.metricType}** on ${a.account.accountName} (${a.account.platform})\n`;
          text += `  Current: ${a.currentValue} | Expected: ${a.expectedValue} | Z-Score: ${a.zScore.toFixed(2)}\n`;
          text += `  Severity: ${a.severity} | Direction: ${a.direction} | Change: ${a.percentChange.toFixed(1)}%\n`;
          text += `  Detected: ${a.detectedAt.toISOString()}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "pulse_get_metrics",
    description: "Get social media metrics for an account over a specified number of days.",
    category: "pulse",
    tier: "free",
    inputSchema: GetMetricsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetMetricsSchema>): Promise<CallToolResult> =>
      safeToolCall("pulse_get_metrics", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const days = args.days ?? 7;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const metrics = await prisma.socialMetrics.findMany({
          where: {
            accountId: args.account_id,
            date: { gte: since },
          },
          orderBy: { date: "desc" },
        });
        if (metrics.length === 0) {
          return textResult(`**Metrics**\n\nNo metrics found for the last ${days} days.`);
        }
        let text = `**Metrics** (last ${days} days, ${metrics.length} entries)\n\n`;
        text += `| Date | Followers | Engagement | Impressions | Reach |\n`;
        text += `|------|-----------|------------|-------------|-------|\n`;
        for (const m of metrics) {
          const dateStr = m.date.toISOString().split("T")[0];
          text += `| ${dateStr} | ${m.followers} | ${m.engagementRate ?? "-"} | ${m.impressions} | ${m.reach} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "pulse_get_account_health",
    description: "Get a health dashboard view of all social accounts in a workspace.",
    category: "pulse",
    tier: "free",
    inputSchema: GetAccountHealthSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetAccountHealthSchema>): Promise<CallToolResult> =>
      safeToolCall("pulse_get_account_health", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const accounts = await prisma.socialAccount.findMany({
          where: { workspaceId: workspace.id },
          select: {
            id: true,
            platform: true,
            accountName: true,
            status: true,
            health: {
              select: { healthScore: true, status: true, isRateLimited: true, tokenRefreshRequired: true },
            },
          },
        });
        if (accounts.length === 0) {
          return textResult("**Health Dashboard**\n\nNo social accounts in this workspace.");
        }
        let text = `**Health Dashboard** (${accounts.length} accounts)\n\n`;
        for (const a of accounts) {
          const h = a.health;
          if (h) {
            const warnings: string[] = [];
            if (h.isRateLimited) warnings.push("RATE LIMITED");
            if (h.tokenRefreshRequired) warnings.push("TOKEN REFRESH NEEDED");
            const warningStr = warnings.length > 0 ? ` [${warnings.join(", ")}]` : "";
            text += `- **${a.accountName}** (${a.platform}) — ${h.healthScore}/100 ${h.status}${warningStr}\n`;
          } else {
            text += `- **${a.accountName}** (${a.platform}) — No health data\n`;
          }
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "pulse_list_health_events",
    description: "List health events for social accounts in a workspace.",
    category: "pulse",
    tier: "free",
    inputSchema: ListHealthEventsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListHealthEventsSchema>): Promise<CallToolResult> =>
      safeToolCall("pulse_list_health_events", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.account_id) where["accountId"] = args.account_id;
        if (args.event_type) where["eventType"] = args.event_type;
        const events = await prisma.accountHealthEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: args.limit ?? 20,
          include: { account: { select: { accountName: true, platform: true } } },
        });
        if (events.length === 0) {
          return textResult("**Health Events**\n\nNo health events found.");
        }
        let text = `**Health Events** (${events.length})\n\n`;
        for (const e of events) {
          text += `- **${e.eventType}** (${e.severity}) — ${e.account.accountName} (${e.account.platform})\n`;
          text += `  ${e.previousStatus ?? "?"} -> ${e.newStatus} | Score: ${e.previousScore ?? "?"} -> ${e.newScore}\n`;
          text += `  ${e.message}\n`;
          text += `  ${e.createdAt.toISOString()}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
