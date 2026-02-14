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
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const AddConnectionSchema = z.object({
  name: z.string().min(1).max(200).describe("Display name."),
  notes: z.string().optional().describe("Notes about this connection."),
});

const UpdateConnectionSchema = z.object({
  connection_id: z.string().min(1).describe("Connection ID."),
  name: z.string().optional().describe("New display name."),
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

async function getUserWorkspaceId(userId: string): Promise<string> {
  const prisma = (await import("@/lib/prisma")).default;
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  if (!membership) throw new Error("No workspace found for user.");
  return membership.workspaceId;
}

export function registerConnectionsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "connections_list",
    description: "List business connections.",
    category: "connections",
    tier: "workspace",
    inputSchema: ListConnectionsSchema.shape,
    handler: async ({ limit = 20 }: z.infer<typeof ListConnectionsSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspaceId = await getUserWorkspaceId(userId);
        const connections = await prisma.connection.findMany({
          where: { workspaceId },
          select: { id: true, displayName: true, notes: true, warmthScore: true, createdAt: true },
          take: limit,
          orderBy: { displayName: "asc" },
        });
        if (connections.length === 0) return textResult("No connections found.");
        let text = `**Connections (${connections.length}):**\n\n`;
        for (const c of connections) {
          text += `- **${c.displayName}** (warmth: ${c.warmthScore})\n  ID: ${c.id}\n\n`;
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
    handler: async ({ name, notes }: z.infer<typeof AddConnectionSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_add", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspaceId = await getUserWorkspaceId(userId);
        const connection = await prisma.connection.create({
          data: { displayName: name, notes, workspaceId },
        });
        return textResult(`**Connection Added!**\n\n**ID:** ${connection.id}\n**Name:** ${name}`);
      }),
  });

  registry.register({
    name: "connections_update",
    description: "Update an existing business connection.",
    category: "connections",
    tier: "workspace",
    inputSchema: UpdateConnectionSchema.shape,
    handler: async ({ connection_id, name, notes }: z.infer<typeof UpdateConnectionSchema>): Promise<CallToolResult> =>
      safeToolCall("connections_update", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (name) data["displayName"] = name;
        if (notes !== undefined) data["notes"] = notes;
        const connection = await prisma.connection.update({ where: { id: connection_id }, data });
        return textResult(`**Connection Updated!** ${connection.displayName}`);
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
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.connection.delete({ where: { id: connection_id } });
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
        void competitor_id; void metric; void value;
        return textResult("**Not implemented.** ScoutBenchmark uses workspace-level period-based metrics (ownMetrics/competitorMetrics JSON). Per-connection metric tracking is not yet supported by the schema.");
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
        const prisma = (await import("@/lib/prisma")).default;
        const workspaceId = await getUserWorkspaceId(userId);
        const where: Record<string, unknown> = { workspaceId };
        if (competitor_id) where["period"] = competitor_id;
        const benchmarks = await prisma.scoutBenchmark.findMany({
          where: where as { workspaceId: string },
          orderBy: { generatedAt: "desc" },
          take: 50,
        });
        if (benchmarks.length === 0) return textResult("No competitor data tracked yet.");
        let text = `**Competitor Report:**\n\n`;
        for (const b of benchmarks) {
          text += `### Period: ${b.period}\n`;
          text += `- Own Metrics: ${JSON.stringify(b.ownMetrics)}\n`;
          text += `- Competitor Metrics: ${JSON.stringify(b.competitorMetrics)}\n`;
          text += `- Generated: ${b.generatedAt.toISOString().split("T")[0]}\n\n`;
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
        const prisma = (await import("@/lib/prisma")).default;
        const workspaceId = await getUserWorkspaceId(userId);
        const connections = await prisma.connection.findMany({
          where: {
            workspaceId,
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ],
          },
          select: { id: true, displayName: true, warmthScore: true },
          take: 20,
        });
        if (connections.length === 0) return textResult(`No connections matching "${query}".`);
        let text = `**Search Results (${connections.length}):**\n\n`;
        for (const c of connections) {
          text += `- **${c.displayName}** (warmth: ${c.warmthScore}) -- ID: ${c.id}\n`;
        }
        return textResult(text);
      }),
  });
}
