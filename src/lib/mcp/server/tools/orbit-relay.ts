/**
 * Orbit Relay MCP Tools
 *
 * AI response draft management: generate, list, approve, reject, metrics.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, resolveWorkspace, apiRequest, textResult } from "./tool-helpers";

const RelayGenerateSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  item_id: z
    .string()
    .min(1)
    .describe("Inbox item ID to generate drafts for. Use inbox_list to find it."),
  count: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(3)
    .describe("Number of draft variations. Default: 3."),
});

const RelayListDraftsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "SENT", "FAILED"])
    .optional()
    .describe("Filter by draft status. Default: PENDING."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Max drafts. Default: 20."),
});

const RelayDraftIdSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  draft_id: z.string().min(1).describe("Relay draft ID. Use relay_list_drafts to find it."),
});

const RelayRejectSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  draft_id: z.string().min(1).describe("Relay draft ID."),
  feedback: z
    .string()
    .min(1)
    .max(1000)
    .describe("Feedback on why the draft was rejected. Improves future drafts."),
});

const RelayMetricsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
});

export function registerOrbitRelayTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "relay_generate_drafts",
    description:
      "Generate AI response drafts with confidence scores for an inbox item. " +
      "Each draft offers a different tone/approach.",
    category: "orbit-relay",
    tier: "workspace",
    inputSchema: RelayGenerateSchema.shape,
    handler: async ({
      workspace_slug,
      item_id,
      count,
    }: z.infer<typeof RelayGenerateSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_generate_drafts", async () => {
        await resolveWorkspace(userId, workspace_slug);

        const drafts = await apiRequest<Array<{
          id: string;
          content: string;
          confidenceScore: number;
          isPreferred: boolean;
        }>>(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/relay/drafts`,
          {
            method: "POST",
            body: JSON.stringify({ inboxItemId: item_id, count }),
          },
        );

        if (!drafts || drafts.length === 0) {
          return textResult(
            `**Drafts Generated (0)**\n\nNo drafts were generated. The inbox item may not need a response.`,
          );
        }

        let text = `**Drafts for ${item_id}** (${drafts.length})\n\n`;
        for (let i = 0; i < drafts.length; i++) {
          const d = drafts[i]!;
          text += `**${i + 1}.** ${d.isPreferred ? "⭐ PREFERRED " : ""}(${(d.confidenceScore * 100).toFixed(0)}% confidence)\n`;
          text += `${d.content}\n`;
          text += `Draft ID: \`${d.id}\`\n\n`;
        }

        text += `Use \`relay_approve_draft\` to approve, or \`relay_reject_draft\` with feedback.`;
        return textResult(text);
      }),
  });

  registry.register({
    name: "relay_list_drafts",
    description:
      "List drafts in the approval queue. Default: shows PENDING drafts awaiting review.",
    category: "orbit-relay",
    tier: "workspace",
    inputSchema: RelayListDraftsSchema.shape,
    handler: async ({
      workspace_slug,
      status,
      limit,
    }: z.infer<typeof RelayListDraftsSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_list_drafts", async () => {
        const workspace = await resolveWorkspace(userId, workspace_slug);
        const prisma = (await import("@/lib/prisma")).default;

        const where: Record<string, unknown> = {
          inboxItem: { workspaceId: workspace.id },
        };
        if (status) {
          where["status"] = status;
        } else {
          where["status"] = "PENDING";
        }

        const drafts = await prisma.relayDraft.findMany({
          where,
          select: {
            id: true,
            content: true,
            confidenceScore: true,
            status: true,
            isPreferred: true,
            createdAt: true,
            inboxItem: {
              select: {
                id: true,
                senderName: true,
                platform: true,
                content: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        if (drafts.length === 0) {
          return textResult(
            `**Relay Drafts (0)**\n\nNo ${status || "PENDING"} drafts. ` +
            `Use \`relay_generate_drafts\` to create new drafts for inbox items.`,
          );
        }

        let text = `**Relay Drafts (${drafts.length})**\n\n`;
        for (const d of drafts) {
          const preview = d.content.length > 200 ? d.content.slice(0, 200) + "..." : d.content;
          text += `- **Draft ${d.id.slice(0, 8)}** [${d.status}]`;
          text += d.isPreferred ? " ⭐" : "";
          text += ` (${(d.confidenceScore * 100).toFixed(0)}%)\n`;
          text += `  For: ${d.inboxItem.senderName} (${d.inboxItem.platform})\n`;
          text += `  "${preview}"\n`;
          text += `  ID: \`${d.id}\`\n`;
        }

        return textResult(text);
      }),
  });

  registry.register({
    name: "relay_approve_draft",
    description: "Approve a draft for sending. The draft will be sent to the original platform.",
    category: "orbit-relay",
    tier: "workspace",
    inputSchema: RelayDraftIdSchema.shape,
    handler: async ({
      workspace_slug,
      draft_id,
    }: z.infer<typeof RelayDraftIdSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_approve_draft", async () => {
        await resolveWorkspace(userId, workspace_slug);

        await apiRequest(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/relay/drafts/${encodeURIComponent(draft_id)}`,
          { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) },
        );

        return textResult(
          `**Draft Approved!**\n\nDraft \`${draft_id}\` has been approved and will be sent.`,
        );
      }),
  });

  registry.register({
    name: "relay_reject_draft",
    description:
      "Reject a draft with feedback. The feedback improves future draft generation quality.",
    category: "orbit-relay",
    tier: "workspace",
    inputSchema: RelayRejectSchema.shape,
    handler: async ({
      workspace_slug,
      draft_id,
      feedback,
    }: z.infer<typeof RelayRejectSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_reject_draft", async () => {
        await resolveWorkspace(userId, workspace_slug);

        await apiRequest(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/relay/drafts/${encodeURIComponent(draft_id)}`,
          { method: "PATCH", body: JSON.stringify({ status: "REJECTED", reason: feedback }) },
        );

        return textResult(
          `**Draft Rejected**\n\nDraft \`${draft_id}\` has been rejected.\n**Feedback:** ${feedback}\n\nThis feedback will improve future draft quality.`,
        );
      }),
  });

  registry.register({
    name: "relay_get_metrics",
    description:
      "Relay performance metrics: total drafts, approval rate, average confidence, response time.",
    category: "orbit-relay",
    tier: "workspace",
    inputSchema: RelayMetricsSchema.shape,
    handler: async ({
      workspace_slug,
    }: z.infer<typeof RelayMetricsSchema>): Promise<CallToolResult> =>
      safeToolCall("relay_get_metrics", async () => {
        await resolveWorkspace(userId, workspace_slug);

        const metrics = await apiRequest<{
          totalDrafts: number;
          approvedCount: number;
          rejectedCount: number;
          sentCount: number;
          pendingCount: number;
          averageConfidence: number;
          approvalRate: number;
          averageResponseTime: number | null;
        }>(
          `/api/orbit/${encodeURIComponent(workspace_slug)}/relay/metrics`,
        );

        let text = `**Relay Metrics for ${workspace_slug}**\n\n`;
        text += `**Total Drafts:** ${metrics.totalDrafts}\n`;
        text += `**Approved:** ${metrics.approvedCount}\n`;
        text += `**Rejected:** ${metrics.rejectedCount}\n`;
        text += `**Sent:** ${metrics.sentCount}\n`;
        text += `**Pending:** ${metrics.pendingCount}\n`;
        text += `**Approval Rate:** ${(metrics.approvalRate * 100).toFixed(1)}%\n`;
        text += `**Avg Confidence:** ${(metrics.averageConfidence * 100).toFixed(1)}%\n`;
        if (metrics.averageResponseTime != null) {
          text += `**Avg Response Time:** ${metrics.averageResponseTime.toFixed(1)}s\n`;
        }

        return textResult(text);
      }),
  });
}
