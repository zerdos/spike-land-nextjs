/**
 * Canvas MCP Tools
 *
 * Canvas display and editor tools for visual content creation.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const GetCanvasSchema = z.object({
  canvas_id: z.string().min(1).describe("Canvas ID."),
});

const CreateCanvasSchema = z.object({
  title: z.string().min(1).max(200).describe("Canvas title."),
  width: z.number().int().min(100).max(4096).optional().default(1920).describe("Canvas width in pixels."),
  height: z.number().int().min(100).max(4096).optional().default(1080).describe("Canvas height in pixels."),
  background_color: z.string().optional().default("#ffffff").describe("Background color (hex)."),
});

const UpdateCanvasSchema = z.object({
  canvas_id: z.string().min(1).describe("Canvas ID."),
  title: z.string().optional().describe("New title."),
  elements: z.string().optional().describe("JSON string of canvas elements to update."),
  published: z.boolean().optional().describe("Publish or unpublish."),
});

export function registerCanvasTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "canvas_get",
    description: "Get canvas details including dimensions, elements, and publish status.",
    category: "canvas",
    tier: "free",
    inputSchema: GetCanvasSchema.shape,
    handler: async ({ canvas_id }: z.infer<typeof GetCanvasSchema>): Promise<CallToolResult> =>
      safeToolCall("canvas_get", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const canvas = await prisma.canvas.findUnique({
          where: { id: canvas_id },
          select: { id: true, title: true, width: true, height: true, backgroundColor: true, published: true, elementCount: true, createdAt: true },
        });
        if (!canvas) return textResult("**Error: NOT_FOUND**\nCanvas not found.\n**Retryable:** false");
        return textResult(
          `**Canvas**\n\n` +
          `**ID:** ${canvas.id}\n` +
          `**Title:** ${canvas.title}\n` +
          `**Dimensions:** ${canvas.width}x${canvas.height}\n` +
          `**Background:** ${canvas.backgroundColor}\n` +
          `**Elements:** ${canvas.elementCount || 0}\n` +
          `**Published:** ${canvas.published}\n` +
          `**Created:** ${canvas.createdAt.toISOString()}`
        );
      }),
  });

  registry.register({
    name: "canvas_create",
    description: "Create a new canvas for visual content editing.",
    category: "canvas",
    tier: "free",
    inputSchema: CreateCanvasSchema.shape,
    handler: async ({ title, width = 1920, height = 1080, background_color = "#ffffff" }: z.infer<typeof CreateCanvasSchema>): Promise<CallToolResult> =>
      safeToolCall("canvas_create", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const canvas = await prisma.canvas.create({
          data: { title, width, height, backgroundColor: background_color, published: false, userId, elementCount: 0 },
        });
        return textResult(
          `**Canvas Created!**\n\n` +
          `**ID:** ${canvas.id}\n` +
          `**Title:** ${title}\n` +
          `**Dimensions:** ${width}x${height}\n` +
          `**Background:** ${background_color}`
        );
      }),
  });

  registry.register({
    name: "canvas_update",
    description: "Update a canvas: change title, elements, or publish status.",
    category: "canvas",
    tier: "free",
    inputSchema: UpdateCanvasSchema.shape,
    handler: async ({ canvas_id, title, elements, published }: z.infer<typeof UpdateCanvasSchema>): Promise<CallToolResult> =>
      safeToolCall("canvas_update", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, unknown> = {};
        if (title !== undefined) data.title = title;
        if (elements !== undefined) data.elements = elements;
        if (published !== undefined) data.published = published;
        const canvas = await prisma.canvas.update({ where: { id: canvas_id }, data });
        return textResult(`**Canvas Updated!**\n\n**ID:** ${canvas.id}\n**Published:** ${canvas.published}`);
      }),
  });
}
