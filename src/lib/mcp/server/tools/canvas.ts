/**
 * Canvas MCP Tools
 *
 * Canvas display and editor tools for visual content creation.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall } from "./tool-helpers";

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
  _userId: string,
): void {
  registry.register({
    name: "canvas_get",
    description: "Get canvas details including dimensions, elements, and publish status.",
    category: "canvas",
    tier: "free",
    inputSchema: GetCanvasSchema.shape,
    handler: async ({ canvas_id }: z.infer<typeof GetCanvasSchema>): Promise<CallToolResult> =>
      safeToolCall("canvas_get", async () => {
        void canvas_id;
        // TODO: Add Canvas model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Canvas model not yet added to schema" }) }] };
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
        void title; void width; void height; void background_color;
        // TODO: Add Canvas model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Canvas model not yet added to schema" }) }] };
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
        void canvas_id; void title; void elements; void published;
        // TODO: Add Canvas model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Canvas model not yet added to schema" }) }] };
      }),
  });
}
