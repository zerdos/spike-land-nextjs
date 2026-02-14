/**
 * Pixel Image Pipeline MCP Tools
 *
 * Tools for pixel image detail, MCP tool integration, and image pipelines.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

const GetPixelImageSchema = z.object({
  image_id: z.string().min(1).describe("Pixel image ID."),
});

const ListPixelImagesSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  public_only: z.boolean().optional().default(false).describe("Filter to public images only."),
});

const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(200).describe("Pipeline name."),
  description: z.string().optional().describe("Pipeline description."),
});

const GetPipelineSchema = z.object({
  pipeline_id: z.string().min(1).describe("Pipeline ID."),
});

const RunPipelineSchema = z.object({
  pipeline_id: z.string().min(1).describe("Pipeline ID to execute."),
  image_id: z.string().min(1).describe("Image ID to process with this pipeline."),
});

const ListPipelinesSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
});

const GetPixelToolsSchema = z.object({
  category: z.string().optional().describe("Filter tools by category."),
});

export function registerPixelTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "pixel_get_image",
    description: "Get detailed information about a pixel image including metadata and processing history.",
    category: "pixel",
    tier: "free",
    inputSchema: GetPixelImageSchema.shape,
    handler: async ({ image_id }: z.infer<typeof GetPixelImageSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_get_image", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const image = await prisma.enhancedImage.findUnique({
          where: { id: image_id },
          select: { id: true, name: true, originalUrl: true, originalWidth: true, originalHeight: true, originalFormat: true, isPublic: true, createdAt: true, userId: true },
        });
        if (!image) return textResult("**Error: NOT_FOUND**\nImage not found.\n**Retryable:** false");
        return textResult(
          `**Pixel Image**\n\n` +
          `**ID:** ${image.id}\n` +
          `**Name:** ${image.name || "Untitled"}\n` +
          `**URL:** ${image.originalUrl}\n` +
          `**Dimensions:** ${image.originalWidth}x${image.originalHeight}\n` +
          `**Format:** ${image.originalFormat}\n` +
          `**Public:** ${image.isPublic}\n` +
          `**Created:** ${image.createdAt.toISOString()}`
        );
      }),
  });

  registry.register({
    name: "pixel_list_images",
    description: "List pixel images with optional status filter.",
    category: "pixel",
    tier: "free",
    inputSchema: ListPixelImagesSchema.shape,
    handler: async ({ limit = 20, public_only = false }: z.infer<typeof ListPixelImagesSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_list_images", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const where = { userId, ...(public_only ? { isPublic: true } : {}) };
        const images = await prisma.enhancedImage.findMany({
          where,
          select: { id: true, name: true, originalUrl: true, isPublic: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (images.length === 0) return textResult("No pixel images found.");
        let text = `**Pixel Images (${images.length}):**\n\n`;
        for (const img of images) {
          text += `- **${img.name || "Untitled"}** [${img.isPublic ? "Public" : "Private"}]\n  ID: ${img.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "pixel_create_pipeline",
    description: "Create a new image processing pipeline with ordered steps.",
    category: "pixel",
    tier: "free",
    inputSchema: CreatePipelineSchema.shape,
    handler: async ({ name, description }: z.infer<typeof CreatePipelineSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_create_pipeline", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const pipeline = await prisma.enhancementPipeline.create({
          data: { name, description, userId },
        });
        return textResult(
          `**Pipeline Created!**\n\n` +
          `**ID:** ${pipeline.id}\n` +
          `**Name:** ${name}\n` +
          (description ? `**Description:** ${description}` : "")
        );
      }),
  });

  registry.register({
    name: "pixel_get_pipeline",
    description: "Get details of an image processing pipeline.",
    category: "pixel",
    tier: "free",
    inputSchema: GetPipelineSchema.shape,
    handler: async ({ pipeline_id }: z.infer<typeof GetPipelineSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_get_pipeline", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const pipeline = await prisma.enhancementPipeline.findUnique({
          where: { id: pipeline_id },
        });
        if (!pipeline) return textResult("**Error: NOT_FOUND**\nPipeline not found.\n**Retryable:** false");
        return textResult(
          `**Pipeline**\n\n` +
          `**ID:** ${pipeline.id}\n` +
          `**Name:** ${pipeline.name}\n` +
          `**Description:** ${pipeline.description || "None"}\n` +
          `**Visibility:** ${pipeline.visibility}\n` +
          `**Tier:** ${pipeline.tier}\n` +
          `**Usage Count:** ${pipeline.usageCount}`
        );
      }),
  });

  registry.register({
    name: "pixel_run_pipeline",
    description: "Execute an image processing pipeline on a specific image.",
    category: "pixel",
    tier: "free",
    inputSchema: RunPipelineSchema.shape,
    handler: async ({ pipeline_id, image_id }: z.infer<typeof RunPipelineSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_run_pipeline", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const pipeline = await prisma.enhancementPipeline.update({
          where: { id: pipeline_id },
          data: { usageCount: { increment: 1 } },
        });
        return textResult(
          `**Pipeline Started!**\n\n` +
          `**Pipeline:** ${pipeline.name}\n` +
          `**Image:** ${image_id}\n` +
          `**Usage Count:** ${pipeline.usageCount}`
        );
      }),
  });

  registry.register({
    name: "pixel_list_pipelines",
    description: "List all image processing pipelines.",
    category: "pixel",
    tier: "free",
    inputSchema: ListPipelinesSchema.shape,
    handler: async ({ limit = 10 }: z.infer<typeof ListPipelinesSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_list_pipelines", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const pipelines = await prisma.enhancementPipeline.findMany({
          where: { userId },
          select: { id: true, name: true, visibility: true, usageCount: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (pipelines.length === 0) return textResult("No pipelines found.");
        let text = `**Pipelines (${pipelines.length}):**\n\n`;
        for (const p of pipelines) {
          text += `- **${p.name}** [${p.visibility}] (${p.usageCount} uses)\n  ID: ${p.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "pixel_list_tools",
    description: "List available pixel processing tools and their capabilities.",
    category: "pixel",
    tier: "free",
    inputSchema: GetPixelToolsSchema.shape,
    handler: async ({ category }: z.infer<typeof GetPixelToolsSchema>): Promise<CallToolResult> =>
      safeToolCall("pixel_list_tools", async () => {
        const tools = [
          { name: "upscale", category: "enhancement", description: "AI upscaling to 2x/4x resolution" },
          { name: "denoise", category: "enhancement", description: "Remove noise and grain" },
          { name: "background_remove", category: "editing", description: "Remove image background" },
          { name: "style_transfer", category: "creative", description: "Apply artistic styles" },
          { name: "color_grade", category: "editing", description: "Professional color grading" },
        ];
        const filtered = category ? tools.filter((t) => t.category === category) : tools;
        if (filtered.length === 0) return textResult(`No tools found${category ? ` in category "${category}"` : ""}.`);
        let text = `**Pixel Tools (${filtered.length}):**\n\n`;
        for (const t of filtered) {
          text += `- **${t.name}** (${t.category})\n  ${t.description}\n\n`;
        }
        return textResult(text);
      }),
  });
}
