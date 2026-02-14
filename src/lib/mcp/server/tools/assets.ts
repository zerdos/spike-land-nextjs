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
  name: z.string().min(1).describe("Asset display name."),
  url: z.string().min(1).describe("URL where the asset is hosted."),
  mime_type: z.string().min(1).describe("MIME type of the asset (e.g. image/png)."),
  folder_id: z.string().optional().describe("Optional folder ID to place the asset in."),
});

const AssetListSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  folder_id: z.string().optional().describe("Filter by folder ID."),
  mime_type: z.string().optional().describe("Filter by MIME type prefix (e.g. image/)."),
  limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
});

const AssetSearchSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  query: z.string().min(1).describe("Search query to match against asset names and tags."),
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
            name: args.name,
            url: args.url,
            mimeType: args.mime_type,
            workspaceId: ws.id,
            uploadedById: userId,
            ...(args.folder_id ? { folderId: args.folder_id } : {}),
          },
        });
        return textResult(
          `**Asset Uploaded**\n\n` +
          `**ID:** ${asset.id}\n` +
          `**Name:** ${args.name}\n` +
          `**URL:** ${args.url}\n` +
          `**Type:** ${args.mime_type}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "asset_list",
    description: "List assets in a workspace with optional folder and MIME type filters.",
    category: "assets",
    tier: "free",
    readOnlyHint: true,
    inputSchema: AssetListSchema.shape,
    handler: async (args: z.infer<typeof AssetListSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const where: Record<string, unknown> = { workspaceId: ws.id };
        if (args.folder_id) where["folderId"] = args.folder_id;
        if (args.mime_type) where["mimeType"] = { startsWith: args.mime_type };
        const assets = await prisma.asset.findMany({
          where,
          include: { tags: true },
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (assets.length === 0) {
          return textResult("**No assets found** matching the given filters.");
        }
        const lines = assets.map((a: { id: string; name: string; mimeType: string; createdAt: Date; tags: Array<{ tag: string }> }) =>
          `- **${a.name}** (${a.mimeType}) — tags: ${a.tags.map((t) => t.tag).join(", ") || "none"} — ${a.createdAt.toISOString()}`,
        );
        return textResult(
          `**Assets (${assets.length})**\n\n${lines.join("\n")}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "asset_search",
    description: "Search workspace assets by name or tag.",
    category: "assets",
    tier: "free",
    readOnlyHint: true,
    inputSchema: AssetSearchSchema.shape,
    handler: async (args: z.infer<typeof AssetSearchSchema>): Promise<CallToolResult> =>
      safeToolCall("asset_search", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const ws = await resolveWorkspace(userId, args.workspace_slug);
        const assets = await prisma.asset.findMany({
          where: {
            workspaceId: ws.id,
            OR: [
              { name: { contains: args.query, mode: "insensitive" } },
              { tags: { some: { tag: { contains: args.query, mode: "insensitive" } } } },
            ],
          },
          include: { tags: true },
          orderBy: { createdAt: "desc" },
          take: args.limit,
        });
        if (assets.length === 0) {
          return textResult(`**No assets found** matching "${args.query}".`);
        }
        const lines = assets.map((a: { id: string; name: string; mimeType: string; tags: Array<{ tag: string }> }) =>
          `- **${a.name}** (${a.mimeType}) — tags: ${a.tags.map((t) => t.tag).join(", ") || "none"}`,
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
        await resolveWorkspace(userId, args.workspace_slug);
        const asset = await prisma.asset.findFirst({
          where: { id: args.asset_id },
          include: { tags: true },
        });
        if (!asset) {
          return textResult("**Error: NOT_FOUND**\nAsset not found.\n**Retryable:** false");
        }
        for (const tag of args.tags) {
          await prisma.assetTag.upsert({
            where: { assetId_tag: { assetId: args.asset_id, tag } },
            create: { assetId: args.asset_id, tag },
            update: {},
          });
        }
        const updated = await prisma.asset.findFirst({
          where: { id: args.asset_id },
          include: { tags: true },
        });
        const finalTags = (updated?.tags ?? []).map((t: { tag: string }) => t.tag);
        return textResult(
          `**Tags Updated**\n\n` +
          `**Asset:** ${asset.name}\n` +
          `**Tags:** ${finalTags.join(", ")}`,
        );
      }, { timeoutMs: 30_000 }),
  });
}
