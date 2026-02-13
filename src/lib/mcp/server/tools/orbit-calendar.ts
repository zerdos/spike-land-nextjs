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
  channel: z.string().optional().describe("Filter by channel."),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
});

const CreateEventSchema = z.object({
  title: z.string().min(1).max(200).describe("Event title."),
  content: z.string().min(1).describe("Post content."),
  scheduled_at: z.string().describe("Scheduled publish date (ISO format)."),
  channel: z.string().min(1).describe("Target channel (e.g., twitter, instagram, linkedin)."),
});

const UpdateEventSchema = z.object({
  event_id: z.string().min(1).describe("Calendar event ID."),
  title: z.string().optional().describe("New title."),
  content: z.string().optional().describe("New content."),
  scheduled_at: z.string().optional().describe("New scheduled date."),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "CANCELLED"]).optional().describe("New status."),
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
  userId: string,
): void {
  registry.register({
    name: "calendar_list_events",
    description: "List content calendar events with optional date range and channel filters.",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: ListEventsSchema.shape,
    handler: async ({ start_date, end_date, channel, limit = 20 }: z.infer<typeof ListEventsSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_list_events", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const where: Record<string, unknown> = { userId };
        if (channel) where.channel = channel;
        if (start_date || end_date) {
          where.scheduledAt = {};
          if (start_date) (where.scheduledAt as Record<string, unknown>).gte = new Date(start_date);
          if (end_date) (where.scheduledAt as Record<string, unknown>).lte = new Date(end_date);
        }
        const events = await prisma.calendarEvent.findMany({
          where,
          select: { id: true, title: true, channel: true, status: true, scheduledAt: true },
          take: limit,
          orderBy: { scheduledAt: "asc" },
        });
        if (events.length === 0) return textResult("No calendar events found.");
        let text = `**Calendar Events (${events.length}):**\n\n`;
        for (const e of events) {
          text += `- **${e.title}** [${e.status}] on ${e.channel}\n  Scheduled: ${e.scheduledAt.toISOString()}\n  ID: ${e.id}\n\n`;
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
    handler: async ({ title, content, scheduled_at, channel }: z.infer<typeof CreateEventSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_create_event", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const event = await prisma.calendarEvent.create({
          data: { title, content, scheduledAt: new Date(scheduled_at), channel, status: "SCHEDULED", userId },
        });
        return textResult(`**Event Created!**\n\n**ID:** ${event.id}\n**Title:** ${title}\n**Channel:** ${channel}\n**Scheduled:** ${scheduled_at}`);
      }),
  });

  registry.register({
    name: "calendar_update_event",
    description: "Update a content calendar event (title, content, schedule, or status).",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: UpdateEventSchema.shape,
    handler: async ({ event_id, title, content, scheduled_at, status }: z.infer<typeof UpdateEventSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_update_event", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (title) data.title = title;
        if (content) data.content = content;
        if (scheduled_at) data.scheduledAt = new Date(scheduled_at);
        if (status) data.status = status;
        const event = await prisma.calendarEvent.update({ where: { id: event_id }, data });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        await prisma.calendarEvent.delete({ where: { id: event_id } });
        return textResult(`**Event Deleted!** ID: ${event_id}`);
      }),
  });

  registry.register({
    name: "calendar_overview",
    description: "Get a monthly overview of scheduled content across all channels.",
    category: "orbit-calendar",
    tier: "workspace",
    inputSchema: GetCalendarOverviewSchema.shape,
    handler: async ({ month, year }: z.infer<typeof GetCalendarOverviewSchema>): Promise<CallToolResult> =>
      safeToolCall("calendar_overview", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const now = new Date();
        const m = month || now.getMonth() + 1;
        const y = year || now.getFullYear();
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        const events = await prisma.calendarEvent.findMany({
          where: { userId, scheduledAt: { gte: start, lte: end } },
          select: { channel: true, status: true },
        });
        const byChannel = new Map<string, number>();
        const byStatus = new Map<string, number>();
        for (const e of events) {
          byChannel.set(e.channel, (byChannel.get(e.channel) || 0) + 1);
          byStatus.set(e.status, (byStatus.get(e.status) || 0) + 1);
        }
        let text = `**Calendar Overview (${m}/${y}):**\n\n`;
        text += `**Total Events:** ${events.length}\n\n`;
        if (byChannel.size > 0) {
          text += `**By Channel:**\n`;
          for (const [ch, count] of byChannel) text += `- ${ch}: ${count}\n`;
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
