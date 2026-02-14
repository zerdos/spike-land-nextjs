/**
 * Email MCP Tools
 *
 * Email sending and delivery status tracking.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const EmailSendSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  to: z.string().min(1).describe("Recipient email address."),
  subject: z.string().min(1).describe("Email subject line."),
  template: z.string().min(1).describe("Email template name."),
});

const EmailGetStatusSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  email_id: z.string().min(1).describe("Email log ID."),
});

const EmailListSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(20).describe("Max records to return (default 20)."),
});

export function registerEmailTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "email_send",
    description: "Send an email from the workspace. Records the send intent with SENT status.",
    category: "email",
    tier: "free",
    inputSchema: EmailSendSchema.shape,
    handler: async (args: z.infer<typeof EmailSendSchema>): Promise<CallToolResult> =>
      safeToolCall("email_send", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const email = await prisma.emailLog.create({
          data: {
            userId,
            to: args.to,
            subject: args.subject,
            template: args.template,
            status: "SENT",
          },
        });
        return textResult(
          `**Email Queued**\n\n` +
          `**ID:** ${email.id}\n` +
          `**To:** ${args.to}\n` +
          `**Subject:** ${args.subject}\n` +
          `**Status:** SENT`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "email_get_status",
    description: "Get the delivery status of a sent email.",
    category: "email",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: EmailGetStatusSchema.shape,
    handler: async (args: z.infer<typeof EmailGetStatusSchema>): Promise<CallToolResult> =>
      safeToolCall("email_get_status", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const email = await prisma.emailLog.findFirst({
          where: { id: args.email_id },
        });
        if (!email) {
          return textResult(
            "**Error: NOT_FOUND**\nEmail record not found.\n**Retryable:** false",
          );
        }
        return textResult(
          `**Email Status**\n\n` +
          `**ID:** ${email.id}\n` +
          `**To:** ${email.to}\n` +
          `**Subject:** ${email.subject}\n` +
          `**Status:** ${email.status}\n` +
          `**Opened:** ${email.openedAt ? email.openedAt.toISOString() : "No"}\n` +
          `**Clicked:** ${email.clickedAt ? email.clickedAt.toISOString() : "No"}\n` +
          `**Bounced:** ${email.bouncedAt ? email.bouncedAt.toISOString() : "No"}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "email_list",
    description: "List recent email logs for the current user.",
    category: "email",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: EmailListSchema.shape,
    handler: async (args: z.infer<typeof EmailListSchema>): Promise<CallToolResult> =>
      safeToolCall("email_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const emails = await prisma.emailLog.findMany({
          where: { userId },
          orderBy: { sentAt: "desc" },
          take: args.limit ?? 20,
        });
        if (emails.length === 0) {
          return textResult("**No email records found.**");
        }
        let text = `**Email Logs (${emails.length})**\n\n`;
        for (const e of emails) {
          text += `- **${e.subject}** to ${e.to} — ${e.status} — ${e.sentAt.toISOString()}\n`;
          text += `  ID: ${e.id}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
