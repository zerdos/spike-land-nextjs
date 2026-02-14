import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolRegistry } from "./tool-registry";
import type { ToolDefinition } from "./tool-registry";

function createMockMcpServer() {
  return {
    registerTool: vi.fn().mockReturnValue({
      enabled: true,
      enable: vi.fn(),
      disable: vi.fn(),
    }),
  };
}

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: overrides.name ?? "test-tool",
    description: overrides.description ?? "A test tool",
    category: overrides.category ?? "test-category",
    tier: overrides.tier ?? "free",
    handler: overrides.handler ?? ((() => ({ content: [] })) as ToolDefinition["handler"]),
    alwaysEnabled: overrides.alwaysEnabled,
    inputSchema: overrides.inputSchema,
    annotations: overrides.annotations,
  };
}

describe("ToolRegistry", () => {
  let mcpServer: ReturnType<typeof createMockMcpServer>;
  let registry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    mcpServer = createMockMcpServer();
    registry = new ToolRegistry(mcpServer as unknown as ConstructorParameters<typeof ToolRegistry>[0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create an instance", () => {
      expect(registry).toBeInstanceOf(ToolRegistry);
    });
  });

  describe("register", () => {
    it("should register a tool with mcpServer", () => {
      const tool = makeTool();
      registry.register(tool);

      expect(mcpServer.registerTool).toHaveBeenCalledWith(
        "test-tool",
        {
          description: "A test tool",
          inputSchema: undefined,
          annotations: undefined,
          _meta: { category: "test-category", tier: "free" },
        },
        expect.any(Function),
      );
    });

    it("should disable non-alwaysEnabled tools", () => {
      const mockRegistered = {
        enabled: true,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValue(mockRegistered);

      registry.register(makeTool({ alwaysEnabled: false }));

      expect(mockRegistered.disable).toHaveBeenCalled();
    });

    it("should disable tools without alwaysEnabled set", () => {
      const mockRegistered = {
        enabled: true,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValue(mockRegistered);

      registry.register(makeTool());

      expect(mockRegistered.disable).toHaveBeenCalled();
    });

    it("should keep alwaysEnabled tools enabled (not call disable)", () => {
      const mockRegistered = {
        enabled: true,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValue(mockRegistered);

      registry.register(makeTool({ alwaysEnabled: true }));

      expect(mockRegistered.disable).not.toHaveBeenCalled();
    });
  });

  describe("searchTools", () => {
    beforeEach(() => {
      // Register a variety of tools for search testing
      const tools: ToolDefinition[] = [
        makeTool({ name: "image-generate", description: "Generate images with AI", category: "image" }),
        makeTool({ name: "image-edit", description: "Edit existing images", category: "image" }),
        makeTool({ name: "codespace-run", description: "Run code in a codespace", category: "codespace" }),
        makeTool({ name: "search-tools", description: "Search for tools", category: "gateway-meta", alwaysEnabled: true }),
        makeTool({ name: "vault-store", description: "Store secrets in vault", category: "vault" }),
      ];

      for (const tool of tools) {
        const mockRegistered = {
          enabled: tool.alwaysEnabled ? true : false,
          enable: vi.fn(),
          disable: vi.fn(),
        };
        mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
        registry.register(tool);
      }
    });

    it("should return scored results matching query", () => {
      const results = registry.searchTools("image");

      expect(results.length).toBe(2);
      expect(results[0]!.name).toBe("image-generate");
      expect(results[1]!.name).toBe("image-edit");
    });

    it("should give name match a score of 3", () => {
      // "image" appears in name for image-generate and image-edit
      const results = registry.searchTools("generate");
      // "generate" is in name of image-generate (score 3) and description (score 1) = 4
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.name).toBe("image-generate");
    });

    it("should give category match a score of 2", () => {
      // "codespace" matches the category
      const results = registry.searchTools("codespace");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.name).toBe("codespace-run");
    });

    it("should give description match a score of 1", () => {
      // "secrets" appears only in the description of vault-store
      const results = registry.searchTools("secrets");
      expect(results.length).toBe(1);
      expect(results[0]!.name).toBe("vault-store");
    });

    it("should skip gateway-meta tools in search results", () => {
      const results = registry.searchTools("search");
      const gatewayMetaTool = results.find((r) => r.name === "search-tools");
      expect(gatewayMetaTool).toBeUndefined();
    });

    it("should respect the limit parameter", () => {
      const results = registry.searchTools("image", 1);
      expect(results.length).toBe(1);
    });

    it("should return empty array for empty query", () => {
      const results = registry.searchTools("");
      expect(results).toEqual([]);
    });

    it("should return empty array for whitespace-only query", () => {
      const results = registry.searchTools("   ");
      expect(results).toEqual([]);
    });

    it("should return empty array when no matches found", () => {
      const results = registry.searchTools("zzzznonexistent");
      expect(results).toEqual([]);
    });

    it("should truncate description to 200 chars from first line", () => {
      const longDesc = "A".repeat(300);
      const mockRegistered = {
        enabled: false,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "long-desc-tool", description: longDesc, category: "misc" }));

      const results = registry.searchTools("long-desc-tool");
      expect(results[0]!.description.length).toBeLessThanOrEqual(200);
    });

    it("should use only the first line of multiline descriptions", () => {
      const multilineDesc = "First line about searching\nSecond line with more details";
      const mockRegistered = {
        enabled: false,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "multiline-tool", description: multilineDesc, category: "misc" }));

      const results = registry.searchTools("searching");
      expect(results).toHaveLength(1);
      expect(results[0]!.description).toBe("First line about searching");
    });

    it("should use false when registered.enabled is undefined", () => {
      const mockRegistered = {
        enabled: undefined,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "undef-enabled", description: "Undefined enabled state", category: "misc" }));

      const results = registry.searchTools("undef-enabled");
      expect(results).toHaveLength(1);
      expect(results[0]!.enabled).toBe(false);
    });

    it("should handle tool with empty description gracefully", () => {
      const mockRegistered = {
        enabled: false,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      // Register a tool with empty description - name match still works
      registry.register(makeTool({ name: "emptydesc", description: "", category: "misc" }));

      const results = registry.searchTools("emptydesc");
      expect(results).toHaveLength(1);
      expect(results[0]!.description).toBe("");
    });
  });

  describe("enableTools", () => {
    it("should enable tools by name and return enabled names", () => {
      const mockRegistered = {
        enabled: false,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "my-tool" }));

      const enabled = registry.enableTools(["my-tool"]);

      expect(enabled).toEqual(["my-tool"]);
      expect(mockRegistered.enable).toHaveBeenCalled();
    });

    it("should skip already-enabled tools", () => {
      const mockRegistered = {
        enabled: true,
        enable: vi.fn(),
        disable: vi.fn(),
      };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "enabled-tool", alwaysEnabled: true }));

      const enabled = registry.enableTools(["enabled-tool"]);

      expect(enabled).toEqual([]);
      expect(mockRegistered.enable).not.toHaveBeenCalled();
    });

    it("should skip nonexistent tools", () => {
      const enabled = registry.enableTools(["nonexistent"]);
      expect(enabled).toEqual([]);
    });
  });

  describe("enableCategory", () => {
    it("should enable all tools in a category and return names", () => {
      const mockRegistered1 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      const mockRegistered2 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered1).mockReturnValueOnce(mockRegistered2);

      registry.register(makeTool({ name: "cat-tool-1", category: "my-cat" }));
      registry.register(makeTool({ name: "cat-tool-2", category: "my-cat" }));

      const enabled = registry.enableCategory("my-cat");

      expect(enabled).toEqual(["cat-tool-1", "cat-tool-2"]);
      expect(mockRegistered1.enable).toHaveBeenCalled();
      expect(mockRegistered2.enable).toHaveBeenCalled();
    });

    it("should skip already-enabled tools in the category", () => {
      const mockRegistered = { enabled: true, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "already-on", category: "cat-a", alwaysEnabled: true }));

      const enabled = registry.enableCategory("cat-a");
      expect(enabled).toEqual([]);
    });

    it("should return empty array for nonexistent category", () => {
      const enabled = registry.enableCategory("nonexistent-cat");
      expect(enabled).toEqual([]);
    });
  });

  describe("disableCategory", () => {
    it("should disable non-alwaysEnabled tools in category", () => {
      const mockRegistered = { enabled: true, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "disable-me", category: "my-cat" }));

      const disabled = registry.disableCategory("my-cat");

      expect(disabled).toEqual(["disable-me"]);
      expect(mockRegistered.disable).toHaveBeenCalled();
    });

    it("should skip alwaysEnabled tools when disabling", () => {
      const mockRegistered = { enabled: true, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "keep-me", category: "my-cat", alwaysEnabled: true }));

      const disabled = registry.disableCategory("my-cat");

      expect(disabled).toEqual([]);
      expect(mockRegistered.disable).not.toHaveBeenCalled();
    });

    it("should skip disabled tools", () => {
      const mockRegistered = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "already-off", category: "my-cat" }));

      const disabled = registry.disableCategory("my-cat");

      expect(disabled).toEqual([]);
    });

    it("should return empty array for nonexistent category", () => {
      const disabled = registry.disableCategory("nonexistent");
      expect(disabled).toEqual([]);
    });
  });

  describe("listCategories", () => {
    it("should return categories with descriptions from CATEGORY_DESCRIPTIONS", () => {
      const mockRegistered = { enabled: true, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "img-tool", category: "image", alwaysEnabled: true }));

      const categories = registry.listCategories();

      expect(categories).toHaveLength(1);
      expect(categories[0]).toEqual({
        name: "image",
        description: "AI image generation, modification, and job management",
        tier: "free",
        toolCount: 1,
        enabledCount: 1,
        tools: ["img-tool"],
      });
    });

    it("should use fallback description for unknown categories", () => {
      const mockRegistered = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ name: "custom-tool", category: "custom-unknown" }));

      const categories = registry.listCategories();

      expect(categories[0]!.description).toBe("custom-unknown tools");
    });

    it("should aggregate multiple tools per category", () => {
      const mockReg1 = { enabled: true, enable: vi.fn(), disable: vi.fn() };
      const mockReg2 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockReg1).mockReturnValueOnce(mockReg2);

      registry.register(makeTool({ name: "tool-a", category: "vault", alwaysEnabled: true }));
      registry.register(makeTool({ name: "tool-b", category: "vault" }));

      const categories = registry.listCategories();

      expect(categories).toHaveLength(1);
      expect(categories[0]!.toolCount).toBe(2);
      expect(categories[0]!.enabledCount).toBe(1);
      expect(categories[0]!.tools).toEqual(["tool-a", "tool-b"]);
    });

    it("should return empty array when no tools registered", () => {
      const categories = registry.listCategories();
      expect(categories).toEqual([]);
    });
  });

  describe("hasCategory", () => {
    it("should return true for an existing category", () => {
      const mockRegistered = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ category: "image" }));

      expect(registry.hasCategory("image")).toBe(true);
    });

    it("should return false for a nonexistent category", () => {
      expect(registry.hasCategory("nonexistent")).toBe(false);
    });

    it("should return true even when category is not the first registered tool", () => {
      const mockReg1 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      const mockReg2 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockReg1).mockReturnValueOnce(mockReg2);
      registry.register(makeTool({ name: "a-tool", category: "alpha" }));
      registry.register(makeTool({ name: "b-tool", category: "beta" }));

      // "beta" is the second category but should still be found
      expect(registry.hasCategory("beta")).toBe(true);
    });

    it("should return false when tools exist but none match the category", () => {
      const mockRegistered = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockRegistered);
      registry.register(makeTool({ category: "image" }));

      expect(registry.hasCategory("vault")).toBe(false);
    });
  });

  describe("getToolCount", () => {
    it("should return the total number of registered tools", () => {
      const mockReg1 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      const mockReg2 = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(mockReg1).mockReturnValueOnce(mockReg2);

      registry.register(makeTool({ name: "tool-1" }));
      registry.register(makeTool({ name: "tool-2" }));

      expect(registry.getToolCount()).toBe(2);
    });

    it("should return 0 when no tools registered", () => {
      expect(registry.getToolCount()).toBe(0);
    });
  });

  describe("getEnabledCount", () => {
    it("should return count of enabled tools", () => {
      const enabledReg = { enabled: true, enable: vi.fn(), disable: vi.fn() };
      const disabledReg = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool
        .mockReturnValueOnce(enabledReg)
        .mockReturnValueOnce(disabledReg);

      registry.register(makeTool({ name: "enabled-tool", alwaysEnabled: true }));
      registry.register(makeTool({ name: "disabled-tool" }));

      expect(registry.getEnabledCount()).toBe(1);
    });

    it("should return 0 when no tools are enabled", () => {
      const disabledReg = { enabled: false, enable: vi.fn(), disable: vi.fn() };
      mcpServer.registerTool.mockReturnValueOnce(disabledReg);
      registry.register(makeTool({ name: "off-tool" }));

      expect(registry.getEnabledCount()).toBe(0);
    });
  });
});
