/**
 * Relay MCP Tools
 *
 * AI-powered response drafting, approval workflow, and relay metrics.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const RelayGenerateDraftsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  inbox_item_id: z.string().min(1).describe("Inbox item ID to generate drafts for."),
  count: z.number().optional().default(3).describe("Number of drafts to generate (default 3)."),
  tone: z.string().optional().describe("Desired tone for responses (e.g. friendly, formal, casual)."),
});

const RelayApproveDraftSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  draft_id: z.string().min(1).describe("Draft ID to approve."),
});

const RelayRejectDraftSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  draft_id: z.string().min(1).describe("Draft ID to reject."),
  reason: z.string().optional().describe("Reason for rejection."),
});

const RelayMetricsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  days: z.number().optional().default(30).describe("Number of days to look back (default 30)."),
});

const RelayListPendingSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
});

export function registerRelayTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "relay_generate_drafts",
    description: "Generate AI response drafts for an inbox item. Creates PENDING drafts for human review.",
    category: "relay",
    tier: "free",
    inputSchema: RelayGenerateDraftsSchema.shape,
    handler: async (args: z.infer<typeof RelayGenerateDraftsSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_generate_drafts", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const inboxItem = await prisma.inboxItem.findFirst({
          where: { id: args.inbox_item_id, workspaceId: workspace.id },
        });

        if (!inboxItem) {
          return textResult("**Error: NOT_FOUND**\nInbox item not found.\n**Retryable:** false");
        }

        const count = args.count ?? 3;
        const draftIds: string[] = [];

        for (let i = 0; i < count; i++) {
          const draft = await prisma.relayDraft.create({
            data: {
              inboxItemId: args.inbox_item_id,
              content: `[Pending AI generation - draft ${i + 1}]`,
              status: "PENDING",
              confidenceScore: 0,
              metadata: args.tone ? { tone: args.tone } : {},
            },
          });
          draftIds.push((draft as Record<string, unknown>)["id"] as string);
        }

        return textResult(
          `**Drafts Created**\n\n` +
          `**Inbox Item:** ${args.inbox_item_id}\n` +
          `**Count:** ${draftIds.length}\n` +
          `**Status:** PENDING\n` +
          (args.tone ? `**Tone:** ${args.tone}\n` : "") +
          `**Draft IDs:**\n${draftIds.map((id) => `- ${id}`).join("\n")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "relay_approve_draft",
    description: "Approve a pending relay draft for sending.",
    category: "relay",
    tier: "free",
    inputSchema: RelayApproveDraftSchema.shape,
    handler: async (args: z.infer<typeof RelayApproveDraftSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_approve_draft", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const draft = await prisma.relayDraft.findFirst({
          where: { id: args.draft_id },
        });

        if (!draft) {
          return textResult("**Error: NOT_FOUND**\nDraft not found.\n**Retryable:** false");
        }

        const record = draft as Record<string, unknown>;
        if (record["status"] !== "PENDING") {
          return textResult(
            `**Error: INVALID_STATUS**\nDraft is ${record["status"]}, not PENDING.\n**Retryable:** false`,
          );
        }

        await prisma.relayDraft.update({
          where: { id: args.draft_id },
          data: {
            status: "APPROVED",
            reviewedById: userId,
            reviewedAt: new Date(),
          },
        });

        return textResult(
          `**Draft Approved**\n\n` +
          `**Draft ID:** ${args.draft_id}\n` +
          `**Status:** APPROVED\n` +
          `**Reviewed by:** ${userId}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "relay_reject_draft",
    description: "Reject a relay draft with an optional reason.",
    category: "relay",
    tier: "free",
    inputSchema: RelayRejectDraftSchema.shape,
    handler: async (args: z.infer<typeof RelayRejectDraftSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_reject_draft", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const draft = await prisma.relayDraft.findFirst({
          where: { id: args.draft_id },
        });

        if (!draft) {
          return textResult("**Error: NOT_FOUND**\nDraft not found.\n**Retryable:** false");
        }

        await prisma.relayDraft.update({
          where: { id: args.draft_id },
          data: {
            status: "REJECTED",
            reason: args.reason || null,
            reviewedById: userId,
            reviewedAt: new Date(),
          },
        });

        return textResult(
          `**Draft Rejected**\n\n` +
          `**Draft ID:** ${args.draft_id}\n` +
          `**Status:** REJECTED\n` +
          (args.reason ? `**Reason:** ${args.reason}\n` : ""),
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "relay_get_metrics",
    description: "Get relay draft metrics for a workspace over a time period.",
    category: "relay",
    tier: "free",
    readOnlyHint: true,
    inputSchema: RelayMetricsSchema.shape,
    handler: async (args: z.infer<typeof RelayMetricsSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_get_metrics", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const days = args.days ?? 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        // Get inbox item IDs for this workspace
        const inboxItems = await prisma.inboxItem.findMany({
          where: { workspaceId: workspace.id },
          select: { id: true },
        });
        const itemIds = inboxItems.map((i: Record<string, unknown>) => i["id"] as string);

        if (itemIds.length === 0) {
          return textResult(
            `**Relay Metrics (${days} days)**\n\nNo inbox items found for this workspace.`,
          );
        }

        const drafts = await prisma.relayDraft.groupBy({
          by: ["status"],
          where: {
            inboxItemId: { in: itemIds },
            createdAt: { gte: since },
          },
          _count: { status: true },
        });

        let totalDrafts = 0;
        let approved = 0;
        let text = `**Relay Metrics (${days} days)**\n\n`;
        text += `| Status | Count |\n| --- | --- |\n`;

        for (const group of drafts as Array<Record<string, unknown>>) {
          const countObj = group["_count"] as Record<string, number>;
          const count = countObj["status"];
          const status = group["status"] as string;
          text += `| ${status} | ${count} |\n`;
          totalDrafts += count;
          if (status === "APPROVED") approved = count;
        }

        const approvalRate = totalDrafts > 0 ? ((approved / totalDrafts) * 100).toFixed(1) : "0.0";
        text += `\n**Total Drafts:** ${totalDrafts}\n`;
        text += `**Approval Rate:** ${approvalRate}%\n`;

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "relay_list_pending",
    description: "List pending relay drafts awaiting review.",
    category: "relay",
    tier: "free",
    readOnlyHint: true,
    inputSchema: RelayListPendingSchema.shape,
    handler: async (args: z.infer<typeof RelayListPendingSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_list_pending", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        // Get inbox item IDs for this workspace
        const inboxItems = await prisma.inboxItem.findMany({
          where: { workspaceId: workspace.id },
          select: { id: true },
        });
        const itemIds = inboxItems.map((i: Record<string, unknown>) => i["id"] as string);

        if (itemIds.length === 0) {
          return textResult(`**Pending Drafts (0)**\n\nNo inbox items found for this workspace.`);
        }

        const drafts = await prisma.relayDraft.findMany({
          where: {
            inboxItemId: { in: itemIds },
            status: "PENDING",
          },
          include: {
            inboxItem: { select: { senderName: true, content: true } },
          },
          orderBy: { createdAt: "desc" },
          take: args.limit ?? 20,
        });

        if (drafts.length === 0) {
          return textResult(`**Pending Drafts (0)**\n\nNo pending drafts.`);
        }

        let text = `**Pending Drafts (${drafts.length})**\n\n`;
        for (const draft of drafts as Array<Record<string, unknown>>) {
          const inboxItem = draft["inboxItem"] as Record<string, unknown> | undefined;
          const contentStr = String(draft["content"] || "");
          const snippet = contentStr.length > 80 ? contentStr.slice(0, 80) + "..." : contentStr;
          text += `- **Draft ${draft["id"]}**\n`;
          text += `  From: ${inboxItem?.["senderName"] || "Unknown"}\n`;
          text += `  Content: ${snippet}\n`;
          text += `  Created: ${draft["createdAt"] instanceof Date ? (draft["createdAt"] as Date).toISOString() : String(draft["createdAt"])}\n\n`;
        }

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
