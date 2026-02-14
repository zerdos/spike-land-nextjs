/**
 * Inbox MCP Tools
 *
 * Unified inbox management for social media messages, comments, and mentions.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const InboxListSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  status: z
    .string()
    .optional()
    .describe("Filter by status: UNREAD, READ, ARCHIVED, RESOLVED."),
  platform: z.string().optional().describe("Filter by platform (e.g. instagram, twitter)."),
  limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
  offset: z.number().optional().default(0).describe("Pagination offset (default 0)."),
});

const InboxGetItemSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID."),
});

const InboxReplySchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID to reply to."),
  content: z.string().min(1).describe("Reply content."),
});

const InboxArchiveSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_ids: z.array(z.string().min(1)).min(1).describe("Array of inbox item IDs to archive."),
});

const InboxRouteSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID to route."),
  assign_to_member_id: z.string().optional().describe("Member ID to assign this item to."),
});

const InboxPrioritySchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID."),
});

export function registerInboxTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "inbox_list_items",
    description: "List inbox items for a workspace with optional filters for status and platform.",
    category: "inbox",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: InboxListSchema.shape,
    handler: async (args: z.infer<typeof InboxListSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_list_items", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const where: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.status) where["status"] = args.status;
        if (args.platform) where["platform"] = args.platform;

        const [items, total] = await Promise.all([
          prisma.inboxItem.findMany({
            where,
            orderBy: { receivedAt: "desc" },
            take: args.limit ?? 20,
            skip: args.offset ?? 0,
          }),
          prisma.inboxItem.count({ where }),
        ]);

        if (items.length === 0) {
          return textResult(`**Inbox Items (0/${total})**\n\nNo items found.`);
        }

        let text = `**Inbox Items (${items.length}/${total})**\n\n`;
        for (const item of items as Array<Record<string, unknown>>) {
          text += `- **${item["senderName"] || "Unknown"}** via ${item["platform"] || "unknown"}\n`;
          text += `  Type: ${item["type"] || "message"} | Sentiment: ${item["sentiment"] || "neutral"} | Priority: ${item["priorityScore"] ?? "N/A"}\n`;
          text += `  Status: ${item["status"]} | Received: ${item["receivedAt"] instanceof Date ? (item["receivedAt"] as Date).toISOString() : String(item["receivedAt"])}\n`;
          text += `  ID: ${item["id"]}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "inbox_get_item",
    description: "Get full details of a specific inbox item including suggested responses and drafts.",
    category: "inbox",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: InboxGetItemSchema.shape,
    handler: async (args: z.infer<typeof InboxGetItemSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_get_item", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const item = await prisma.inboxItem.findFirst({
          where: { id: args.item_id, workspaceId: workspace.id },
          include: {
            suggestedResponses: true,
            drafts: { select: { id: true, status: true, content: true, createdAt: true } },
            assignedTo: { select: { id: true, user: { select: { name: true, email: true } } } },
            escalationHistory: true,
          },
        });

        if (!item) {
          return textResult("**Error: NOT_FOUND**\nInbox item not found.\n**Retryable:** false");
        }

        const record = item as Record<string, unknown>;
        let text = `**Inbox Item Details**\n\n`;
        text += `**ID:** ${record["id"]}\n`;
        text += `**Sender:** ${record["senderName"] || "Unknown"}\n`;
        text += `**Platform:** ${record["platform"] || "unknown"}\n`;
        text += `**Type:** ${record["type"] || "message"}\n`;
        text += `**Content:** ${record["content"] || "(empty)"}\n`;
        text += `**Status:** ${record["status"]}\n`;
        text += `**Sentiment:** ${record["sentiment"] || "neutral"} (score: ${record["sentimentScore"] ?? "N/A"})\n`;
        text += `**Priority:** ${record["priorityScore"] ?? "N/A"}\n`;
        text += `**Received:** ${record["receivedAt"] instanceof Date ? (record["receivedAt"] as Date).toISOString() : String(record["receivedAt"])}\n`;

        const suggestedResponses = record["suggestedResponses"] as Array<Record<string, unknown>> | undefined;
        if (suggestedResponses && suggestedResponses.length > 0) {
          text += `\n**Suggested Responses (${suggestedResponses.length}):**\n`;
          for (const sr of suggestedResponses) {
            text += `- ${sr["content"]}\n`;
          }
        }

        const drafts = record["drafts"] as Array<Record<string, unknown>> | undefined;
        if (drafts) {
          text += `\n**Drafts:** ${drafts.length}\n`;
        }

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "inbox_reply",
    description: "Record a reply to an inbox item and mark it as resolved.",
    category: "inbox",
    tier: "free",
    inputSchema: InboxReplySchema.shape,
    handler: async (args: z.infer<typeof InboxReplySchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_reply", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const item = await prisma.inboxItem.findFirst({
          where: { id: args.item_id, workspaceId: workspace.id },
        });

        if (!item) {
          return textResult("**Error: NOT_FOUND**\nInbox item not found.\n**Retryable:** false");
        }

        await prisma.inboxItem.update({
          where: { id: args.item_id },
          data: { status: "REPLIED", repliedAt: new Date() },
        });

        return textResult(
          `**Reply Recorded**\n\n` +
          `**Item ID:** ${args.item_id}\n` +
          `**Status:** RESOLVED\n` +
          `**Reply Length:** ${args.content.length} chars`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "inbox_archive",
    description: "Archive multiple inbox items at once.",
    category: "inbox",
    tier: "free",
    inputSchema: InboxArchiveSchema.shape,
    handler: async (args: z.infer<typeof InboxArchiveSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_archive", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const result = await prisma.inboxItem.updateMany({
          where: { id: { in: args.item_ids }, workspaceId: workspace.id },
          data: { status: "ARCHIVED" },
        });

        return textResult(
          `**Items Archived**\n\n` +
          `**Count:** ${result.count} of ${args.item_ids.length} requested`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "inbox_route",
    description: "Route an inbox item to a team member and view routing analysis.",
    category: "inbox",
    tier: "free",
    inputSchema: InboxRouteSchema.shape,
    handler: async (args: z.infer<typeof InboxRouteSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_route", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const item = await prisma.inboxItem.findFirst({
          where: { id: args.item_id, workspaceId: workspace.id },
          include: { suggestedResponses: true },
        });

        if (!item) {
          return textResult("**Error: NOT_FOUND**\nInbox item not found.\n**Retryable:** false");
        }

        if (args.assign_to_member_id) {
          await prisma.inboxItem.update({
            where: { id: args.item_id },
            data: { assignedToId: args.assign_to_member_id },
          });
        }

        const record = item as Record<string, unknown>;
        const suggestedResponses = record["suggestedResponses"] as Array<unknown> | undefined;

        return textResult(
          `**Routing Result**\n\n` +
          `**Item ID:** ${args.item_id}\n` +
          `**Assigned:** ${args.assign_to_member_id || "(unassigned)"}\n` +
          `**Sentiment:** ${record["sentiment"] || "neutral"}\n` +
          `**Priority:** ${record["priorityScore"] ?? "N/A"}\n` +
          `**Suggested Responses:** ${suggestedResponses?.length ?? 0}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "inbox_get_priority_score",
    description: "Get priority breakdown and sentiment analysis for an inbox item.",
    category: "inbox",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: InboxPrioritySchema.shape,
    handler: async (args: z.infer<typeof InboxPrioritySchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_get_priority_score", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const item = await prisma.inboxItem.findFirst({
          where: { id: args.item_id, workspaceId: workspace.id },
          select: {
            id: true,
            priorityScore: true,
            priorityFactors: true,
            sentiment: true,
            sentimentScore: true,
          },
        });

        if (!item) {
          return textResult("**Error: NOT_FOUND**\nInbox item not found.\n**Retryable:** false");
        }

        const record = item as Record<string, unknown>;
        let text = `**Priority Breakdown**\n\n`;
        text += `**Item ID:** ${record["id"]}\n`;
        text += `**Priority Score:** ${record["priorityScore"] ?? "N/A"}\n`;
        text += `**Sentiment:** ${record["sentiment"] || "neutral"}\n`;
        text += `**Sentiment Score:** ${record["sentimentScore"] ?? "N/A"}\n`;

        const factors = record["priorityFactors"];
        if (factors) {
          text += `**Priority Factors:** ${JSON.stringify(factors)}\n`;
        }

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
