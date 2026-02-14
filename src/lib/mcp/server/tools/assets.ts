/**
 * Assets MCP Tools
 *
 * Digital asset management: upload, list, search, organize, and tag assets.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const AssetUploadSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  filename: z.string().min(1).describe("Asset filename."),
  r2_key: z.string().min(1).describe("R2 object key for the asset."),
  r2_bucket: z.string().min(1).describe("R2 bucket name."),
  file_type: z.string().min(1).describe("File type of the asset (e.g. image/png)."),
  size_bytes: z.number().min(0).describe("File size in bytes."),
  folder_id: z.string().optional().describe("Optional folder ID to place the asset in."),
});

const AssetListSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  folder_id: z.string().optional().describe("Filter by folder ID."),
  file_type: z.string().optional().describe("Filter by file type prefix (e.g. image/)."),
  limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
});

const AssetSearchSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  query: z.string().min(1).describe("Search query to match against asset filenames."),
  limit: z.number().optional().default(20).describe("Max results to return (default 20)."),
});

const AssetOrganizeSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  asset_ids: z.array(z.string().min(1)).min(1).describe("Array of asset IDs to move."),
  folder_id: z.string().min(1).describe("Target folder ID."),
});

const AssetTagSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  asset_id: z.string().min(1).describe("Asset ID to tag."),
  tags: z.array(z.string().min(1)).min(1).describe("Tags to apply to the asset."),
});

export function registerAssetsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "asset_upload",
    description: "Register a new digital asset in the workspace asset library.",
    category: "assets",
    tier: "free",
    inputSchema: AssetUploadSchema.shape,
    handler: async (args: z.infer<typeof AssetUploadSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_upload", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const asset = await prisma.asset.create({
          data: {
            filename: args.filename,
            r2Key: args.r2_key,
            r2Bucket: args.r2_bucket,
            fileType: args.file_type,
            sizeBytes: args.size_bytes,
            workspaceId: ws.id,
            uploadedById: userId,
            ...(args.folder_id ? { folderId: args.folder_id } : {}),
          },
        });
        return textResult(
          `**Asset Uploaded**\n\n` +
          `**ID:** ${asset.id}\n` +
          `**Filename:** ${args.filename}\n` +
          `**R2 Key:** ${args.r2_key}\n` +
          `**Type:** ${args.file_type}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "asset_list",
    description: "List assets in a workspace with optional folder and file type filters.",
    category: "assets",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: AssetListSchema.shape,
    handler: async (args: z.infer<typeof AssetListSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = { workspaceId: ws.id };
        if (args.folder_id) where["folderId"] = args.folder_id;
        if (args.file_type) where["fileType"] = { startsWith: args.file_type };
        const assets = await prisma.asset.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (assets.length === 0) {
          return textResult("**No assets found** matching the given filters.");
        }
        const lines = assets.map((a) =>
          `- **${a.filename}** (${a.fileType}) — tags: ${a.tags.map((t) => t.tag.name).join(", ") || "none"} — ${a.createdAt.toISOString()}`,
        );
        return textResult(
          `**Assets (${assets.length})**\n\n${lines.join("\n")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "asset_search",
    description: "Search workspace assets by filename.",
    category: "assets",
    tier: "free",
    annotations: { readOnlyHint: true },
    inputSchema: AssetSearchSchema.shape,
    handler: async (args: z.infer<typeof AssetSearchSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_search", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const assets = await prisma.asset.findMany({
          where: {
            workspaceId: ws.id,
            filename: { contains: args.query, mode: "insensitive" },
          },
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (assets.length === 0) {
          return textResult(`**No assets found** matching "${args.query}".`);
        }
        const lines = assets.map((a) =>
          `- **${a.filename}** (${a.fileType}) — ${a.id}`,
        );
        return textResult(
          `**Search Results for "${args.query}" (${assets.length})**\n\n${lines.join("\n")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "asset_organize",
    description: "Move one or more assets into a folder.",
    category: "assets",
    tier: "free",
    inputSchema: AssetOrganizeSchema.shape,
    handler: async (args: z.infer<typeof AssetOrganizeSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_organize", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);
        const result = await prisma.asset.updateMany({
          where: { id: { in: args.asset_ids } },
          data: { folderId: args.folder_id },
        });
        return textResult(
          `**Assets Organized**\n\n` +
          `**Moved:** ${result.count} asset(s) to folder \`${args.folder_id}\``,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "asset_tag",
    description: "Add tags to a workspace asset. Duplicate tags are ignored.",
    category: "assets",
    tier: "free",
    inputSchema: AssetTagSchema.shape,
    handler: async (args: z.infer<typeof AssetTagSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_tag", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const asset = await prisma.asset.findFirst({
          where: { id: args.asset_id },
          include: { tags: { include: { tag: true } } },
        });
        if (!asset) {
          return textResult("**Error: NOT_FOUND**\nAsset not found.\n**Retryable:** false");
        }
        for (const tagName of args.tags) {
          // Upsert the tag itself
          const tag = await prisma.assetTag.upsert({
            where: { workspaceId_name: { workspaceId: ws.id, name: tagName } },
            create: { workspaceId: ws.id, name: tagName },
            update: {},
          });
          // Create the assignment if not already present
          await prisma.assetTagAssignment.upsert({
            where: { assetId_tagId: { assetId: args.asset_id, tagId: tag.id } },
            create: { assetId: args.asset_id, tagId: tag.id, assignedById: userId },
            update: {},
          });
        }
        const updated = await prisma.asset.findFirst({
          where: { id: args.asset_id },
          include: { tags: { include: { tag: true } } },
        });
        const finalTags = (updated?.tags ?? []).map((t) => t.tag.name);
        return textResult(
          `**Tags Updated**\n\n` +
          `**Asset:** ${asset.filename}\n` +
          `**Tags:** ${finalTags.join(", ")}`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
