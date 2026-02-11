/**
 * Progressive Tool Registry
 *
 * Manages tool registration, search, and progressive disclosure for the MCP server.
 * Tools are registered disabled by default and discovered via search_tools or enable_category.
 * Uses McpServer's RegisteredTool.enable()/disable() for automatic list_changed notifications.
 */

import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodShape = Record<string, any>;

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  tier: "free" | "workspace";
  inputSchema?: AnyZodShape;
  annotations?: ToolAnnotations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => Promise<CallToolResult> | CallToolResult;
  alwaysEnabled?: boolean;
}

export interface SearchResult {
  name: string;
  category: string;
  description: string;
  tier: string;
  enabled: boolean;
}

export interface CategoryInfo {
  name: string;
  description: string;
  tier: string;
  toolCount: number;
  enabledCount: number;
  tools: string[];
}

interface TrackedTool {
  definition: ToolDefinition;
  registered: RegisteredTool;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "gateway-meta":
    "Discovery tools for searching and activating other tools",
  image:
    "AI image generation, modification, and job management",
  pixel:
    "AI image generation, albums, galleries, and enhancement pipelines",
  codespace:
    "Live React application development on testing.spike.land",
  apps:
    "AI-generated app management, versioning, and deployment",
  create:
    "AI content generation, classification, and streaming",
  blog:
    "Blog post management and retrieval",
  audio:
    "Audio file upload and management",
  jules:
    "Async coding agent for background development tasks",
  gateway:
    "BridgeMind project management, GitHub sync, and Bolt orchestration",
  "orbit-pulse":
    "Real-time social media analytics and pulse metrics",
  "orbit-inbox":
    "Unified inbox management with AI analysis and routing",
  "orbit-calendar":
    "Content calendar, optimal timing, and scheduling",
  "orbit-scout":
    "Competitive intelligence and benchmarking",
  "orbit-boost":
    "Performance optimization and boost recommendations",
  "orbit-crisis":
    "Crisis detection, management, and response templates",
  "orbit-relay":
    "Post publishing, scheduling, and draft management",
  social:
    "Multi-platform social media posting and analytics",
  workspace:
    "Team collaboration, brand management, and workflows",
};

export class ToolRegistry {
  private tools = new Map<string, TrackedTool>();
  private mcpServer: McpServer;

  constructor(mcpServer: McpServer) {
    this.mcpServer = mcpServer;
  }

  /**
   * Register a tool with the MCP server and track it in the registry.
   * Tools are disabled by default unless alwaysEnabled is set.
   */
  register(def: ToolDefinition): void {
    const registered = this.mcpServer.registerTool(
      def.name,
      {
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations,
        _meta: { category: def.category, tier: def.tier },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      def.handler as any,
    );

    if (!def.alwaysEnabled) {
      registered.disable();
    }

    this.tools.set(def.name, { definition: def, registered });
  }

  /**
   * Search tools by keyword across names, descriptions, and categories.
   * Returns scored results sorted by relevance.
   */
  searchTools(query: string, limit: number = 10): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const scored: Array<{ result: SearchResult; score: number }> = [];

    for (const [, { definition, registered }] of this.tools) {
      // Skip gateway-meta tools from search results
      if (definition.category === "gateway-meta") continue;

      const nameLC = definition.name.toLowerCase();
      const descLC = definition.description.toLowerCase();
      const catLC = definition.category.toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (nameLC.includes(term)) score += 3;
        if (catLC.includes(term)) score += 2;
        if (descLC.includes(term)) score += 1;
      }

      if (score > 0) {
        scored.push({
          result: {
            name: definition.name,
            category: definition.category,
            description: definition.description.split("\n")[0].slice(0, 200),
            tier: definition.tier,
            enabled: registered.enabled,
          },
          score,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.result);
  }

  /**
   * Enable specific tools by name.
   * Returns list of newly enabled tool names.
   */
  enableTools(names: string[]): string[] {
    const enabled: string[] = [];
    for (const name of names) {
      const tracked = this.tools.get(name);
      if (tracked && !tracked.registered.enabled) {
        tracked.registered.enable();
        enabled.push(name);
      }
    }
    return enabled;
  }

  /**
   * Enable all tools in a category.
   * Returns list of newly enabled tool names.
   */
  enableCategory(category: string): string[] {
    const enabled: string[] = [];
    for (const [, { definition, registered }] of this.tools) {
      if (definition.category === category && !registered.enabled) {
        registered.enable();
        enabled.push(definition.name);
      }
    }
    return enabled;
  }

  /**
   * Disable all tools in a category (respects alwaysEnabled).
   * Returns list of newly disabled tool names.
   */
  disableCategory(category: string): string[] {
    const disabled: string[] = [];
    for (const [, { definition, registered }] of this.tools) {
      if (
        definition.category === category &&
        registered.enabled &&
        !definition.alwaysEnabled
      ) {
        registered.disable();
        disabled.push(definition.name);
      }
    }
    return disabled;
  }

  /**
   * List all categories with tool counts and descriptions.
   */
  listCategories(): CategoryInfo[] {
    const categories = new Map<
      string,
      { tools: string[]; enabledCount: number; tier: string }
    >();

    for (const [, { definition, registered }] of this.tools) {
      let cat = categories.get(definition.category);
      if (!cat) {
        cat = { tools: [], enabledCount: 0, tier: definition.tier };
        categories.set(definition.category, cat);
      }
      cat.tools.push(definition.name);
      if (registered.enabled) cat.enabledCount++;
    }

    return Array.from(categories.entries()).map(([name, data]) => ({
      name,
      description: CATEGORY_DESCRIPTIONS[name] || `${name} tools`,
      tier: data.tier,
      toolCount: data.tools.length,
      enabledCount: data.enabledCount,
      tools: data.tools,
    }));
  }

  /**
   * Check if a category exists.
   */
  hasCategory(category: string): boolean {
    for (const [, { definition }] of this.tools) {
      if (definition.category === category) return true;
    }
    return false;
  }

  /**
   * Get total number of registered tools.
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get number of currently enabled tools.
   */
  getEnabledCount(): number {
    let count = 0;
    for (const [, { registered }] of this.tools) {
      if (registered.enabled) count++;
    }
    return count;
  }
}
