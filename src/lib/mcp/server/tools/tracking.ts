/**
 * Tracking MCP Tools
 *
 * Visitor session tracking, attribution analysis, journey mapping, and event querying.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const GetSessionsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  days: z.number().optional().default(7).describe("Lookback period in days (default 7)."),
  limit: z.number().optional().default(20).describe("Max sessions to return (default 20)."),
});

const GetAttributionSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  days: z.number().optional().default(30).describe("Lookback period in days (default 30)."),
});

const GetJourneySchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  session_id: z.string().min(1).describe("Session ID to trace journey for."),
});

const QueryEventsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  event_name: z.string().optional().describe("Filter by event name."),
  days: z.number().optional().default(7).describe("Lookback period in days (default 7)."),
  limit: z.number().optional().default(50).describe("Max events to return (default 50)."),
});

export function registerTrackingTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "tracking_get_sessions",
    description: "List visitor sessions for a workspace within a time range.",
    category: "tracking",
    tier: "free",
    inputSchema: GetSessionsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetSessionsSchema>): Promise<CallToolResult> =>
      safeToolCall("tracking_get_sessions", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const since = new Date();
        since.setDate(since.getDate() - (args.days ?? 7));

        const sessions = await prisma.visitorSession.findMany({
          where: {
            workspaceId: workspace.id,
            startedAt: { gte: since },
          },
          orderBy: { startedAt: "desc" },
          take: args.limit ?? 20,
        });

        if (sessions.length === 0) {
          return textResult("No visitor sessions found in the specified period.");
        }

        let text = `**Visitor Sessions (${sessions.length}):**\n\n`;
        for (const s of sessions) {
          const session = s as typeof s & {
            visitorId?: string;
            source?: string;
            duration?: number;
            pageCount?: number;
            startedAt: Date;
          };
          text += `- **Session:** ${session.id}\n`;
          text += `  Visitor: ${session.visitorId ?? "anonymous"} | Source: ${session.source ?? "direct"}\n`;
          text += `  Duration: ${session.duration ?? 0}s | Pages: ${session.pageCount ?? 0}\n`;
          text += `  Started: ${session.startedAt.toISOString()}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "tracking_get_attribution",
    description: "Get attribution analysis grouped by source, medium, and campaign.",
    category: "tracking",
    tier: "free",
    inputSchema: GetAttributionSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetAttributionSchema>): Promise<CallToolResult> =>
      safeToolCall("tracking_get_attribution", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const since = new Date();
        since.setDate(since.getDate() - (args.days ?? 30));

        const groups = await prisma.visitorSession.groupBy({
          by: ["source", "medium", "campaign"],
          where: {
            workspaceId: workspace.id,
            startedAt: { gte: since },
          },
          _count: { id: true },
        });

        if (groups.length === 0) {
          return textResult("No attribution data found in the specified period.");
        }

        let text = `**Attribution Report (${args.days ?? 30} days):**\n\n`;
        text += `| Source | Medium | Campaign | Sessions |\n`;
        text += `|--------|--------|----------|----------|\n`;

        for (const g of groups) {
          const group = g as typeof g & {
            source: string | null;
            medium: string | null;
            campaign: string | null;
            _count: { id: number };
          };
          text += `| ${group.source ?? "direct"} | ${group.medium ?? "-"} | ${group.campaign ?? "-"} | ${group._count.id} |\n`;
        }

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "tracking_get_journey",
    description: "Get the page-by-page journey for a specific visitor session.",
    category: "tracking",
    tier: "free",
    inputSchema: GetJourneySchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetJourneySchema>): Promise<CallToolResult> =>
      safeToolCall("tracking_get_journey", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const pageViews = await prisma.pageView.findMany({
          where: { sessionId: args.session_id },
          orderBy: { viewedAt: "asc" },
        });

        if (pageViews.length === 0) {
          return textResult("No page views found for this session.");
        }

        let text = `**Session Journey (${pageViews.length} pages):**\n\n`;
        for (let i = 0; i < pageViews.length; i++) {
          const pv = pageViews[i] as (typeof pageViews)[number] & {
            path: string;
            duration?: number;
            viewedAt: Date;
          };
          text += `${i + 1}. **${pv.path}**\n`;
          text += `   Duration: ${pv.duration ?? 0}s | Viewed: ${pv.viewedAt.toISOString()}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "tracking_query_events",
    description: "Query analytics events for a workspace with optional filters.",
    category: "tracking",
    tier: "free",
    inputSchema: QueryEventsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof QueryEventsSchema>): Promise<CallToolResult> =>
      safeToolCall("tracking_query_events", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const since = new Date();
        since.setDate(since.getDate() - (args.days ?? 7));

        const where: Record<string, unknown> = {
          workspaceId: workspace.id,
          createdAt: { gte: since },
        };
        if (args.event_name) where["name"] = args.event_name;

        const events = await prisma.analyticsEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: args.limit ?? 50,
        });

        if (events.length === 0) {
          return textResult("No analytics events found matching the criteria.");
        }

        let text = `**Analytics Events (${events.length}):**\n\n`;
        for (const e of events) {
          const event = e as typeof e & {
            name: string;
            properties?: Record<string, unknown> | null;
            createdAt: Date;
          };
          const props = event.properties ? JSON.stringify(event.properties) : "{}";
          text += `- **${event.name}** at ${event.createdAt.toISOString()}\n`;
          text += `  Properties: ${props}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
