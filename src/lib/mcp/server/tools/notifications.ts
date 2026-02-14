/**
 * Notifications MCP Tools
 *
 * List, mark read, configure channels, and send workspace notifications.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const NotificationListSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  unread_only: z.boolean().optional().default(false).describe("Only show unread notifications."),
  limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
});

const NotificationMarkReadSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  notification_ids: z.array(z.string().min(1)).min(1).describe("Array of notification IDs to mark as read."),
});

const NotificationConfigureChannelsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  email_enabled: z.boolean().optional().describe("Enable email notifications."),
  slack_enabled: z.boolean().optional().describe("Enable Slack notifications."),
  in_app_enabled: z.boolean().optional().describe("Enable in-app notifications."),
});

const NotificationSendSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  title: z.string().min(1).describe("Notification title."),
  message: z.string().min(1).describe("Notification message body."),
  priority: z.string().optional().default("MEDIUM").describe("Priority: LOW, MEDIUM, HIGH (default MEDIUM)."),
  user_id: z.string().optional().describe("Specific user ID to notify. Omit for workspace-wide."),
});

export function registerNotificationsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "notification_list",
    description: "List notifications for the workspace, optionally filtered to unread only.",
    category: "notifications",
    tier: "free",
    readOnlyHint: true,
    inputSchema: NotificationListSchema.shape,
    handler: async (args: z.infer<typeof NotificationListSchema>): Promise<CallToolResult> =>
      safeToolCall("notification_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = {
          workspaceId: ws.id,
          OR: [{ userId }, { userId: null }],
        };
        if (args.unread_only) where["read"] = false;
        const notifications = await prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (notifications.length === 0) {
          return textResult("**No notifications found.**");
        }
        const lines = notifications.map((n: { id: string; type: string; title: string; message: string; read: boolean; createdAt: Date }) =>
          `- ${n.read ? "" : "[UNREAD] "}**${n.title}** — ${n.message} — ${n.type} — ${n.createdAt.toISOString()}`,
        );
        return textResult(
          `**Notifications (${notifications.length})**\n\n${lines.join("\n")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "notification_mark_read",
    description: "Mark one or more notifications as read.",
    category: "notifications",
    tier: "free",
    inputSchema: NotificationMarkReadSchema.shape,
    handler: async (args: z.infer<typeof NotificationMarkReadSchema>): Promise<CallToolResult> =>
      safeToolCall("notification_mark_read", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const result = await prisma.notification.updateMany({
          where: { id: { in: args.notification_ids } },
          data: { read: true, readAt: new Date() },
        });
        return textResult(
          `**Notifications Updated**\n\n` +
          `**Marked as read:** ${result.count}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "notification_configure_channels",
    description: "Configure notification delivery channels for the workspace.",
    category: "notifications",
    tier: "free",
    inputSchema: NotificationConfigureChannelsSchema.shape,
    handler: async (args: z.infer<typeof NotificationConfigureChannelsSchema>): Promise<CallToolResult> =>
      safeToolCall("notification_configure_channels", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const data: Record<string, boolean> = {};
        if (args.email_enabled !== undefined) data["emailNotifications"] = args.email_enabled;
        if (args.slack_enabled !== undefined) data["slackNotifications"] = args.slack_enabled;
        if (args.in_app_enabled !== undefined) data["inAppNotifications"] = args.in_app_enabled;
        await prisma.workspaceSettings.upsert({
          where: { workspaceId: ws.id },
          create: { workspaceId: ws.id, ...data },
          update: data,
        });
        return textResult(
          `**Notification Channels Updated**\n\n` +
          `**Email:** ${args.email_enabled ?? "(unchanged)"}\n` +
          `**Slack:** ${args.slack_enabled ?? "(unchanged)"}\n` +
          `**In-App:** ${args.in_app_enabled ?? "(unchanged)"}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "notification_send",
    description: "Send a notification to a specific user or the entire workspace.",
    category: "notifications",
    tier: "free",
    inputSchema: NotificationSendSchema.shape,
    handler: async (args: z.infer<typeof NotificationSendSchema>): Promise<CallToolResult> =>
      safeToolCall("notification_send", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const notification = await prisma.notification.create({
          data: {
            workspaceId: ws.id,
            userId: args.user_id ?? null,
            title: args.title,
            message: args.message,
            priority: args.priority,
            type: "MANUAL",
            read: false,
          },
        });
        return textResult(
          `**Notification Sent**\n\n` +
          `**ID:** ${notification.id}\n` +
          `**Title:** ${args.title}\n` +
          `**Priority:** ${args.priority}\n` +
          `**Target:** ${args.user_id ?? "workspace-wide"}`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
