/**
 * Server-Side Progressive Tool Registry
 *
 * Progressive disclosure pattern: 5 always-on gateway-meta tools,
 * all others discoverable via search_tools and enable_category.
 */

import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  tier: "free" | "workspace";
  inputSchema?: z.ZodRawShape;
  annotations?: ToolAnnotations;
  // Handlers are cast in register() — accept typed Zod-inferred params
  handler: (input: never) => Promise<CallToolResult> | CallToolResult;
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
  "gateway-meta": "Discovery tools for searching and activating other tools",
  image: "AI image generation, modification, and job management",
  codespace: "Live React application development on testing.spike.land",
  jules: "Async coding agent for background development tasks",
  gateway: "BridgeMind project management, GitHub sync, and Bolt orchestration",
  vault: "Encrypted secret storage for agent integrations",
  tools: "Dynamic tool registration and management",
  bootstrap: "One-session workspace setup: create workspace, store secrets, deploy apps",
  apps: "Full My-Apps lifecycle: create, chat, iterate, manage versions, and batch operations",
  "orbit-workspace": "Orbit workspace listing, connected accounts, and real-time pulse metrics",
  "orbit-inbox": "Social media inbox: list, analyze, reply, escalate, and batch reply across platforms",
  "orbit-relay": "AI response drafts: generate, review, approve/reject, and performance metrics",
  arena: "AI Prompt Arena: submit prompts, review code, compete on ELO leaderboard",
  "album-images": "Album image management: add, remove, reorder, list, and move images between albums",
  "album-management": "Album CRUD: create, list, get, update, delete albums with privacy and sharing controls",
  "batch-enhance": "Batch image enhancement: enhance multiple images, preview costs, and track batch progress",
  "enhancement-jobs": "Enhancement job lifecycle: start, cancel with refund, status, and history",
  create: "Public /create app generator: search apps, classify ideas, check status, and manage created apps",
  learnit: "AI wiki knowledge base: search topics, explore relationships, and navigate the topic graph",
  admin: "Admin dashboard: manage agents, emails, gallery, jobs, and photo moderation",
  auth: "Authentication: session validation, route access checks, and user profiles",
  pixel: "Pixel image processing: pipelines, tools, and image detail management",
  "orbit-allocator": "Budget allocation: create, update, audit, and autopilot settings",
  "orbit-calendar": "Content calendar: schedule, manage, and overview social media posts",
  "orbit-social": "Social integration: connect platforms, onboarding, and content posting",
  merch: "Merchandise store: products, cart, checkout, and order management",
  "brand-brain": "AI brand voice: rewrite text and analyze brand characteristics",
  connections: "Business connections and competitor tracking",
  bazdmeg: "BAZDMEG methodology FAQ management",
  boxes: "Box management: organize items in virtual containers",
  "smart-routing": "Smart routing: traffic rules, weights, and performance stats",
  "skill-store": "Skill Store: browse, install, and manage agent skills and extensions",
  workspaces: "Workspace management: create, list, update, and favorite workspaces",
  agents: "Agent lifecycle: list, get, queue, and message management",
  settings: "User settings: API key management (list, create, revoke)",
  credits: "AI credit balance: check remaining credits, limits, and usage",
  billing: "Billing: Stripe checkout sessions and subscription management",
  pipelines: "Enhancement pipelines: create, fork, update, and manage image processing pipelines",
  agency: "Agency marketing: personas, demographics, and portfolio management",
  blog: "Blog content: list and read published blog posts",
  reports: "System reports: generate aggregated platform reports",
  audio: "Audio mixer: upload tracks and manage audio projects",
  chat: "AI chat: send messages and get AI responses",
  newsletter: "Newsletter: email subscription management",
  tts: "Text-to-speech: convert text to audio using ElevenLabs",
};

export class ToolRegistry {
  private tools = new Map<string, TrackedTool>();
  private mcpServer: McpServer;

  constructor(mcpServer: McpServer) {
    this.mcpServer = mcpServer;
  }

  register(def: ToolDefinition): void {
    const registered = this.mcpServer.registerTool(
      def.name,
      {
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations,
        _meta: { category: def.category, tier: def.tier },
      },
      // Handler type is erased in ToolDefinition for heterogeneous storage
      def.handler as unknown as Parameters<McpServer["registerTool"]>[2],
    );

    if (!def.alwaysEnabled) {
      registered.disable();
    }

    this.tools.set(def.name, { definition: def, registered });
  }

  searchTools(query: string, limit = 10): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const scored: Array<{ result: SearchResult; score: number }> = [];

    for (const [, { definition, registered }] of this.tools) {
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
            description: (definition.description.split("\n")[0] ?? "").slice(0, 200),
            tier: definition.tier,
            enabled: registered.enabled ?? false,
          },
          score,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.result);
  }

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

  hasCategory(category: string): boolean {
    for (const [, { definition }] of this.tools) {
      if (definition.category === category) return true;
    }
    return false;
  }

  getToolCount(): number {
    return this.tools.size;
  }

  getEnabledCount(): number {
    let count = 0;
    for (const [, { registered }] of this.tools) {
      if (registered.enabled) count++;
    }
    return count;
  }
}
