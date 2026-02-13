/**
 * Boxes Management MCP Tools
 *
 * Physical/virtual box management for storage and organization.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const ListBoxesSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).optional().default("ALL").describe("Filter by status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
});

const CreateBoxSchema = z.object({
  name: z.string().min(1).max(200).describe("Box name."),
  description: z.string().optional().describe("Box description."),
  category: z.string().optional().describe("Category for organization."),
});

const GetBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
});

const UpdateBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
  name: z.string().optional().describe("New name."),
  description: z.string().optional().describe("New description."),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional().describe("New status."),
});

const DeleteBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID to delete."),
});

const AddItemToBoxSchema = z.object({
  box_id: z.string().min(1).describe("Box ID."),
  item_name: z.string().min(1).describe("Item name."),
  item_type: z.string().optional().describe("Item type/category."),
  metadata: z.string().optional().describe("JSON metadata for the item."),
});

const ListBoxItemsSchema = z.object({
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? { userId } : { userId, status };
        const boxes = await prisma.box.findMany({
          where,
          select: { id: true, name: true, description: true, status: true, itemCount: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (boxes.length === 0) return textResult("No boxes found.");
        let text = `**Boxes (${boxes.length}):**\n\n`;
        for (const b of boxes) {
          text += `- **${b.name}** [${b.status}] — ${b.itemCount || 0} items\n  ${b.description || "(no description)"}\n  ID: ${b.id}\n\n`;
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
    handler: async ({ name, description, category }: z.infer<typeof CreateBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_create", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const box = await prisma.box.create({
          data: { name, description, category, status: "ACTIVE", userId, itemCount: 0 },
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const box = await prisma.box.findUnique({
          where: { id: box_id },
          select: { id: true, name: true, description: true, category: true, status: true, itemCount: true, createdAt: true },
        });
        if (!box) return textResult("**Error: NOT_FOUND**\nBox not found.\n**Retryable:** false");
        return textResult(
          `**Box**\n\n` +
          `**ID:** ${box.id}\n` +
          `**Name:** ${box.name}\n` +
          `**Description:** ${box.description || "(none)"}\n` +
          `**Category:** ${box.category || "(none)"}\n` +
          `**Status:** ${box.status}\n` +
          `**Items:** ${box.itemCount || 0}\n` +
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (name) data.name = name;
        if (description !== undefined) data.description = description;
        if (status) data.status = status;
        const box = await prisma.box.update({ where: { id: box_id }, data });
        return textResult(`**Box Updated!** ${box.name} [${box.status}]`);
      }),
  });

  registry.register({
    name: "boxes_delete",
    description: "Delete a box and all its items.",
    category: "boxes",
    tier: "free",
    inputSchema: DeleteBoxSchema.shape,
    handler: async ({ box_id }: z.infer<typeof DeleteBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_delete", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        await prisma.boxItem.deleteMany({ where: { boxId: box_id } });
        await prisma.box.delete({ where: { id: box_id } });
        return textResult(`**Box Deleted!** ID: ${box_id}`);
      }),
  });

  registry.register({
    name: "boxes_add_item",
    description: "Add an item to a box.",
    category: "boxes",
    tier: "free",
    inputSchema: AddItemToBoxSchema.shape,
    handler: async ({ box_id, item_name, item_type, metadata }: z.infer<typeof AddItemToBoxSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_add_item", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const item = await prisma.boxItem.create({
          data: { boxId: box_id, name: item_name, type: item_type, metadata },
        });
        await prisma.box.update({ where: { id: box_id }, data: { itemCount: { increment: 1 } } });
        return textResult(`**Item Added!**\n\n**ID:** ${item.id}\n**Name:** ${item_name}\n**Box:** ${box_id}`);
      }),
  });

  registry.register({
    name: "boxes_list_items",
    description: "List all items in a box.",
    category: "boxes",
    tier: "free",
    inputSchema: ListBoxItemsSchema.shape,
    handler: async ({ box_id, limit = 50 }: z.infer<typeof ListBoxItemsSchema>): Promise<CallToolResult> =>
      safeToolCall("boxes_list_items", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- future Prisma model
        const prisma: any = (await import("@/lib/prisma")).default;
        const items = await prisma.boxItem.findMany({
          where: { boxId: box_id },
          select: { id: true, name: true, type: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (items.length === 0) return textResult("Box is empty.");
        let text = `**Box Items (${items.length}):**\n\n`;
        for (const item of items) {
          text += `- **${item.name}**${item.type ? ` (${item.type})` : ""}\n  ID: ${item.id}\n\n`;
        }
        return textResult(text);
      }),
  });
}
