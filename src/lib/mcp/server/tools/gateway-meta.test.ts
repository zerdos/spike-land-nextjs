import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock WorkspaceCreditManager
const mockGetBalance = vi.fn();
vi.mock("@/lib/credits/workspace-credit-manager", () => ({
  WorkspaceCreditManager: { getBalance: (...args: unknown[]) => mockGetBalance(...args) },
}));

import type { ToolRegistry, SearchResult, CategoryInfo } from "../tool-registry";
import { registerGatewayMetaTools } from "./gateway-meta";

function createMockRegistry(): ToolRegistry & {
  handlers: Map<string, (...args: unknown[]) => unknown>;
  _searchResults: SearchResult[];
  _enabledTools: string[];
  _categories: CategoryInfo[];
  _hasCategory: boolean;
  _toolCount: number;
  _enabledCount: number;
} {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const mock = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
    _searchResults: [] as SearchResult[],
    _enabledTools: [] as string[],
    _categories: [] as CategoryInfo[],
    _hasCategory: false,
    _toolCount: 10,
    _enabledCount: 5,
    searchTools: vi.fn(function(this: typeof mock) { return this._searchResults; }),
    enableTools: vi.fn(function(this: typeof mock) { return this._enabledTools; }),
    enableCategory: vi.fn(function(this: typeof mock) { return this._enabledTools; }),
    listCategories: vi.fn(function(this: typeof mock) { return this._categories; }),
    hasCategory: vi.fn(function(this: typeof mock) { return this._hasCategory; }),
    getToolCount: vi.fn(function(this: typeof mock) { return this._toolCount; }),
    getEnabledCount: vi.fn(function(this: typeof mock) { return this._enabledCount; }),
  };
  return mock as unknown as ToolRegistry & typeof mock;
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("gateway-meta tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerGatewayMetaTools(registry as unknown as ToolRegistry, userId);
  });

  it("should register 5 gateway-meta tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("search_tools")).toBe(true);
    expect(registry.handlers.has("list_categories")).toBe(true);
    expect(registry.handlers.has("enable_category")).toBe(true);
    expect(registry.handlers.has("get_balance")).toBe(true);
    expect(registry.handlers.has("get_status")).toBe(true);
  });

  describe("search_tools", () => {
    it("should return matching tools", async () => {
      registry._searchResults = [
        { name: "generate_image", category: "image", description: "Generate AI images", tier: "free", enabled: false },
      ];
      registry._enabledTools = ["generate_image"];
      const handler = registry.handlers.get("search_tools")!;
      const result = await handler({ query: "image", limit: 10 });
      expect(getText(result)).toContain("generate_image");
      expect(getText(result)).toContain("now activated");
    });

    it("should return no results message", async () => {
      registry._searchResults = [];
      const handler = registry.handlers.get("search_tools")!;
      const result = await handler({ query: "nonexistent", limit: 10 });
      expect(getText(result)).toContain("No tools found");
    });
  });

  describe("list_categories", () => {
    it("should list categories", async () => {
      registry._categories = [
        { name: "image", description: "Image tools", tier: "free", toolCount: 3, enabledCount: 0, tools: [] },
      ];
      const handler = registry.handlers.get("list_categories")!;
      const result = await handler({});
      expect(getText(result)).toContain("image");
      expect(getText(result)).toContain("3 tools");
    });
  });

  describe("enable_category", () => {
    it("should enable category tools", async () => {
      registry._enabledTools = ["generate_image", "modify_image"];
      const handler = registry.handlers.get("enable_category")!;
      const result = await handler({ category: "image" });
      expect(getText(result)).toContain("Activated 2 tool(s)");
    });

    it("should report already active", async () => {
      registry._enabledTools = [];
      registry._hasCategory = true;
      const handler = registry.handlers.get("enable_category")!;
      const result = await handler({ category: "image" });
      expect(getText(result)).toContain("already active");
    });

    it("should report category not found", async () => {
      registry._enabledTools = [];
      registry._hasCategory = false;
      registry._categories = [{ name: "image", description: "", tier: "free", toolCount: 0, enabledCount: 0, tools: [] }];
      const handler = registry.handlers.get("enable_category")!;
      const result = await handler({ category: "nonexistent" });
      expect(getText(result)).toContain("not found");
    });
  });

  describe("get_balance", () => {
    it("should return balance", async () => {
      mockGetBalance.mockResolvedValue(100);
      const handler = registry.handlers.get("get_balance")!;
      const result = await handler({});
      expect(getText(result)).toContain("Token Balance:** 100");
    });

    it("should handle error", async () => {
      mockGetBalance.mockRejectedValue(new Error("DB down"));
      const handler = registry.handlers.get("get_balance")!;
      const result = await handler({});
      expect(getText(result)).toContain("Error getting balance");
    });
  });

  describe("get_status", () => {
    it("should return platform status", async () => {
      registry._categories = [
        { name: "image", description: "", tier: "free", toolCount: 3, enabledCount: 2, tools: [] },
        { name: "codespace", description: "", tier: "free", toolCount: 6, enabledCount: 0, tools: [] },
      ];
      const handler = registry.handlers.get("get_status")!;
      const result = await handler({});
      expect(getText(result)).toContain("Platform Status");
      expect(getText(result)).toContain("Total Tools:** 10");
    });
  });
});
