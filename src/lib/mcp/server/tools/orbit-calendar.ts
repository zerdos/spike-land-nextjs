/**
 * Orbit Calendar MCP Tools
 *
 * Content calendar management for social media scheduling.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListEventsSchema = z.object({
  start_date: z.string().optional().describe("Start date (ISO format)."),
  end_date: z.string().optional().describe("End date (ISO format)."),
  platform: z.string().optional().describe("Filter by platform."),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
});

const CreateEventSchema = z.object({
  content: z.string().min(1).describe("Post content."),
  suggested_for: z.string().describe("Suggested publish date (ISO format)."),
  platform: z.enum(["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"]).describe("Target platform."),
  reason: z.string().min(1).describe("Reason for the suggestion."),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score (0-1)."),
  keywords: z.array(z.string()).optional().describe("Related keywords."),
});

const UpdateEventSchema = z.object({
  event_id: z.string().min(1).describe("Calendar event ID."),
  content: z.string().optional().describe("New content."),
  suggested_for: z.string().optional().describe("New suggested date."),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "MODIFIED"]).optional().describe("New status."),
});

const DeleteEventSchema = z.object({
  event_id: z.string().min(1).describe("Calendar event ID to delete."),
});

const GetCalendarOverviewSchema = z.object({
  month: z.number().int().min(1).max(12).optional().describe("Month number (1-12)."),
  year: z.number().int().optional().describe("Year."),
});

export function registerOrbitCalendarTools(
  registry: ToolRegistry,
  workspaceId: string,
): void {
  registry.register({
    name: "calendar_list_events",
    description: "List content calendar events with optional date range and platform filters.",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: ListEventsSchema.shape,
    handler: async ({ start_date, end_date, platform, limit = 20 }: z.infer<typeof ListEventsSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_list_events", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where: Record<string, unknown> = { workspaceId };
        if (platform) where["platform"] = platform;
        if (start_date || end_date) {
          const suggestedAtFilter: Record<string, unknown> = {};
          if (start_date) suggestedAtFilter["gte"] = new Date(start_date);
          if (end_date) suggestedAtFilter["lte"] = new Date(end_date);
          where["suggestedFor"] = suggestedAtFilter;
        }
        const events = await prisma.calendarContentSuggestion.findMany({
          where,
          select: { id: true, content: true, platform: true, status: true, suggestedFor: true, reason: true },
          take: limit,
          orderBy: { suggestedFor: "asc" },
        });
        if (events.length === 0) return textResult("No calendar events found.");
        let text = `**Calendar Events (${events.length}):**\n\n`;
        for (const e of events) {
          const contentPreview = e.content.length > 80 ? e.content.slice(0, 80) + "..." : e.content;
          text += `- **${contentPreview}** [${e.status}] on ${e.platform}\n  Suggested for: ${e.suggestedFor.toISOString()}\n  ID: ${e.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "calendar_create_event",
    description: "Create a new content calendar event for scheduling a social media post.",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: CreateEventSchema.shape,
    handler: async ({ content, suggested_for, platform, reason, confidence, keywords }: z.infer<typeof CreateEventSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_create_event", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const event = await prisma.calendarContentSuggestion.create({
          data: {
            content,
            suggestedFor: new Date(suggested_for),
            platform,
            reason,
            confidence: confidence ?? 0.5,
            keywords: keywords ?? [],
            workspaceId,
          },
        });
        return textResult(`**Event Created!**\n\n**ID:** ${event.id}\n**Platform:** ${platform}\n**Suggested for:** ${suggested_for}`);
      }),
  });

  registry.register({
    name: "calendar_update_event",
    description: "Update a content calendar event (content, schedule, or status).",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: UpdateEventSchema.shape,
    handler: async ({ event_id, content, suggested_for, status }: z.infer<typeof UpdateEventSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_update_event", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (content) data["content"] = content;
        if (suggested_for) data["suggestedFor"] = new Date(suggested_for);
        if (status) data["status"] = status;
        const event = await prisma.calendarContentSuggestion.update({ where: { id: event_id }, data });
        return textResult(`**Event Updated!**\n\n**ID:** ${event.id}\n**Status:** ${event.status}`);
      }),
  });

  registry.register({
    name: "calendar_delete_event",
    description: "Delete a content calendar event.",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: DeleteEventSchema.shape,
    handler: async ({ event_id }: z.infer<typeof DeleteEventSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_delete_event", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.calendarContentSuggestion.delete({ where: { id: event_id } });
        return textResult(`**Event Deleted!** ID: ${event_id}`);
      }),
  });

  registry.register({
    name: "calendar_overview",
    description: "Get a monthly overview of scheduled content across all platforms.",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: GetCalendarOverviewSchema.shape,
    handler: async ({ month, year }: z.infer<typeof GetCalendarOverviewSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_overview", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const now = new Date();
        const m = month || now.getMonth() + 1;
        const y = year || now.getFullYear();
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        const events = await prisma.calendarContentSuggestion.findMany({
          where: { workspaceId, suggestedFor: { gte: start, lte: end } },
          select: { platform: true, status: true },
        });
        const byPlatform = new Map<string, number>();
        const byStatus = new Map<string, number>();
        for (const e of events) {
          byPlatform.set(e.platform, (byPlatform.get(e.platform) || 0) + 1);
          byStatus.set(e.status, (byStatus.get(e.status) || 0) + 1);
        }
        let text = `**Calendar Overview (${m}/${y}):**\n\n`;
        text += `**Total Events:** ${events.length}\n\n`;
        if (byPlatform.size > 0) {
          text += `**By Platform:**\n`;
          for (const [pl, count] of byPlatform) text += `- ${pl}: ${count}\n`;
          text += "\n";
        }
        if (byStatus.size > 0) {
          text += `**By Status:**\n`;
          for (const [st, count] of byStatus) text += `- ${st}: ${count}\n`;
        }
        return textResult(text);
      }),
  });
}
