/**
 * Gateway Meta Tools
 *
 * 5 always-on discovery tools that serve as the entry point for
 * Progressive Context Disclosure. These tools are always loaded
 * and allow agents to search, discover, and activate other tools.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../../registry.js";
import type { SpikeLandClient } from "../../client.js";

export function registerGatewayMetaTools(
  registry: ToolRegistry,
  client: SpikeLandClient,
): void {
  // search_tools - Search all available tools by keyword
  registry.register({
    name: "search_tools",
    description:
      "Search all available spike.land tools by keyword or description. Returns matching tools and automatically makes them available for use. Use this to discover tools for specific tasks like image generation, social media management, content creation, etc.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {
      query: z
        .string()
        .min(1)
        .max(200)
        .describe(
          'Search query (e.g., "schedule post", "generate image", "manage inbox")',
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Maximum results to return"),
    },
    handler: async ({
      query,
      limit,
    }: {
      query: string;
      limit: number;
    }): Promise<CallToolResult> => {
      const results = registry.searchTools(query, limit);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No tools found matching "${query}". Try different keywords or use list_categories to see available tool groups.`,
            },
          ],
        };
      }

      // Auto-enable discovered tools
      const names = results.map((r) => r.name);
      const newlyEnabled = registry.enableTools(names);

      let text = `**Found ${results.length} tool(s) matching "${query}":**\n\n`;
      for (const result of results) {
        const status = newlyEnabled.includes(result.name)
          ? " (now activated)"
          : result.enabled
            ? ""
            : " (inactive)";
        text += `- **${result.name}**${status}\n`;
        text += `  ${result.description}\n`;
        text += `  Category: ${result.category} | Tier: ${result.tier}\n\n`;
      }

      if (newlyEnabled.length > 0) {
        text += `\n${newlyEnabled.length} tool(s) activated and ready to use.`;
      }

      return { content: [{ type: "text", text }] };
    },
  });

  // list_categories - List all tool categories
  registry.register({
    name: "list_categories",
    description:
      "List all available tool categories with descriptions and tool counts. Use this to discover what spike.land can do before searching for specific tools.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      const categories = registry.listCategories();

      let text = `**spike.land Tool Categories (${registry.getToolCount()} total tools):**\n\n`;

      const freeCategories = categories.filter((c) => c.tier === "free");
      const workspaceCategories = categories.filter(
        (c) => c.tier === "workspace",
      );

      if (freeCategories.length > 0) {
        text += `### Free (No Workspace Required)\n\n`;
        for (const cat of freeCategories) {
          if (cat.name === "gateway-meta") continue;
          const status =
            cat.enabledCount > 0
              ? ` (${cat.enabledCount}/${cat.toolCount} active)`
              : "";
          text += `- **${cat.name}** (${cat.toolCount} tools)${status}\n`;
          text += `  ${cat.description}\n\n`;
        }
      }

      if (workspaceCategories.length > 0) {
        text += `### Workspace Required\n\n`;
        for (const cat of workspaceCategories) {
          const status =
            cat.enabledCount > 0
              ? ` (${cat.enabledCount}/${cat.toolCount} active)`
              : "";
          text += `- **${cat.name}** (${cat.toolCount} tools)${status}\n`;
          text += `  ${cat.description}\n\n`;
        }
      }

      text +=
        "\nUse `search_tools` to find specific tools or `enable_category` to activate all tools in a category.";

      return { content: [{ type: "text", text }] };
    },
  });

  // enable_category - Activate all tools in a category
  registry.register({
    name: "enable_category",
    description:
      "Activate all tools in a specific category. After activation, tools appear in the tools list and can be called directly.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {
      category: z
        .string()
        .min(1)
        .describe(
          'Category name to activate (e.g., "codespace", "pixel", "orbit-inbox")',
        ),
    },
    handler: async ({
      category,
    }: {
      category: string;
    }): Promise<CallToolResult> => {
      const enabled = registry.enableCategory(category);

      if (enabled.length === 0) {
        if (!registry.hasCategory(category)) {
          const categories = registry.listCategories();
          const available = categories
            .map((c) => c.name)
            .filter((n) => n !== "gateway-meta")
            .join(", ");
          return {
            content: [
              {
                type: "text",
                text: `Category "${category}" not found. Available categories: ${available}`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `All tools in "${category}" are already active.`,
            },
          ],
        };
      }

      let text = `**Activated ${enabled.length} tool(s) in "${category}":**\n\n`;
      for (const name of enabled) {
        text += `- ${name}\n`;
      }
      text += `\nThese tools are now available for use.`;

      return { content: [{ type: "text", text }] };
    },
  });

  // get_balance - Token balance
  registry.register({
    name: "get_balance",
    description:
      "Get the current token balance for AI image generation and modification. Token costs: TIER_1K (1024px): 2 tokens, TIER_2K (2048px): 5 tokens, TIER_4K (4096px): 10 tokens.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      try {
        const balance = await client.getBalance();
        return {
          content: [
            {
              type: "text",
              text: `**Token Balance:** ${balance.balance}\n\nToken costs:\n- 1K Quality (1024px): 2 tokens\n- 2K Quality (2048px): 5 tokens\n- 4K Quality (4096px): 10 tokens\n\nGet more tokens at: https://spike.land/settings`,
            },
          ],
        };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            { type: "text", text: `Error getting balance: ${msg}` },
          ],
          isError: true,
        };
      }
    },
  });

  // get_status - Platform status
  registry.register({
    name: "get_status",
    description:
      "Get platform status including available features, tool counts, and active categories.",
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
      const inactiveCategories = categories.filter(
        (c) => c.enabledCount === 0 && c.name !== "gateway-meta",
      );

      if (activeCategories.length > 0) {
        text += `**Active Categories:**\n`;
        for (const cat of activeCategories) {
          text += `- ${cat.name}: ${cat.enabledCount}/${cat.toolCount} tools active\n`;
        }
        text += "\n";
      }

      if (inactiveCategories.length > 0) {
        text += `**Available (inactive) Categories:**\n`;
        for (const cat of inactiveCategories) {
          text += `- ${cat.name}: ${cat.toolCount} tools\n`;
        }
        text += "\n";
      }

      text +=
        "Use `search_tools` or `enable_category` to activate tools.\n";
      text +=
        "\n**Platform:** spike.land | **Version:** 1.0.0 | **Docs:** https://spike.land/docs";

      return { content: [{ type: "text", text }] };
    },
  });
}
