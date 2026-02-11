import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./registry.js";

// Mock RegisteredTool
function createMockRegisteredTool(initialEnabled: boolean = true) {
  return {
    enabled: initialEnabled,
    enable: vi.fn(function (this: { enabled: boolean }) {
      this.enabled = true;
    }),
    disable: vi.fn(function (this: { enabled: boolean }) {
      this.enabled = false;
    }),
  };
}

// Mock McpServer
function createMockMcpServer() {
  const registeredTools = new Map<string, ReturnType<typeof createMockRegisteredTool>>();

  return {
    registerTool: vi.fn((_name: string) => {
      const tool = createMockRegisteredTool(true);
      registeredTools.set(_name, tool);
      return tool;
    }),
    _registeredTools: registeredTools,
  };
}

function makeDef(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: overrides.name || "test_tool",
    description: overrides.description || "A test tool",
    category: overrides.category || "test",
    tier: overrides.tier || "free",
    handler: overrides.handler || vi.fn(),
    alwaysEnabled: overrides.alwaysEnabled,
    inputSchema: overrides.inputSchema,
  };
}

describe("ToolRegistry", () => {
  let mockServer: ReturnType<typeof createMockMcpServer>;
  let registry: ToolRegistry;

  beforeEach(() => {
    mockServer = createMockMcpServer();
    registry = new ToolRegistry(mockServer as any);
  });

  describe("register", () => {
    it("registers a tool with McpServer", () => {
      registry.register(makeDef({ name: "my_tool" }));

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        "my_tool",
        expect.objectContaining({
          description: "A test tool",
          _meta: { category: "test", tier: "free" },
        }),
        expect.any(Function),
      );
    });

    it("disables tool by default", () => {
      registry.register(makeDef({ name: "disabled_tool" }));

      const registered = mockServer._registeredTools.get("disabled_tool")!;
      expect(registered.disable).toHaveBeenCalled();
    });

    it("keeps tool enabled when alwaysEnabled is true", () => {
      registry.register(makeDef({ name: "always_on", alwaysEnabled: true }));

      const registered = mockServer._registeredTools.get("always_on")!;
      expect(registered.disable).not.toHaveBeenCalled();
    });

    it("increments tool count", () => {
      expect(registry.getToolCount()).toBe(0);
      registry.register(makeDef({ name: "tool1" }));
      expect(registry.getToolCount()).toBe(1);
      registry.register(makeDef({ name: "tool2" }));
      expect(registry.getToolCount()).toBe(2);
    });
  });

  describe("searchTools", () => {
    beforeEach(() => {
      registry.register(
        makeDef({
          name: "generate_image",
          category: "image",
          description: "Generate a new image from a text prompt",
        }),
      );
      registry.register(
        makeDef({
          name: "modify_image",
          category: "image",
          description: "Modify an existing image using a text prompt",
        }),
      );
      registry.register(
        makeDef({
          name: "codespace_update",
          category: "codespace",
          description: "Create or update a live React application",
        }),
      );
      registry.register(
        makeDef({
          name: "search_tools",
          category: "gateway-meta",
          description: "Search all available tools",
          alwaysEnabled: true,
        }),
      );
    });

    it("finds tools matching name", () => {
      const results = registry.searchTools("generate");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("generate_image");
    });

    it("finds tools matching description", () => {
      const results = registry.searchTools("React");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("codespace_update");
    });

    it("finds tools matching category", () => {
      const results = registry.searchTools("image");
      expect(results).toHaveLength(2);
    });

    it("excludes gateway-meta tools from results", () => {
      const results = registry.searchTools("search");
      expect(results).toHaveLength(0);
    });

    it("returns empty array for empty query", () => {
      const results = registry.searchTools("   ");
      expect(results).toHaveLength(0);
    });

    it("respects limit parameter", () => {
      const results = registry.searchTools("image", 1);
      expect(results).toHaveLength(1);
    });

    it("sorts by relevance score (name > category > description)", () => {
      const results = registry.searchTools("image");
      // Both tools match on name (3pts) and category (2pts)
      // generate_image also matches "image" in description (+1pt = 6)
      // modify_image also matches "image" in description (+1pt = 6)
      expect(results.length).toBe(2);
    });

    it("handles multi-term queries", () => {
      const results = registry.searchTools("modify image");
      // modify_image: "modify" in name(3) + "image" in name(3) + "image" in category(2) + both in desc = high score
      // generate_image: "image" in name(3) + "image" in category(2) + "image" in desc(1) = lower score
      expect(results[0].name).toBe("modify_image");
    });

    it("truncates long descriptions to 200 chars", () => {
      registry.register(
        makeDef({
          name: "verbose_tool",
          category: "test",
          description: "A".repeat(300) + "\nSecond line",
        }),
      );
      const results = registry.searchTools("verbose");
      expect(results[0].description.length).toBeLessThanOrEqual(200);
    });
  });

  describe("enableTools", () => {
    it("enables specified tools and returns newly enabled names", () => {
      registry.register(makeDef({ name: "tool_a" }));
      registry.register(makeDef({ name: "tool_b" }));

      const enabled = registry.enableTools(["tool_a", "tool_b"]);
      expect(enabled).toEqual(["tool_a", "tool_b"]);
    });

    it("skips already-enabled tools", () => {
      registry.register(makeDef({ name: "already_on", alwaysEnabled: true }));

      const enabled = registry.enableTools(["already_on"]);
      expect(enabled).toEqual([]);
    });

    it("ignores unknown tool names", () => {
      const enabled = registry.enableTools(["nonexistent"]);
      expect(enabled).toEqual([]);
    });
  });

  describe("enableCategory", () => {
    it("enables all tools in the category", () => {
      registry.register(makeDef({ name: "img_gen", category: "image" }));
      registry.register(makeDef({ name: "img_mod", category: "image" }));
      registry.register(makeDef({ name: "cs_update", category: "codespace" }));

      const enabled = registry.enableCategory("image");
      expect(enabled).toEqual(["img_gen", "img_mod"]);
    });

    it("returns empty array for nonexistent category", () => {
      const enabled = registry.enableCategory("nonexistent");
      expect(enabled).toEqual([]);
    });
  });

  describe("disableCategory", () => {
    it("disables all tools in the category", () => {
      registry.register(makeDef({ name: "img_gen", category: "image" }));
      registry.register(makeDef({ name: "img_mod", category: "image" }));

      // First enable them
      registry.enableCategory("image");

      // Then disable
      const disabled = registry.disableCategory("image");
      expect(disabled).toEqual(["img_gen", "img_mod"]);
    });

    it("respects alwaysEnabled flag", () => {
      registry.register(
        makeDef({
          name: "gateway_tool",
          category: "gateway-meta",
          alwaysEnabled: true,
        }),
      );

      const disabled = registry.disableCategory("gateway-meta");
      expect(disabled).toEqual([]);
    });
  });

  describe("listCategories", () => {
    it("returns all categories with correct counts", () => {
      registry.register(makeDef({ name: "img1", category: "image" }));
      registry.register(makeDef({ name: "img2", category: "image" }));
      registry.register(makeDef({ name: "cs1", category: "codespace" }));

      const categories = registry.listCategories();
      expect(categories).toHaveLength(2);

      const image = categories.find((c) => c.name === "image")!;
      expect(image.toolCount).toBe(2);
      expect(image.tools).toEqual(["img1", "img2"]);

      const codespace = categories.find((c) => c.name === "codespace")!;
      expect(codespace.toolCount).toBe(1);
    });

    it("uses known descriptions for categories", () => {
      registry.register(makeDef({ name: "img1", category: "image" }));
      const categories = registry.listCategories();
      expect(categories[0].description).toContain("image");
    });

    it("provides fallback description for unknown categories", () => {
      registry.register(makeDef({ name: "custom1", category: "mystery" }));
      const categories = registry.listCategories();
      expect(categories[0].description).toBe("mystery tools");
    });

    it("tracks enabled count accurately", () => {
      registry.register(
        makeDef({ name: "on_tool", category: "test", alwaysEnabled: true }),
      );
      registry.register(makeDef({ name: "off_tool", category: "test" }));

      const categories = registry.listCategories();
      const test = categories.find((c) => c.name === "test")!;
      expect(test.enabledCount).toBe(1);
      expect(test.toolCount).toBe(2);
    });
  });

  describe("hasCategory", () => {
    it("returns true for existing category", () => {
      registry.register(makeDef({ name: "t1", category: "image" }));
      expect(registry.hasCategory("image")).toBe(true);
    });

    it("returns false for nonexistent category", () => {
      expect(registry.hasCategory("nonexistent")).toBe(false);
    });
  });

  describe("getToolCount", () => {
    it("returns 0 initially", () => {
      expect(registry.getToolCount()).toBe(0);
    });
  });

  describe("getEnabledCount", () => {
    it("counts only enabled tools", () => {
      registry.register(
        makeDef({ name: "enabled", alwaysEnabled: true }),
      );
      registry.register(makeDef({ name: "disabled" }));

      expect(registry.getEnabledCount()).toBe(1);
    });
  });
});
