/**
 * Connections & Competitor Tracking MCP Tools
 *
 * Manage business connections and track competitors.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListConnectionsSchema = z.object({
  type: z.enum(["partner", "vendor", "competitor", "lead", "ALL"]).optional().default("ALL").describe("Connection type filter."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const AddConnectionSchema = z.object({
  name: z.string().min(1).max(200).describe("Business name."),
  type: z.enum(["partner", "vendor", "competitor", "lead"]).describe("Connection type."),
  url: z.string().optional().describe("Website URL."),
  notes: z.string().optional().describe("Notes about this connection."),
});

const UpdateConnectionSchema = z.object({
  connection_id: z.string().min(1).describe("Connection ID."),
  name: z.string().optional().describe("New name."),
  type: z.enum(["partner", "vendor", "competitor", "lead"]).optional().describe("New type."),
  notes: z.string().optional().describe("Updated notes."),
});

const DeleteConnectionSchema = z.object({
  connection_id: z.string().min(1).describe("Connection ID to delete."),
});

const TrackCompetitorSchema = z.object({
  competitor_id: z.string().min(1).describe("Competitor connection ID."),
  metric: z.string().min(1).describe("Metric name (e.g., pricing, features, traffic)."),
  value: z.string().min(1).describe("Metric value."),
});

const GetCompetitorReportSchema = z.object({
  competitor_id: z.string().optional().describe("Specific competitor ID (omit for all)."),
});

const SearchConnectionsSchema = z.object({
  query: z.string().min(1).describe("Search query."),
});

export function registerConnectionsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "connections_list",
    description: "List business connections with optional type filter.",
    category: "connections",
    tier: "workspace",
    inputSchema: ListConnectionsSchema.shape,
    handler: async ({ type = "ALL", limit = 20 }: z.infer<typeof ListConnectionsSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_list", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const where = type === "ALL" ? { userId } : { userId, type };
        const connections = await prisma.businessConnection.findMany({
          where,
          select: { id: true, name: true, type: true, url: true, createdAt: true },
          take: limit,
          orderBy: { name: "asc" },
        });
        if (connections.length === 0) return textResult("No connections found.");
        let text = `**Connections (${connections.length}):**\n\n`;
        for (const c of connections) {
          text += `- **${c.name}** (${c.type})${c.url ? ` — ${c.url}` : ""}\n  ID: ${c.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "connections_add",
    description: "Add a new business connection.",
    category: "connections",
    tier: "workspace",
    inputSchema: AddConnectionSchema.shape,
    handler: async ({ name, type, url, notes }: z.infer<typeof AddConnectionSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_add", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const connection = await prisma.businessConnection.create({
          data: { name, type, url, notes, userId },
        });
        return textResult(`**Connection Added!**\n\n**ID:** ${connection.id}\n**Name:** ${name}\n**Type:** ${type}`);
      }),
  });

  registry.register({
    name: "connections_update",
    description: "Update an existing business connection.",
    category: "connections",
    tier: "workspace",
    inputSchema: UpdateConnectionSchema.shape,
    handler: async ({ connection_id, name, type, notes }: z.infer<typeof UpdateConnectionSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_update", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (name) data.name = name;
        if (type) data.type = type;
        if (notes !== undefined) data.notes = notes;
        const connection = await prisma.businessConnection.update({ where: { id: connection_id }, data });
        return textResult(`**Connection Updated!** ${connection.name} (${connection.type})`);
      }),
  });

  registry.register({
    name: "connections_delete",
    description: "Delete a business connection.",
    category: "connections",
    tier: "workspace",
    inputSchema: DeleteConnectionSchema.shape,
    handler: async ({ connection_id }: z.infer<typeof DeleteConnectionSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_delete", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        await prisma.businessConnection.delete({ where: { id: connection_id } });
        return textResult(`**Connection Deleted!** ID: ${connection_id}`);
      }),
  });

  registry.register({
    name: "connections_track_competitor",
    description: "Record a metric for a competitor (pricing, features, traffic, etc).",
    category: "connections",
    tier: "workspace",
    inputSchema: TrackCompetitorSchema.shape,
    handler: async ({ competitor_id, metric, value }: z.infer<typeof TrackCompetitorSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_track_competitor", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const entry = await prisma.competitorMetric.create({
          data: { connectionId: competitor_id, metric, value, userId, recordedAt: new Date() },
        });
        return textResult(`**Metric Recorded!**\n\n**ID:** ${entry.id}\n**Competitor:** ${competitor_id}\n**Metric:** ${metric}\n**Value:** ${value}`);
      }),
  });

  registry.register({
    name: "connections_competitor_report",
    description: "Get a competitor analysis report with tracked metrics.",
    category: "connections",
    tier: "workspace",
    inputSchema: GetCompetitorReportSchema.shape,
    handler: async ({ competitor_id }: z.infer<typeof GetCompetitorReportSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_competitor_report", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const where: Record<string, unknown> = { userId };
        if (competitor_id) where.connectionId = competitor_id;
        const metrics = await prisma.competitorMetric.findMany({
          where,
          include: { connection: { select: { name: true } } },
          orderBy: { recordedAt: "desc" },
          take: 50,
        });
        if (metrics.length === 0) return textResult("No competitor data tracked yet.");
        const grouped = new Map<string, Array<{ metric: string; value: string; date: string }>>();
        for (const m of metrics) {
          const name = m.connection.name;
          if (!grouped.has(name)) grouped.set(name, []);
          grouped.get(name)!.push({ metric: m.metric, value: m.value, date: m.recordedAt.toISOString().split("T")[0]! });
        }
        let text = `**Competitor Report:**\n\n`;
        for (const [name, entries] of grouped) {
          text += `### ${name}\n`;
          for (const e of entries) {
            text += `- ${e.metric}: ${e.value} (${e.date})\n`;
          }
          text += "\n";
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "connections_search",
    description: "Search connections by name or notes.",
    category: "connections",
    tier: "workspace",
    inputSchema: SearchConnectionsSchema.shape,
    handler: async ({ query }: z.infer<typeof SearchConnectionsSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_search", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const connections = await prisma.businessConnection.findMany({
          where: {
            userId,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, type: true },
          take: 20,
        });
        if (connections.length === 0) return textResult(`No connections matching "${query}".`);
        let text = `**Search Results (${connections.length}):**\n\n`;
        for (const c of connections) {
          text += `- **${c.name}** (${c.type}) — ID: ${c.id}\n`;
        }
        return textResult(text);
      }),
  });
}
