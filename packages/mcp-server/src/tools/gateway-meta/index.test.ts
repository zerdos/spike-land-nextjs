import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerGatewayMetaTools } from "./index.js";
import { ToolRegistry } from "../../registry.js";
import type { ToolDefinition } from "../../registry.js";

// Captured tool handlers by name
type ToolHandler = (...args: unknown[]) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

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

function createMockMcpServer() {
  return {
    registerTool: vi.fn(() => createMockRegisteredTool(true)),
  };
}

function createMockClient() {
  return {
    getBalance: vi.fn(),
  };
}

describe("Gateway Meta Tools", () => {
  let registry: ToolRegistry;
  let mockClient: ReturnType<typeof createMockClient>;
  let handlers: Map<string, ToolHandler>;

  beforeEach(() => {
    const mockServer = createMockMcpServer();
    registry = new ToolRegistry(mockServer as any);
    mockClient = createMockClient();

    // Capture handlers during registration
    handlers = new Map();
    const originalRegister = registry.register.bind(registry);
    vi.spyOn(registry, "register").mockImplementation((def: ToolDefinition) => {
      handlers.set(def.name, def.handler as ToolHandler);
      originalRegister(def);
    });

    registerGatewayMetaTools(registry, mockClient as any);
  });

  it("registers all 5 gateway meta tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(handlers.has("search_tools")).toBe(true);
    expect(handlers.has("list_categories")).toBe(true);
    expect(handlers.has("enable_category")).toBe(true);
    expect(handlers.has("get_balance")).toBe(true);
    expect(handlers.has("get_status")).toBe(true);
  });

  describe("search_tools", () => {
    it("returns no-results message when nothing found", async () => {
      const handler = handlers.get("search_tools")!;
      const result = await handler({ query: "xyznonexistent", limit: 10 });
      expect(result.content[0].text).toContain("No tools found");
    });

    it("returns matching tools and enables them", async () => {
      // Register some searchable tools first
      registry.register({
        name: "generate_image",
        description: "Generate an image from text",
        category: "image",
        tier: "free",
        handler: vi.fn(),
      });

      const handler = handlers.get("search_tools")!;
      const result = await handler({ query: "image", limit: 10 });
      expect(result.content[0].text).toContain("generate_image");
      expect(result.content[0].text).toContain("Found");
    });
  });

  describe("list_categories", () => {
    it("returns category listing", async () => {
      registry.register({
        name: "test_tool",
        description: "Test",
        category: "test-cat",
        tier: "free",
        handler: vi.fn(),
      });

      const handler = handlers.get("list_categories")!;
      const result = await handler();
      expect(result.content[0].text).toContain("Tool Categories");
      expect(result.content[0].text).toContain("test-cat");
    });

    it("separates free and workspace tiers", async () => {
      registry.register({
        name: "free_tool",
        description: "Free",
        category: "free-cat",
        tier: "free",
        handler: vi.fn(),
      });
      registry.register({
        name: "ws_tool",
        description: "Workspace",
        category: "ws-cat",
        tier: "workspace",
        handler: vi.fn(),
      });

      const handler = handlers.get("list_categories")!;
      const result = await handler();
      expect(result.content[0].text).toContain("Free (No Workspace Required)");
      expect(result.content[0].text).toContain("Workspace Required");
    });
  });

  describe("enable_category", () => {
    it("enables tools in the specified category", async () => {
      registry.register({
        name: "cs_update",
        description: "Update codespace",
        category: "codespace",
        tier: "free",
        handler: vi.fn(),
      });

      const handler = handlers.get("enable_category")!;
      const result = await handler({ category: "codespace" });
      expect(result.content[0].text).toContain("Activated");
      expect(result.content[0].text).toContain("cs_update");
    });

    it("returns error for nonexistent category", async () => {
      const handler = handlers.get("enable_category")!;
      const result = await handler({ category: "nonexistent" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });

    it("reports when category already active", async () => {
      registry.register({
        name: "active_tool",
        description: "Already active",
        category: "active-cat",
        tier: "free",
        alwaysEnabled: true,
        handler: vi.fn(),
      });

      const handler = handlers.get("enable_category")!;
      const result = await handler({ category: "active-cat" });
      expect(result.content[0].text).toContain("already active");
    });
  });

  describe("get_balance", () => {
    it("returns balance information", async () => {
      mockClient.getBalance.mockResolvedValue({
        balance: 42,
        lastRegeneration: "2025-01-01",
      });

      const handler = handlers.get("get_balance")!;
      const result = await handler();
      expect(result.content[0].text).toContain("42");
      expect(result.content[0].text).toContain("Token Balance");
    });

    it("returns error on failure", async () => {
      mockClient.getBalance.mockRejectedValue(new Error("Network error"));

      const handler = handlers.get("get_balance")!;
      const result = await handler();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network error");
    });
  });

  describe("get_status", () => {
    it("returns platform status", async () => {
      const handler = handlers.get("get_status")!;
      const result = await handler();
      expect(result.content[0].text).toContain("Platform Status");
      expect(result.content[0].text).toContain("Total Tools");
      expect(result.content[0].text).toContain("Active Tools");
    });

    it("lists active and inactive categories", async () => {
      registry.register({
        name: "active_tool",
        description: "Active",
        category: "active-cat",
        tier: "free",
        alwaysEnabled: true,
        handler: vi.fn(),
      });
      registry.register({
        name: "inactive_tool",
        description: "Inactive",
        category: "inactive-cat",
        tier: "free",
        handler: vi.fn(),
      });

      const handler = handlers.get("get_status")!;
      const result = await handler();
      expect(result.content[0].text).toContain("Active Categories");
      expect(result.content[0].text).toContain("Available (inactive) Categories");
    });
  });
});
