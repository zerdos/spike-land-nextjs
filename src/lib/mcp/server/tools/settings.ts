/**
 * Settings MCP Tools
 *
 * API key management: list, create, and revoke keys.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

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
}
