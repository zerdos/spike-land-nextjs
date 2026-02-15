/**
 * Settings MCP Tools
 *
 * API key management: list, create, and revoke keys.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, apiRequest, textResult } from "./tool-helpers";

const ListApiKeysSchema = z.object({});

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(50).describe("Name for the API key."),
});

const RevokeApiKeySchema = z.object({
  key_id: z.string().min(1).describe("API key ID to revoke."),
});

export function registerSettingsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "settings_list_api_keys",
    description: "List your API keys (keys are masked for security).",
    category: "settings",
    tier: "free",
    inputSchema: ListApiKeysSchema.shape,
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("settings_list_api_keys", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const keys = await prisma.apiKey.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            isActive: true,
            lastUsedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        if (keys.length === 0) return textResult("No API keys found.");
        let text = `**API Keys (${keys.length}):**\n\n`;
        for (const k of keys) {
          const status = k.isActive ? "Active" : "Revoked";
          text += `- **${k.name}** [${status}] — ${k.keyPrefix}\n  Last used: ${k.lastUsedAt?.toISOString() || "never"}\n  Created: ${k.createdAt.toISOString()}\n  ID: ${k.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "settings_create_api_key",
    description: "Create a new API key. The full key is shown ONLY once.",
    category: "settings",
    tier: "free",
    inputSchema: CreateApiKeySchema.shape,
    handler: async ({ name }: z.infer<typeof CreateApiKeySchema>): Promise<CallToolResult> =>
      safeToolCall("settings_create_api_key", async () => {
        const { createApiKey } = await import("@/lib/mcp/api-key-manager");
        const result = await createApiKey(userId, name.trim());
        return textResult(
          `**API Key Created!**\n\n` +
          `**ID:** ${result.id}\n` +
          `**Name:** ${result.name}\n` +
          `**Key:** ${result.key}\n` +
          `**Prefix:** ${result.keyPrefix}\n\n` +
          `**IMPORTANT:** Copy this key now. It will not be shown again.`,
        );
      }),
  });

  registry.register({
    name: "settings_revoke_api_key",
    description: "Revoke (deactivate) an API key.",
    category: "settings",
    tier: "free",
    inputSchema: RevokeApiKeySchema.shape,
    handler: async ({ key_id }: z.infer<typeof RevokeApiKeySchema>): Promise<CallToolResult> =>
      safeToolCall("settings_revoke_api_key", async () => {
        const { revokeApiKey } = await import("@/lib/mcp/api-key-manager");
        const result = await revokeApiKey(userId, key_id);
        if (!result.success) {
          return textResult(`**Error: NOT_FOUND**\n${result.error || "API key not found."}\n**Retryable:** false`);
        }
        return textResult(`**API Key Revoked!** ID: ${key_id}`);
      }),
  });

  const McpHistorySchema = z.object({
    type: z.enum(["GENERATE", "MODIFY"]).optional().describe("Filter by job type."),
    limit: z.number().int().min(1).max(50).optional().default(12).describe("Max jobs to return (default 12)."),
    offset: z.number().int().min(0).optional().default(0).describe("Offset for pagination (default 0)."),
  });

  registry.register({
    name: "settings_mcp_history",
    description: "List MCP job history with pagination and optional type filter.",
    category: "settings",
    tier: "free",
    inputSchema: McpHistorySchema.shape,
    annotations: { readOnlyHint: true },
    handler: async ({ type, limit, offset }: z.infer<typeof McpHistorySchema>): Promise<CallToolResult> =>
      safeToolCall("settings_mcp_history", async () => {
        const params = new URLSearchParams({ limit: String(limit ?? 12), offset: String(offset ?? 0) });
        if (type) params.append("type", type);
        const data = await apiRequest<{ jobs: Array<{ id: string; type: string; status: string; prompt: string; tokensCost: number; createdAt: string }>; total: number; hasMore: boolean }>(
          `/api/mcp/history?${params}`
        );
        if (data.jobs.length === 0) return textResult("**MCP History**\n\nNo jobs found.");
        let text = `**MCP History** (${data.jobs.length} of ${data.total})\n\n`;
        for (const job of data.jobs) {
          text += `- **${job.type}** [${job.status}] — ${job.tokensCost} tokens\n`;
          text += `  Prompt: ${job.prompt.slice(0, 100)}${job.prompt.length > 100 ? "..." : ""}\n`;
          text += `  ID: \`${job.id}\` | ${job.createdAt}\n\n`;
        }
        if (data.hasMore) text += `_More results available. Use offset=${(offset ?? 0) + (limit ?? 12)}._`;
        return textResult(text);
      }),
  });

  const McpJobDetailSchema = z.object({
    job_id: z.string().min(1).describe("MCP job ID."),
  });

  registry.register({
    name: "settings_mcp_job_detail",
    description: "Get full detail for a single MCP job including images and processing time.",
    category: "settings",
    tier: "free",
    inputSchema: McpJobDetailSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async ({ job_id }: z.infer<typeof McpJobDetailSchema>): Promise<CallToolResult> =>
      safeToolCall("settings_mcp_job_detail", async () => {
        const job = await apiRequest<{ id: string; type: string; status: string; prompt: string; tokensCost: number; tier: string; createdAt: string; processingCompletedAt?: string; outputImageUrl?: string; outputWidth?: number; outputHeight?: number; apiKeyName?: string }>(
          `/api/mcp/history/${encodeURIComponent(job_id)}`
        );
        let text = `**MCP Job Detail**\n\n`;
        text += `**ID:** \`${job.id}\`\n`;
        text += `**Type:** ${job.type}\n**Status:** ${job.status}\n`;
        text += `**Tier:** ${job.tier}\n**Tokens:** ${job.tokensCost}\n`;
        text += `**Prompt:** ${job.prompt}\n`;
        if (job.outputImageUrl) text += `**Output:** ${job.outputImageUrl}\n`;
        if (job.outputWidth) text += `**Dimensions:** ${job.outputWidth}x${job.outputHeight}\n`;
        text += `**Created:** ${job.createdAt}\n`;
        if (job.processingCompletedAt) text += `**Completed:** ${job.processingCompletedAt}\n`;
        if (job.apiKeyName) text += `**API Key:** ${job.apiKeyName}\n`;
        return textResult(text);
      }),
  });
}
