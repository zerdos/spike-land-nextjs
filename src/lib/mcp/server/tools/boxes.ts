/**
 * Boxes Management MCP Tools
 *
 * Physical/virtual box management for storage and organization.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { BoxStatus } from "@prisma/client";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const BOX_STATUSES = ["CREATING", "STARTING", "RUNNING", "PAUSED", "STOPPING", "STOPPED", "TERMINATED", "ERROR"] as const;

const ListBoxesSchema = z.object({
  status: z.enum(["RUNNING", "STOPPED", "ALL"]).optional().default("ALL").describe("Filter by status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const CreateBoxSchema = z.object({
  name: z.string().min(1).max(200).describe("Box name."),
  description: z.string().optional().describe("Box description."),
});

const GetBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
});

const UpdateBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
  name: z.string().optional().describe("New name."),
  description: z.string().optional().describe("New description."),
  status: z.enum(BOX_STATUSES).optional().describe("New status."),
});

const DeleteBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID to delete."),
});

const AddMessageToBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
  role: z.enum(["USER", "AGENT", "SYSTEM"]).describe("Message role."),
  content: z.string().min(1).describe("Message content."),
});

const ListBoxMessagesSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)."),
});

export function registerBoxesTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "boxes_list",
    description: "List all boxes with optional status filter.",
    category: "boxes",
    tier: "free",
    inputSchema: ListBoxesSchema.shape,
    handler: async ({ status = "ALL", limit = 20 }: z.infer<typeof ListBoxesSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where: { userId: string; status?: BoxStatus } = { userId };
        if (status !== "ALL") {
          where.status = status as BoxStatus;
        }
        const boxes = await prisma.box.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            _count: { select: { messages: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (boxes.length === 0) return textResult("No boxes found.");
        let text = `**Boxes (${boxes.length}):**\n\n`;
        for (const b of boxes) {
          text += `- **${b.name}** [${b.status}] — ${b["_count"]["messages"]} messages\n  ${b.description || "(no description)"}\n  ID: ${b.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "boxes_create",
    description: "Create a new box for organizing items.",
    category: "boxes",
    tier: "free",
    inputSchema: CreateBoxSchema.shape,
    handler: async ({ name, description }: z.infer<typeof CreateBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_create", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const box = await prisma.box.create({
          data: { name, description, userId },
        });
        return textResult(`**Box Created!**\n\n**ID:** ${box.id}\n**Name:** ${name}${description ? `\n**Description:** ${description}` : ""}`);
      }),
  });

  registry.register({
    name: "boxes_get",
    description: "Get detailed information about a specific box.",
    category: "boxes",
    tier: "free",
    inputSchema: GetBoxSchema.shape,
    handler: async ({ box_id }: z.infer<typeof GetBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_get", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const box = await prisma.box.findUnique({
          where: { id: box_id },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            _count: { select: { messages: true } },
          },
        });
        if (!box) return textResult("**Error: NOT_FOUND**\nBox not found.\n**Retryable:** false");
        return textResult(
          `**Box**\n\n` +
          `**ID:** ${box.id}\n` +
          `**Name:** ${box.name}\n` +
          `**Description:** ${box.description || "(none)"}\n` +
          `**Status:** ${box.status}\n` +
          `**Messages:** ${box["_count"]["messages"]}\n` +
          `**Created:** ${box.createdAt.toISOString()}`
        );
      }),
  });

  registry.register({
    name: "boxes_update",
    description: "Update a box's name, description, or status.",
    category: "boxes",
    tier: "free",
    inputSchema: UpdateBoxSchema.shape,
    handler: async ({ box_id, name, description, status }: z.infer<typeof UpdateBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_update", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (name) data["name"] = name;
        if (description !== undefined) data["description"] = description;
        if (status) data["status"] = status;
        const box = await prisma.box.update({ where: { id: box_id }, data });
        return textResult(`**Box Updated!** ${box.name} [${box.status}]`);
      }),
  });

  registry.register({
    name: "boxes_delete",
    description: "Delete a box and all its messages.",
    category: "boxes",
    tier: "free",
    inputSchema: DeleteBoxSchema.shape,
    handler: async ({ box_id }: z.infer<typeof DeleteBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_delete", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.boxMessage.deleteMany({ where: { boxId: box_id } });
        await prisma.box.delete({ where: { id: box_id } });
        return textResult(`**Box Deleted!** ID: ${box_id}`);
      }),
  });

  registry.register({
    name: "boxes_add_message",
    description: "Add a message to a box.",
    category: "boxes",
    tier: "free",
    inputSchema: AddMessageToBoxSchema.shape,
    handler: async ({ box_id, role, content }: z.infer<typeof AddMessageToBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_add_message", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const message = await prisma.boxMessage.create({
          data: { boxId: box_id, role, content },
        });
        return textResult(`**Message Added!**\n\n**ID:** ${message.id}\n**Role:** ${role}\n**Box:** ${box_id}`);
      }),
  });

  registry.register({
    name: "boxes_list_messages",
    description: "List all messages in a box.",
    category: "boxes",
    tier: "free",
    inputSchema: ListBoxMessagesSchema.shape,
    handler: async ({ box_id, limit = 50 }: z.infer<typeof ListBoxMessagesSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_list_messages", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const messages = await prisma.boxMessage.findMany({
          where: { boxId: box_id },
          select: { id: true, role: true, content: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (messages.length === 0) return textResult("Box has no messages.");
        let text = `**Box Messages (${messages.length}):**\n\n`;
        for (const msg of messages) {
          text += `- **[${msg.role}]** ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}\n  ID: ${msg.id}\n\n`;
        }
        return textResult(text);
      }),
  });
}
