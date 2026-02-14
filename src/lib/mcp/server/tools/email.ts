/**
 * Email MCP Tools
 *
 * Email sending, template-based sending, and delivery status tracking.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const EmailSendSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  to: z.string().min(1).describe("Recipient email address."),
  subject: z.string().min(1).describe("Email subject line."),
  body: z.string().min(1).describe("Email body content."),
  reply_to: z.string().optional().describe("Optional reply-to email address."),
});

const EmailSendTemplateSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  template_name: z.string().min(1).describe("Name of the email template to use."),
  to: z.string().min(1).describe("Recipient email address."),
  variables: z.string().min(1).describe("JSON object of template variables."),
});

const EmailGetStatusSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  email_id: z.string().min(1).describe("Email record ID."),
});

export function registerEmailTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "email_send",
    description: "Send an email from the workspace. Records the send intent with PENDING status.",
    category: "email",
    tier: "free",
    inputSchema: EmailSendSchema.shape,
    handler: async (args: z.infer<typeof EmailSendSchema>): Promise<CallToolResult> =>
      safeToolCall("email_send", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const email = await prisma.emailRecord.create({
          data: {
            workspaceId: ws.id,
            senderId: userId,
            to: args.to,
            subject: args.subject,
            body: args.body,
            replyTo: args.reply_to ?? null,
            status: "PENDING",
          },
        });
        return textResult(
          `**Email Queued**\n\n` +
          `**ID:** ${email.id}\n` +
          `**To:** ${args.to}\n` +
          `**Subject:** ${args.subject}\n` +
          `**Status:** PENDING`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "email_send_template",
    description: "Send a templated email. Looks up the template by name and applies variables.",
    category: "email",
    tier: "free",
    inputSchema: EmailSendTemplateSchema.shape,
    handler: async (args: z.infer<typeof EmailSendTemplateSchema>): Promise<CallToolResult> =>
      safeToolCall("email_send_template", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const template = await prisma.emailTemplate.findFirst({
          where: { workspaceId: ws.id, name: args.template_name },
        });
        if (!template) {
          return textResult(
            `**Error: NOT_FOUND**\nTemplate "${args.template_name}" not found.\n**Retryable:** false`,
          );
        }
        const email = await prisma.emailRecord.create({
          data: {
            workspaceId: ws.id,
            senderId: userId,
            to: args.to,
            subject: template.subject,
            body: template.body,
            templateId: template.id,
            variables: args.variables,
            status: "PENDING",
          },
        });
        return textResult(
          `**Templated Email Queued**\n\n` +
          `**ID:** ${email.id}\n` +
          `**Template:** ${args.template_name}\n` +
          `**To:** ${args.to}\n` +
          `**Status:** PENDING`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "email_get_status",
    description: "Get the delivery status of a sent email.",
    category: "email",
    tier: "free",
    readOnlyHint: true,
    inputSchema: EmailGetStatusSchema.shape,
    handler: async (args: z.infer<typeof EmailGetStatusSchema>): Promise<CallToolResult> =>
      safeToolCall("email_get_status", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const email = await prisma.emailRecord.findFirst({
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
          `**Opened:** ${email.opened ?? false}\n` +
          `**Clicked:** ${email.clicked ?? false}\n` +
          `**Bounced:** ${email.bounced ?? false}`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
