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

        void workspace; // workspace resolved for auth
        const sessions = await prisma.visitorSession.findMany({
          where: {
            sessionStart: { gte: since },
          },
          orderBy: { sessionStart: "desc" },
          take: args.limit ?? 20,
        });

        if (sessions.length === 0) {
          return textResult("No visitor sessions found in the specified period.");
        }

        let text = `**Visitor Sessions (${sessions.length}):**\n\n`;
        for (const s of sessions) {
          text += `- **Session:** ${s.id}\n`;
          text += `  Visitor: ${s.visitorId} | Source: ${s.utmSource ?? "direct"}\n`;
          text += `  Pages: ${s.pageViewCount} | Landing: ${s.landingPage}\n`;
          text += `  Started: ${s.sessionStart.toISOString()}\n\n`;
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

        void workspace; // workspace resolved for auth
        const groups = await prisma.visitorSession.groupBy({
          by: ["utmSource", "utmMedium", "utmCampaign"],
          where: {
            sessionStart: { gte: since },
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
          text += `| ${g.utmSource ?? "direct"} | ${g.utmMedium ?? "-"} | ${g.utmCampaign ?? "-"} | ${g._count.id} |\n`;
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
          orderBy: { timestamp: "asc" },
        });

        if (pageViews.length === 0) {
          return textResult("No page views found for this session.");
        }

        let text = `**Session Journey (${pageViews.length} pages):**\n\n`;
        for (let i = 0; i < pageViews.length; i++) {
          const pv = pageViews[i]!;
          text += `${i + 1}. **${pv.path}**\n`;
          text += `   Time on page: ${pv.timeOnPage ?? 0}s | Viewed: ${pv.timestamp.toISOString()}\n`;
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

        void workspace; // workspace resolved for auth
        const where: Record<string, unknown> = {
          timestamp: { gte: since },
        };
        if (args.event_name) where["name"] = args.event_name;

        const events = await prisma.analyticsEvent.findMany({
          where,
          orderBy: { timestamp: "desc" },
          take: args.limit ?? 50,
        });

        if (events.length === 0) {
          return textResult("No analytics events found matching the criteria.");
        }

        let text = `**Analytics Events (${events.length}):**\n\n`;
        for (const e of events) {
          const props = e.metadata ? JSON.stringify(e.metadata) : "{}";
          text += `- **${e.name}** at ${e.timestamp.toISOString()}\n`;
          text += `  Category: ${e.category ?? "N/A"} | Value: ${e.value ?? "N/A"}\n`;
          text += `  Metadata: ${props}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  const RecordEngagementSchema = z.object({
    visitor_id: z.string().min(1).describe("Visitor ID."),
    session_id: z.string().min(1).describe("Visitor session ID."),
    page: z.string().min(1).describe("Page path."),
    scroll_depth: z.number().min(0).max(100).describe("Maximum scroll depth percentage."),
    time_ms: z.number().min(0).describe("Time on page in milliseconds."),
    sections_viewed: z.array(z.string()).optional().describe("IDs of page sections viewed."),
  });

  registry.register({
    name: "tracking_record_engagement",
    description: "Record page engagement data for a visitor including scroll depth, time on page, and sections viewed.",
    category: "tracking",
    tier: "free",
    inputSchema: RecordEngagementSchema.shape,
    handler: async (args: z.infer<typeof RecordEngagementSchema>): Promise<CallToolResult> =>
      safeToolCall("tracking_record_engagement", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.analyticsEvent.create({
          data: {
            sessionId: args.session_id,
            name: "page_engagement",
            category: "engagement",
            value: args.scroll_depth,
            metadata: {
              visitorId: args.visitor_id,
              page: args.page,
              scrollDepth: args.scroll_depth,
              timeMs: args.time_ms,
              sectionsViewed: args.sections_viewed ?? [],
            },
          },
        });
        return textResult(
          `**Engagement Recorded**\n\n` +
          `Visitor: ${args.visitor_id}\n` +
          `Page: ${args.page}\n` +
          `Scroll: ${args.scroll_depth}%\n` +
          `Time: ${Math.round(args.time_ms / 1000)}s\n` +
          `Sections: ${(args.sections_viewed ?? []).length}`
        );
      }),
  });
}
