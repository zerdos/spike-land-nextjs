/**
 * Orbit Workspace MCP Tools
 *
 * Workspace listing, connected accounts, and real-time pulse metrics.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, resolveWorkspace, textResult } from "./tool-helpers";

const WorkspaceSlugSchema = z.object({
  workspace_slug: z
    .string()
    .min(1)
    .describe("Workspace slug. Use workspace_list to find it."),
});

export function registerOrbitWorkspaceTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "workspace_list",
    description:
      "List your Orbit workspaces. Call this FIRST before using any orbit-* tools " +
      "to get workspace slugs needed for all operations.",
    category: "orbit-workspace",
    tier: "free",
    inputSchema: {},
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("workspace_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;

        const workspaces = await prisma.workspace.findMany({
          where: {
            members: { some: { userId } },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            isPersonal: true,
            subscriptionTier: true,
            _count: {
              select: {
                socialAccounts: true,
                inboxItems: true,
                members: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        if (workspaces.length === 0) {
          return textResult(
            `**Workspaces (0)**\n\nNo workspaces found. Create one in the Orbit dashboard.`,
          );
        }

        let text = `**Workspaces (${workspaces.length})**\n\n`;
        for (const ws of workspaces) {
          text += `- **${ws.name}** (\`${ws.slug}\`)`;
          text += ` — ${ws.subscriptionTier}`;
          if (ws.isPersonal) text += ` [Personal]`;
          text += ` | Accounts: ${ws._count.socialAccounts}`;
          text += ` | Inbox: ${ws._count.inboxItems}`;
          text += ` | Members: ${ws._count.members}`;
          text += `\n`;
        }

        return textResult(text);
      }),
  });

  registry.register({
    name: "workspace_get_accounts",
    description:
      "List connected social media accounts for a workspace. " +
      "Shows platform, account name, and connection status.",
    category: "orbit-workspace",
    tier: "free",
    inputSchema: WorkspaceSlugSchema.shape,
    handler: async ({
      workspace_slug,
    }: z.infer<typeof WorkspaceSlugSchema>): Promise<CallToolResult> =>
      safeToolCall("workspace_get_accounts", async () => {
        const workspace = await resolveWorkspace(userId, workspace_slug);
        const prisma = (await import("@/lib/prisma")).default;

        const accounts = await prisma.socialAccount.findMany({
          where: { workspaceId: workspace.id },
          select: {
            id: true,
            platform: true,
            accountName: true,
            status: true,
            connectedAt: true,
          },
          orderBy: { connectedAt: "asc" },
        });

        if (accounts.length === 0) {
          return textResult(
            `**Accounts for ${workspace.name} (0)**\n\nNo social accounts connected. Connect accounts in the Orbit dashboard.`,
          );
        }

        let text = `**Accounts for ${workspace.name} (${accounts.length})**\n\n`;
        for (const acc of accounts) {
          text += `- **${acc.platform}**: ${acc.accountName} (${acc.status})`;
          text += ` — Connected: ${acc.connectedAt.toISOString().split("T")[0]}`;
          text += `\n  ID: ${acc.id}\n`;
        }

        return textResult(text);
      }),
  });

  registry.register({
    name: "workspace_get_pulse",
    description:
      "Real-time pulse for a workspace: inbox summary by status/platform/sentiment, " +
      "plus recent activity counts. Use this for a quick overview before diving in.",
    category: "orbit-workspace",
    tier: "free",
    inputSchema: WorkspaceSlugSchema.shape,
    handler: async ({
      workspace_slug,
    }: z.infer<typeof WorkspaceSlugSchema>): Promise<CallToolResult> =>
      safeToolCall("workspace_get_pulse", async () => {
        const workspace = await resolveWorkspace(userId, workspace_slug);
        const prisma = (await import("@/lib/prisma")).default;

        const [
          statusCounts,
          platformCounts,
          sentimentCounts,
          accountCount,
          recentDrafts,
        ] = await Promise.all([
          prisma.inboxItem.groupBy({
            by: ["status"],
            where: { workspaceId: workspace.id },
            _count: true,
          }),
          prisma.inboxItem.groupBy({
            by: ["platform"],
            where: { workspaceId: workspace.id },
            _count: true,
          }),
          prisma.inboxItem.groupBy({
            by: ["sentiment"],
            where: { workspaceId: workspace.id, sentiment: { not: null } },
            _count: true,
          }),
          prisma.socialAccount.count({
            where: { workspaceId: workspace.id, status: "ACTIVE" },
          }),
          prisma.relayDraft.count({
            where: {
              inboxItem: { workspaceId: workspace.id },
              status: "PENDING",
            },
          }),
        ]);

        let text = `**Pulse: ${workspace.name}**\n\n`;
        text += `**Active Accounts:** ${accountCount}\n`;
        text += `**Pending Drafts:** ${recentDrafts}\n\n`;

        text += `**Inbox by Status:**\n`;
        for (const s of statusCounts) {
          text += `- ${s.status}: ${s._count}\n`;
        }

        text += `\n**Inbox by Platform:**\n`;
        for (const p of platformCounts) {
          text += `- ${p.platform}: ${p._count}\n`;
        }

        if (sentimentCounts.length > 0) {
          text += `\n**Inbox by Sentiment:**\n`;
          for (const s of sentimentCounts) {
            text += `- ${s.sentiment}: ${s._count}\n`;
          }
        }

        return textResult(text);
      }),
  });
}
