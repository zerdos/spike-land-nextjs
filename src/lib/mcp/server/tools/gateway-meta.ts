/**
 * Gateway Meta Tools (Server-Side)
 *
 * 5 always-on discovery tools for Progressive Context Disclosure.
 * Server-side version calls service layer directly instead of HTTP.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";

export function registerGatewayMetaTools(
  registry: ToolRegistry,
  userId: string,
): void {
  // search_tools
  registry.register({
    name: "search_tools",
    description:
      "Search all available spike.land tools by keyword or description. Returns matching tools and automatically makes them available for use.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {
      query: z.string().min(1).max(200).describe('Search query'),
      limit: z.number().min(1).max(50).optional().default(10).describe("Maximum results"),
    },
    handler: async ({ query, limit }: { query: string; limit: number }): Promise<CallToolResult> => {
      const results = registry.searchTools(query, limit);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No tools found matching "${query}". Try different keywords or use list_categories.` }],
        };
      }

      const names = results.map((r) => r.name);
      const newlyEnabled = registry.enableTools(names);

      let text = `**Found ${results.length} tool(s) matching "${query}":**\n\n`;
      for (const result of results) {
        const status = newlyEnabled.includes(result.name) ? " (now activated)" : result.enabled ? "" : " (inactive)";
        text += `- **${result.name}**${status}\n  ${result.description}\n  Category: ${result.category} | Tier: ${result.tier}\n\n`;
      }

      if (newlyEnabled.length > 0) {
        text += `\n${newlyEnabled.length} tool(s) activated and ready to use.`;
      }

      return { content: [{ type: "text", text }] };
    },
  });

  // list_categories
  registry.register({
    name: "list_categories",
    description: "List all available tool categories with descriptions and tool counts.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      const categories = registry.listCategories();

      let text = `**spike.land Tool Categories (${registry.getToolCount()} total tools):**\n\n`;

      const freeCategories = categories.filter((c) => c.tier === "free");
      const workspaceCategories = categories.filter((c) => c.tier === "workspace");

      if (freeCategories.length > 0) {
        text += `### Free\n\n`;
        for (const cat of freeCategories) {
          if (cat.name === "gateway-meta") continue;
          const status = cat.enabledCount > 0 ? ` (${cat.enabledCount}/${cat.toolCount} active)` : "";
          text += `- **${cat.name}** (${cat.toolCount} tools)${status}\n  ${cat.description}\n\n`;
        }
      }

      if (workspaceCategories.length > 0) {
        text += `### Workspace Required\n\n`;
        for (const cat of workspaceCategories) {
          const status = cat.enabledCount > 0 ? ` (${cat.enabledCount}/${cat.toolCount} active)` : "";
          text += `- **${cat.name}** (${cat.toolCount} tools)${status}\n  ${cat.description}\n\n`;
        }
      }

      text += "\nUse `search_tools` or `enable_category` to activate tools.";
      return { content: [{ type: "text", text }] };
    },
  });

  // enable_category
  registry.register({
    name: "enable_category",
    description: "Activate all tools in a specific category.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {
      category: z.string().min(1).describe('Category name to activate'),
    },
    handler: async ({ category }: { category: string }): Promise<CallToolResult> => {
      const enabled = registry.enableCategory(category);

      if (enabled.length === 0) {
        if (!registry.hasCategory(category)) {
          const categories = registry.listCategories();
          const available = categories.map((c) => c.name).filter((n) => n !== "gateway-meta").join(", ");
          return { content: [{ type: "text", text: `Category "${category}" not found. Available: ${available}` }], isError: true };
        }
        return { content: [{ type: "text", text: `All tools in "${category}" are already active.` }] };
      }

      let text = `**Activated ${enabled.length} tool(s) in "${category}":**\n\n`;
      for (const name of enabled) text += `- ${name}\n`;
      text += `\nThese tools are now available for use.`;
      return { content: [{ type: "text", text }] };
    },
  });

  // get_balance — calls service layer directly
  registry.register({
    name: "get_balance",
    description: "Get the current token balance for AI image generation.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      try {
        // Import dynamically to avoid circular deps at module level
        const { WorkspaceCreditManager } = await import("@/lib/credits/workspace-credit-manager");
        const balance = await WorkspaceCreditManager.getBalance(userId);
        return {
          content: [{
            type: "text",
            text: `**Token Balance:** ${balance}\n\nToken costs:\n- 1K (1024px): 2 tokens\n- 2K (2048px): 5 tokens\n- 4K (4096px): 10 tokens`,
          }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text", text: `Error getting balance: ${msg}` }], isError: true };
      }
    },
  });

  // get_status
  registry.register({
    name: "get_status",
    description: "Get platform status including available features, tool counts, and active categories.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      const categories = registry.listCategories();
      const totalTools = registry.getToolCount();
      const enabledTools = registry.getEnabledCount();

      let text = `**spike.land Platform Status**\n\n`;
      text += `**Total Tools:** ${totalTools}\n`;
      text += `**Active Tools:** ${enabledTools}\n`;
      text += `**Categories:** ${categories.length}\n\n`;

      const activeCategories = categories.filter((c) => c.enabledCount > 0);
      const inactiveCategories = categories.filter((c) => c.enabledCount === 0 && c.name !== "gateway-meta");

      if (activeCategories.length > 0) {
        text += `**Active:**\n`;
        for (const cat of activeCategories) text += `- ${cat.name}: ${cat.enabledCount}/${cat.toolCount} active\n`;
        text += "\n";
      }

      if (inactiveCategories.length > 0) {
        text += `**Available:**\n`;
        for (const cat of inactiveCategories) text += `- ${cat.name}: ${cat.toolCount} tools\n`;
        text += "\n";
      }

      text += "Use `search_tools` or `enable_category` to activate tools.";
      return { content: [{ type: "text", text }] };
    },
  });
}
