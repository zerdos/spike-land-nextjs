/**
 * Admin Dashboard MCP Tools
 *
 * Administrative tools for managing agents, emails, gallery, jobs, photos, and sitemap.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListAgentsSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).optional().default("ALL").describe("Filter by agent status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const ManageAgentSchema = z.object({
  agent_id: z.string().min(1).describe("Agent ID to manage."),
  action: z.enum(["activate", "deactivate", "restart"]).describe("Action to perform."),
});

const ListEmailsSchema = z.object({
  status: z.enum(["SENT", "PENDING", "FAILED", "ALL"]).optional().default("ALL").describe("Filter by status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const SendEmailSchema = z.object({
  to: z.string().email().describe("Recipient email address."),
  subject: z.string().min(1).max(200).describe("Email subject."),
  template: z.string().min(1).describe("Email template name."),
});

const ListGallerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  featured: z.boolean().optional().describe("Filter featured items only."),
});

const ManageGallerySchema = z.object({
  item_id: z.string().min(1).describe("Gallery item ID."),
  action: z.enum(["feature", "unfeature", "remove"]).describe("Gallery action."),
});

const ListJobsSchema = z.object({
  status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "ALL"]).optional().default("ALL").describe("Filter by status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const ManageJobSchema = z.object({
  job_id: z.string().min(1).describe("Job ID."),
  action: z.enum(["cancel", "retry", "delete"]).describe("Job action."),
});

const ListPhotosSchema = z.object({
  status: z.enum(["APPROVED", "PENDING", "REJECTED", "ALL"]).optional().default("ALL").describe("Filter by moderation status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const ModeratePhotoSchema = z.object({
  photo_id: z.string().min(1).describe("Photo ID."),
  action: z.enum(["approve", "reject"]).describe("Moderation action."),
  reason: z.string().optional().describe("Reason for rejection."),
});

export function registerAdminTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "admin_list_agents",
    description: "List all registered AI agents and their statuses.",
    category: "admin",
    tier: "workspace",
    inputSchema: ListAgentsSchema.shape,
    handler: async ({ status = "ALL", limit = 20 }: z.infer<typeof ListAgentsSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_list_agents", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? {} : { status };
        const agents = await prisma.aIProvider.findMany({
          where,
          select: { id: true, name: true, provider: true, isActive: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (agents.length === 0) return textResult("No agents found.");
        let text = `**Agents (${agents.length}):**\n\n`;
        for (const a of agents) {
          text += `- **${a.name}** (${a.provider}) [${a.isActive ? "ACTIVE" : "INACTIVE"}]\n  ID: ${a.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "admin_manage_agent",
    description: "Activate, deactivate, or restart an AI agent.",
    category: "admin",
    tier: "workspace",
    inputSchema: ManageAgentSchema.shape,
    handler: async ({ agent_id, action }: z.infer<typeof ManageAgentSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_manage_agent", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const isActive = action === "activate" || action === "restart";
        await prisma.aIProvider.update({
          where: { id: agent_id },
          data: { isActive },
        });
        return textResult(`**Agent ${agent_id}** — action: ${action} completed.`);
      }),
  });

  registry.register({
    name: "admin_list_emails",
    description: "List sent, pending, or failed emails from the platform.",
    category: "admin",
    tier: "workspace",
    inputSchema: ListEmailsSchema.shape,
    handler: async ({ status = "ALL", limit = 20 }: z.infer<typeof ListEmailsSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_list_emails", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? {} : { status };
        const emails = await prisma.emailLog.findMany({
          where,
          select: { id: true, to: true, subject: true, status: true, sentAt: true },
          take: limit,
          orderBy: { sentAt: "desc" },
        });
        if (emails.length === 0) return textResult("No emails found.");
        let text = `**Emails (${emails.length}):**\n\n`;
        for (const e of emails) {
          text += `- **${e.subject}** → ${e.to} [${e.status}]\n  ID: ${e.id} | Sent: ${e.sentAt?.toISOString() ?? "pending"}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "admin_send_email",
    description: "Send an email using a predefined template.",
    category: "admin",
    tier: "workspace",
    inputSchema: SendEmailSchema.shape,
    handler: async ({ to, subject, template }: z.infer<typeof SendEmailSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_send_email", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const email = await prisma.emailLog.create({
          data: { to, subject, template, status: "PENDING", userId },
        });
        return textResult(`**Email queued!**\n\nID: ${email.id}\nTo: ${to}\nSubject: ${subject}\nTemplate: ${template}`);
      }),
  });

  registry.register({
    name: "admin_list_gallery",
    description: "List gallery items, optionally filtering by featured status.",
    category: "admin",
    tier: "workspace",
    inputSchema: ListGallerySchema.shape,
    handler: async ({ limit = 20, featured }: z.infer<typeof ListGallerySchema>): Promise<CallToolResult> =>
      safeToolCall("admin_list_gallery", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = featured !== undefined ? { featured } : {};
        const items = await prisma.featuredGalleryItem.findMany({
          where,
          select: { id: true, title: true, imageUrl: true, featured: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (items.length === 0) return textResult("No gallery items found.");
        let text = `**Gallery (${items.length}):**\n\n`;
        for (const item of items) {
          text += `- **${item.title}** ${item.featured ? "[FEATURED]" : ""}\n  ID: ${item.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "admin_manage_gallery",
    description: "Feature, unfeature, or remove a gallery item.",
    category: "admin",
    tier: "workspace",
    inputSchema: ManageGallerySchema.shape,
    handler: async ({ item_id, action }: z.infer<typeof ManageGallerySchema>): Promise<CallToolResult> =>
      safeToolCall("admin_manage_gallery", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        if (action === "remove") {
          await prisma.featuredGalleryItem.delete({ where: { id: item_id } });
          return textResult(`**Gallery item ${item_id}** removed.`);
        }
        await prisma.featuredGalleryItem.update({
          where: { id: item_id },
          data: { featured: action === "feature" },
        });
        return textResult(`**Gallery item ${item_id}** — ${action} completed.`);
      }),
  });

  registry.register({
    name: "admin_list_jobs",
    description: "List background jobs with optional status filter.",
    category: "admin",
    tier: "workspace",
    inputSchema: ListJobsSchema.shape,
    handler: async ({ status = "ALL", limit = 20 }: z.infer<typeof ListJobsSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_list_jobs", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? {} : { status };
        const jobs = await prisma.mcpGenerationJob.findMany({
          where,
          select: { id: true, type: true, status: true, prompt: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (jobs.length === 0) return textResult("No jobs found.");
        let text = `**Jobs (${jobs.length}):**\n\n`;
        for (const j of jobs) {
          text += `- **${j.type}** [${j.status}]\n  ID: ${j.id} | Prompt: ${j.prompt.slice(0, 80)}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "admin_manage_job",
    description: "Cancel, retry, or delete a background job.",
    category: "admin",
    tier: "workspace",
    inputSchema: ManageJobSchema.shape,
    handler: async ({ job_id, action }: z.infer<typeof ManageJobSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_manage_job", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        if (action === "delete") {
          await prisma.mcpGenerationJob.delete({ where: { id: job_id } });
          return textResult(`**Job ${job_id}** deleted.`);
        }
        const newStatus = action === "cancel" ? "FAILED" : "QUEUED";
        await prisma.mcpGenerationJob.update({
          where: { id: job_id },
          data: { status: newStatus },
        });
        return textResult(`**Job ${job_id}** — ${action} completed. New status: ${newStatus}`);
      }),
  });

  registry.register({
    name: "admin_list_photos",
    description: "List photos with moderation status filter.",
    category: "admin",
    tier: "workspace",
    inputSchema: ListPhotosSchema.shape,
    handler: async ({ status = "ALL", limit = 20 }: z.infer<typeof ListPhotosSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_list_photos", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? {} : { moderationStatus: status };
        const photos = await prisma.enhancedImage.findMany({
          where,
          select: { id: true, title: true, url: true, moderationStatus: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (photos.length === 0) return textResult("No photos found.");
        let text = `**Photos (${photos.length}):**\n\n`;
        for (const p of photos) {
          text += `- **${p.title || "Untitled"}** [${p.moderationStatus}]\n  ID: ${p.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "admin_moderate_photo",
    description: "Approve or reject a photo for public display.",
    category: "admin",
    tier: "workspace",
    inputSchema: ModeratePhotoSchema.shape,
    handler: async ({ photo_id, action, reason }: z.infer<typeof ModeratePhotoSchema>): Promise<CallToolResult> =>
      safeToolCall("admin_moderate_photo", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.enhancedImage.update({
          where: { id: photo_id },
          data: {
            moderationStatus: action === "approve" ? "APPROVED" : "REJECTED",
            moderationReason: reason,
          },
        });
        return textResult(`**Photo ${photo_id}** — ${action === "approve" ? "approved" : "rejected"}.${reason ? ` Reason: ${reason}` : ""}`);
      }),
  });
}
