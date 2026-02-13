/**
 * Orbit Inbox MCP Tools
 *
 * Social media inbox management: list, get, reply, analyze, suggest, escalate, batch reply.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, resolveWorkspace, apiRequest, textResult } from "./tool-helpers";

const InboxListSchema = z.object({
  workspace_slug: z
    .string()
    .min(1)
    .describe("Workspace slug. Use workspace_list to find it."),
  status: z
    .enum(["UNREAD", "READ", "PENDING_REPLY", "REPLIED", "ARCHIVED", "IGNORED"])
    .optional()
    .describe("Filter by status. Default: shows UNREAD and PENDING_REPLY."),
  platform: z
    .enum(["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"])
    .optional()
    .describe("Filter by platform."),
  sentiment: z
    .enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"])
    .optional()
    .describe("Filter by sentiment."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Max items to return. Default: 20."),
});

const InboxItemIdSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID. Use inbox_list to find it."),
});

const InboxReplySchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID."),
  content: z
    .string()
    .min(1)
    .max(5000)
    .describe("Reply content. Will be sent to the original platform."),
});

const InboxEscalateSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z.string().min(1).describe("Inbox item ID."),
  reason: z
    .string()
    .min(1)
    .max(500)
    .describe("Why this needs human attention. Be specific about urgency."),
});

const InboxBatchReplySchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  replies: z
    .array(z.object({
      item_id: z.string().min(1),
      content: z.string().min(1).max(5000),
    }))
    .min(1)
    .max(10)
    .describe("Array of item_id + content pairs. Max 10 per call. Analyze each item first."),
});

export function registerOrbitInboxTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "inbox_list",
    description:
      "List social media inbox items across all platforms. Returns IDs needed for " +
      "reply/analyze/escalate. Default: shows unread and pending items.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxListSchema.shape,
    handler: async ({
      workspace_slug,
      status,
      platform,
      sentiment,
      limit,
    }: z.infer<typeof InboxListSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_list", async () => {
        const workspace = await resolveWorkspace(userId, workspace_slug);
        const prisma = (await import("@/lib/prisma")).default;

        const where: Record<string, unknown> = { workspaceId: workspace.id };
        if (status) {
          where["status"] = status;
        } else {
          where["status"] = { in: ["UNREAD", "PENDING_REPLY"] };
        }
        if (platform) where["platform"] = platform;
        if (sentiment) where["sentiment"] = sentiment;

        const items = await prisma.inboxItem.findMany({
          where,
          select: {
            id: true,
            type: true,
            status: true,
            platform: true,
            senderName: true,
            senderHandle: true,
            content: true,
            sentiment: true,
            sentimentScore: true,
            priorityScore: true,
            receivedAt: true,
            account: { select: { accountName: true } },
          },
          orderBy: [
            { priorityScore: "desc" },
            { receivedAt: "desc" },
          ],
          take: limit,
        });

        if (items.length === 0) {
          return textResult(
            `**Inbox for ${workspace.name} (0)**\n\nNo items matching your filters. ` +
            (status ? `Try removing the status filter, or check other statuses.` : `All caught up!`),
          );
        }

        let text = `**Inbox for ${workspace.name} (${items.length})**\n\n`;
        for (const item of items) {
          const preview = item.content.length > 150
            ? item.content.slice(0, 150) + "..."
            : item.content;
          text += `- **${item.senderName}** via ${item.platform} (${item.type})\n`;
          text += `  Status: ${item.status}`;
          if (item.sentiment) text += ` | Sentiment: ${item.sentiment}`;
          if (item.priorityScore != null) text += ` | Priority: ${item.priorityScore}`;
          text += `\n  "${preview}"\n`;
          text += `  ID: \`${item.id}\` | Received: ${item.receivedAt.toISOString()}\n`;
        }

        return textResult(text);
      }),
  });

  registry.register({
    name: "inbox_get",
    description:
      "Get full details for an inbox item including sender info and conversation thread.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxItemIdSchema.shape,
    handler: async ({
      workspace_slug,
      item_id,
    }: z.infer<typeof InboxItemIdSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_get", async () => {
        const workspace = await resolveWorkspace(userId, workspace_slug);
        const prisma = (await import("@/lib/prisma")).default;

        const item = await prisma.inboxItem.findFirst({
          where: { id: item_id, workspaceId: workspace.id },
          include: {
            account: { select: { accountName: true, platform: true } },
            suggestedResponses: {
              select: { id: true, content: true, confidenceScore: true, category: true },
              orderBy: { confidenceScore: "desc" },
              take: 3,
            },
            drafts: {
              select: { id: true, content: true, status: true, confidenceScore: true },
              orderBy: { createdAt: "desc" },
              take: 3,
            },
          },
        }) as {
          id: string; senderName: string; senderHandle: string | null; platform: string;
          type: string; status: string; content: string; originalPostContent: string | null;
          sentiment: string | null; sentimentScore: number | null; priorityScore: number | null;
          escalationStatus: string | null; receivedAt: Date;
          account: { accountName: string; platform: string };
          suggestedResponses: { id: string; content: string; confidenceScore: number; category: string }[];
          drafts: { id: string; content: string; status: string; confidenceScore: number }[];
        } | null;

        if (!item) {
          return textResult(
            `**Error: Not Found**\nInbox item '${item_id}' not found.\n**Suggestion:** Use \`inbox_list\` to see available items.\n**Retryable:** false`,
          );
        }

        let text = `**Inbox Item: ${item.senderName}**\n\n`;
        text += `**ID:** ${item.id}\n`;
        text += `**Platform:** ${item.platform} (${item.type})\n`;
        text += `**Sender:** ${item.senderName}`;
        if (item.senderHandle) text += ` (@${item.senderHandle})`;
        text += `\n`;
        text += `**Status:** ${item.status}\n`;
        text += `**Account:** ${item.account.accountName}\n`;
        text += `**Received:** ${item.receivedAt.toISOString()}\n`;
        if (item.sentiment) text += `**Sentiment:** ${item.sentiment} (${item.sentimentScore?.toFixed(2) || "—"})\n`;
        if (item.priorityScore != null) text += `**Priority:** ${item.priorityScore}\n`;
        if (item.escalationStatus && item.escalationStatus !== "NONE") {
          text += `**Escalation:** ${item.escalationStatus}\n`;
        }

        text += `\n**Content:**\n${item.content}\n`;

        if (item.originalPostContent) {
          text += `\n**Original Post:**\n${item.originalPostContent}\n`;
        }

        if (item.suggestedResponses.length > 0) {
          text += `\n**AI Suggestions:**\n`;
          for (const s of item.suggestedResponses) {
            text += `- (${(s.confidenceScore * 100).toFixed(0)}%) ${s.category || "reply"}: "${s.content.slice(0, 200)}"\n`;
          }
        }

        if (item.drafts.length > 0) {
          text += `\n**Relay Drafts:**\n`;
          for (const d of item.drafts) {
            text += `- [${d.status}] (${(d.confidenceScore * 100).toFixed(0)}%): "${d.content.slice(0, 200)}"\n`;
            text += `  Draft ID: ${d.id}\n`;
          }
        }

        return textResult(text);
      }),
  });

  registry.register({
    name: "inbox_reply",
    description:
      "Send a reply to the original platform. Use inbox_analyze FIRST to understand " +
      "context and sentiment before replying.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxReplySchema.shape,
    handler: async ({
      workspace_slug,
      item_id,
      content,
    }: z.infer<typeof InboxReplySchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_reply", async () => {
        await resolveWorkspace(userId, workspace_slug);

        const result = await apiRequest<{ success: boolean; sentAt?: string }>(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/inbox/${encodeURIComponent(item_id)}/reply`,
          { method: "POST", body: JSON.stringify({ content }) },
        );

        return textResult(
          `**Reply Sent!**\n\n` +
          `Item \`${item_id}\` has been replied to.\n` +
          (result.sentAt ? `Sent at: ${result.sentAt}` : ""),
        );
      }),
  });

  registry.register({
    name: "inbox_analyze",
    description:
      "AI-analyze an inbox item for sentiment, intent, urgency, and suggested strategy. " +
      "Call this BEFORE replying to understand the context.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxItemIdSchema.shape,
    handler: async ({
      workspace_slug,
      item_id,
    }: z.infer<typeof InboxItemIdSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_analyze", async () => {
        await resolveWorkspace(userId, workspace_slug);

        const analysis = await apiRequest<{
          sentiment: string;
          sentimentScore: number;
          intent: string;
          urgency: string;
          suggestedStrategy: string;
          keyTopics: string[];
        }>(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/inbox/${encodeURIComponent(item_id)}/analyze`,
          { method: "POST" },
        );

        let text = `**Analysis for ${item_id}**\n\n`;
        text += `**Sentiment:** ${analysis.sentiment} (${(analysis.sentimentScore * 100).toFixed(0)}%)\n`;
        text += `**Intent:** ${analysis.intent}\n`;
        text += `**Urgency:** ${analysis.urgency}\n`;
        text += `**Strategy:** ${analysis.suggestedStrategy}\n`;
        if (analysis.keyTopics?.length > 0) {
          text += `**Topics:** ${analysis.keyTopics.join(", ")}\n`;
        }

        return textResult(text);
      }),
  });

  registry.register({
    name: "inbox_suggest_replies",
    description: "Get AI reply suggestions ranked by confidence score.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxItemIdSchema.shape,
    handler: async ({
      workspace_slug,
      item_id,
    }: z.infer<typeof InboxItemIdSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_suggest_replies", async () => {
        await resolveWorkspace(userId, workspace_slug);

        const suggestions = await apiRequest<Array<{
          id: string;
          content: string;
          confidence: number;
          strategy: string;
        }>>(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/inbox/${encodeURIComponent(item_id)}/suggestions`,
          { method: "POST" },
        );

        if (!suggestions || suggestions.length === 0) {
          return textResult(
            `**Suggestions for ${item_id}**\n\nNo suggestions generated. Try using \`inbox_analyze\` first.`,
          );
        }

        let text = `**Reply Suggestions for ${item_id}** (${suggestions.length})\n\n`;
        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i]!;
          text += `**${i + 1}. ${s.strategy}** (${(s.confidence * 100).toFixed(0)}% confidence)\n`;
          text += `${s.content}\n\n`;
        }

        text += `Use \`inbox_reply\` with one of these suggestions, or craft your own.`;
        return textResult(text);
      }),
  });

  registry.register({
    name: "inbox_escalate",
    description:
      "Escalate an inbox item to human attention. Provide a clear reason to help " +
      "the team prioritize. Use this when the situation requires human judgment.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxEscalateSchema.shape,
    handler: async ({
      workspace_slug,
      item_id,
      reason,
    }: z.infer<typeof InboxEscalateSchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_escalate", async () => {
        await resolveWorkspace(userId, workspace_slug);

        await apiRequest(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/inbox/${encodeURIComponent(item_id)}/escalate`,
          { method: "POST", body: JSON.stringify({ reason }) },
        );

        return textResult(
          `**Escalated!**\n\n` +
          `Item \`${item_id}\` has been escalated for human review.\n` +
          `**Reason:** ${reason}`,
        );
      }),
  });

  registry.register({
    name: "inbox_batch_reply",
    description:
      "AGENT-ONLY: Reply to multiple inbox items at once. Max 10 per call. " +
      "You MUST analyze each item before replying to ensure appropriate responses.",
    category: "orbit-inbox",
    tier: "workspace",
    inputSchema: InboxBatchReplySchema.shape,
    handler: async ({
      workspace_slug,
      replies,
    }: z.infer<typeof InboxBatchReplySchema>): Promise<CallToolResult> =>
      safeToolCall("inbox_batch_reply", async () => {
        await resolveWorkspace(userId, workspace_slug);

        const results: Array<{ item_id: string; success: boolean; error?: string }> = [];

        for (const reply of replies) {
          try {
            await apiRequest(
              `/api/orbit/${encodeURIComponent(workspace_slug)}/inbox/${encodeURIComponent(reply.item_id)}/reply`,
              { method: "POST", body: JSON.stringify({ content: reply.content }) },
            );
            results.push({ item_id: reply.item_id, success: true });
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            results.push({ item_id: reply.item_id, success: false, error: msg });
          }
        }

        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success);

        let text = `**Batch Reply Results**\n\n`;
        text += `**Succeeded:** ${succeeded}/${results.length}\n`;

        if (failed.length > 0) {
          text += `\n**Failed:**\n`;
          for (const f of failed) {
            text += `- \`${f.item_id}\`: ${f.error}\n`;
          }
        }

        return textResult(text);
      }),
  });
}
