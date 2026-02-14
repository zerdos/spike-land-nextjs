/**
 * Social Accounts MCP Tools
 *
 * Manage social media accounts, publish posts, and track post metrics.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const ListAccountsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  platform: z.string().optional().describe("Filter by platform (e.g., INSTAGRAM, TWITTER, FACEBOOK)."),
  status: z.string().optional().describe("Filter by status: ACTIVE, DISCONNECTED, or EXPIRED."),
});

const GetAccountSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  account_id: z.string().min(1).describe("Social account database ID."),
});

const PublishPostSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  account_ids: z.array(z.string().min(1)).min(1).describe("Array of social account IDs to publish to."),
  content: z.string().min(1).describe("Post content text."),
  scheduled_at: z.string().optional().describe("Optional ISO 8601 date to schedule the post."),
});

const GetPostSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  post_id: z.string().min(1).describe("Social post ID."),
});

const DeletePostSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  post_id: z.string().min(1).describe("Social post ID to delete."),
  confirm: z.boolean().describe("Must be true to confirm deletion."),
});

export function registerSocialAccountsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "social_list_accounts",
    description: "List social media accounts in a workspace with optional platform and status filters.",
    category: "social-accounts",
    tier: "free",
    inputSchema: ListAccountsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof ListAccountsSchema>): Promise<CallToolResult> =>
      safeToolCall("social_list_accounts", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.platform) where["platform"] = args.platform;
        if (args.status) where["status"] = args.status;
        const accounts = await prisma.socialAccount.findMany({
          where,
          select: {
            id: true,
            platform: true,
            accountId: true,
            accountName: true,
            status: true,
            connectedAt: true,
            metadata: true,
            health: { select: { healthScore: true, status: true } },
          },
        });
        if (accounts.length === 0) {
          return textResult("**Social Accounts**\n\nNo accounts found matching the filters.");
        }
        let text = `**Social Accounts** (${accounts.length})\n\n`;
        for (const a of accounts) {
          const health = a.health;
          const healthInfo = health ? ` | Health: ${health.healthScore}/100 (${health.status})` : "";
          text += `- **${a.accountName}** (${a.platform}) — ${a.status}${healthInfo}\n`;
          text += `  ID: \`${a.id}\` | Connected: ${a.connectedAt.toISOString()}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "social_get_account",
    description: "Get detailed information about a specific social media account.",
    category: "social-accounts",
    tier: "free",
    inputSchema: GetAccountSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetAccountSchema>): Promise<CallToolResult> =>
      safeToolCall("social_get_account", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);
        const account = await prisma.socialAccount.findFirst({
          where: { id: args.account_id, workspaceId: workspace.id },
          select: {
            id: true,
            platform: true,
            accountId: true,
            accountName: true,
            status: true,
            connectedAt: true,
            metadata: true,
            health: { select: { healthScore: true, status: true } },
            metrics: {
              orderBy: { date: "desc" },
              take: 7,
              select: { date: true, followers: true, engagementRate: true, impressions: true, reach: true },
            },
            _count: { select: { postAccounts: true } },
          },
        });
        if (!account) {
          return textResult("**Error: NOT_FOUND**\nSocial account not found in this workspace.\n**Retryable:** false");
        }
        let text = `**Social Account Details**\n\n`;
        text += `**Name:** ${account.accountName}\n`;
        text += `**Platform:** ${account.platform}\n`;
        text += `**Platform ID:** ${account.accountId}\n`;
        text += `**Status:** ${account.status}\n`;
        text += `**Connected:** ${account.connectedAt.toISOString()}\n`;
        text += `**Total Posts:** ${account._count.postAccounts}\n`;
        if (account.health) {
          text += `\n**Health:** ${account.health.healthScore}/100 (${account.health.status})\n`;
        }
        if (account.metrics.length > 0) {
          text += `\n**Recent Metrics (last ${account.metrics.length} entries):**\n`;
          for (const m of account.metrics) {
            text += `- ${m.date.toISOString().split("T")[0]}: ${m.followers} followers, ${m.impressions} impressions, ${m.reach} reach\n`;
          }
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "social_publish_post",
    description: "Create a social media post and link it to one or more accounts.",
    category: "social-accounts",
    tier: "free",
    inputSchema: PublishPostSchema.shape,
    handler: async (args: z.infer<typeof PublishPostSchema>): Promise<CallToolResult> =>
      safeToolCall("social_publish_post", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const status = args.scheduled_at ? "SCHEDULED" : "DRAFT";
        const post = await prisma.socialPost.create({
          data: {
            content: args.content,
            status,
            createdById: userId,
            ...(args.scheduled_at ? { scheduledAt: new Date(args.scheduled_at) } : {}),
          },
        });
        for (const accountId of args.account_ids) {
          await prisma.socialPostAccount.create({
            data: { postId: post.id, accountId },
          });
        }
        return textResult(
          `**Post Created**\n\n` +
          `**Post ID:** \`${post.id}\`\n` +
          `**Status:** ${status}\n` +
          `**Linked Accounts:** ${args.account_ids.length}\n` +
          (args.scheduled_at ? `**Scheduled At:** ${args.scheduled_at}\n` : ""),
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "social_get_post",
    description: "Get a social media post with its linked accounts and metrics.",
    category: "social-accounts",
    tier: "free",
    inputSchema: GetPostSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetPostSchema>): Promise<CallToolResult> =>
      safeToolCall("social_get_post", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const post = await prisma.socialPost.findFirst({
          where: { id: args.post_id },
          select: {
            id: true,
            content: true,
            status: true,
            scheduledAt: true,
            publishedAt: true,
            likes: true,
            comments: true,
            shares: true,
            impressions: true,
            reach: true,
            engagementRate: true,
            createdAt: true,
            postAccounts: {
              select: {
                id: true,
                status: true,
                publishedAt: true,
                account: { select: { platform: true, accountName: true } },
              },
            },
          },
        });
        if (!post) {
          return textResult("**Error: NOT_FOUND**\nSocial post not found.\n**Retryable:** false");
        }
        let text = `**Social Post**\n\n`;
        text += `**Post ID:** \`${post.id}\`\n`;
        text += `**Status:** ${post.status}\n`;
        text += `**Content:** ${post.content}\n`;
        text += `**Created:** ${post.createdAt.toISOString()}\n`;
        if (post.scheduledAt) text += `**Scheduled:** ${post.scheduledAt.toISOString()}\n`;
        if (post.publishedAt) text += `**Published:** ${post.publishedAt.toISOString()}\n`;
        if (post.likes !== null || post.impressions !== null) {
          text += `\n**Metrics:**\n`;
          text += `- Likes: ${post.likes ?? 0} | Comments: ${post.comments ?? 0} | Shares: ${post.shares ?? 0}\n`;
          text += `- Impressions: ${post.impressions ?? 0} | Reach: ${post.reach ?? 0}\n`;
          if (post.engagementRate !== null) text += `- Engagement Rate: ${post.engagementRate}\n`;
        }
        if (post.postAccounts.length > 0) {
          text += `\n**Linked Accounts (${post.postAccounts.length}):**\n`;
          for (const pa of post.postAccounts) {
            text += `- ${pa.account.accountName} (${pa.account.platform}) — ${pa.status}\n`;
          }
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "social_delete_post",
    description: "Delete a social media post. Requires explicit confirmation.",
    category: "social-accounts",
    tier: "free",
    inputSchema: DeletePostSchema.shape,
    annotations: { destructiveHint: true },
    handler: async (args: z.infer<typeof DeletePostSchema>): Promise<CallToolResult> =>
      safeToolCall("social_delete_post", async () => {
        if (!args.confirm) {
          return textResult("**Error: CONFIRMATION_REQUIRED**\nYou must set `confirm: true` to delete a post.\n**Retryable:** true");
        }
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const post = await prisma.socialPost.findFirst({
          where: { id: args.post_id },
          select: { id: true },
        });
        if (!post) {
          return textResult("**Error: NOT_FOUND**\nSocial post not found.\n**Retryable:** false");
        }
        await prisma.socialPost.delete({ where: { id: args.post_id } });
        return textResult(`**Post Deleted**\n\nPost \`${args.post_id}\` has been permanently deleted.`);
      }, { timeoutMs: 30_000 }),
  });
}
