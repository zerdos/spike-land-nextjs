import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSearchAllRegistries = vi.fn();
const mockSearchSmithery = vi.fn();
const mockSearchOfficialRegistry = vi.fn();
const mockSearchGlama = vi.fn();

vi.mock("@/lib/mcp/services/registry-client", () => ({
  searchAllRegistries: mockSearchAllRegistries,
  searchSmithery: mockSearchSmithery,
  searchOfficialRegistry: mockSearchOfficialRegistry,
  searchGlama: mockSearchGlama,
}));

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const mocked = {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>();
  const mocked = {
    ...actual,
    join: (...args: string[]) => args.join("/"),
  };
  return { ...mocked, default: mocked };
});

import { createMockRegistry, getText } from "../__test-utils__";
import { registerMcpRegistryTools } from "./mcp-registry";

const sampleServer = {
  id: "test-server",
  name: "Test Browser Server",
  description: "A test MCP server for browser automation",
  source: "smithery" as const,
  url: "https://example.com/mcp",
  transport: "stdio" as const,
  envVarsRequired: [],
  homepage: "https://example.com",
};

describe("mcp-registry tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerMcpRegistryTools(registry, userId);
  });

  it("should register 4 mcp-registry tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
  });

  describe("mcp_registry_search", () => {
    it("should return search results", async () => {
      mockSearchAllRegistries.mockResolvedValue([sampleServer]);
      const handler = registry.handlers.get("mcp_registry_search")!;
      const result = await handler({ query: "browser" });
      expect(getText(result)).toContain("Test Browser Server");
      expect(getText(result)).toContain("smithery");
      expect(getText(result)).toContain("MCP Servers Found (1)");
    });

    it("should return empty message when no results", async () => {
      mockSearchAllRegistries.mockResolvedValue([]);
      const handler = registry.handlers.get("mcp_registry_search")!;
      const result = await handler({ query: "nonexistent" });
      expect(getText(result)).toContain("No MCP servers found");
    });

    it("should pass limit parameter", async () => {
      mockSearchAllRegistries.mockResolvedValue([]);
      const handler = registry.handlers.get("mcp_registry_search")!;
      await handler({ query: "browser", limit: 5 });
      expect(mockSearchAllRegistries).toHaveBeenCalledWith("browser", 5);
    });

    it("should use default limit of 10", async () => {
      mockSearchAllRegistries.mockResolvedValue([]);
      const handler = registry.handlers.get("mcp_registry_search")!;
      await handler({ query: "browser" });
      expect(mockSearchAllRegistries).toHaveBeenCalledWith("browser", 10);
    });

    it("should show homepage when available", async () => {
      mockSearchAllRegistries.mockResolvedValue([sampleServer]);
      const handler = registry.handlers.get("mcp_registry_search")!;
      const result = await handler({ query: "browser" });
      expect(getText(result)).toContain("https://example.com");
    });

    it("should show transport type", async () => {
      mockSearchAllRegistries.mockResolvedValue([sampleServer]);
      const handler = registry.handlers.get("mcp_registry_search")!;
      const result = await handler({ query: "browser" });
      expect(getText(result)).toContain("stdio");
    });
  });

  describe("mcp_registry_get", () => {
    it("should return server details from smithery", async () => {
      mockSearchSmithery.mockResolvedValue([sampleServer]);
      const handler = registry.handlers.get("mcp_registry_get")!;
      const result = await handler({ serverId: "test-server", source: "smithery" });
      expect(getText(result)).toContain("Test Browser Server");
      expect(getText(result)).toContain("stdio");
    });

    it("should return NOT_FOUND for missing server", async () => {
      mockSearchSmithery.mockResolvedValue([]);
      const handler = registry.handlers.get("mcp_registry_get")!;
      const result = await handler({ serverId: "missing", source: "smithery" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should query official registry when source is official", async () => {
      mockSearchOfficialRegistry.mockResolvedValue([{ ...sampleServer, source: "official" }]);
      const handler = registry.handlers.get("mcp_registry_get")!;
      await handler({ serverId: "test-server", source: "official" });
      expect(mockSearchOfficialRegistry).toHaveBeenCalled();
      expect(mockSearchSmithery).not.toHaveBeenCalled();
    });

    it("should query glama when source is glama", async () => {
      mockSearchGlama.mockResolvedValue([{ ...sampleServer, source: "glama" }]);
      const handler = registry.handlers.get("mcp_registry_get")!;
      await handler({ serverId: "test-server", source: "glama" });
      expect(mockSearchGlama).toHaveBeenCalled();
      expect(mockSearchSmithery).not.toHaveBeenCalled();
    });
  });

  describe("mcp_registry_install", () => {
    it("should generate .mcp.json config", async () => {
      mockSearchSmithery.mockResolvedValue([sampleServer]);
      const handler = registry.handlers.get("mcp_registry_install")!;
      const result = await handler({ serverId: "test-server", source: "smithery" });
      expect(getText(result)).toContain("MCP Server Configured");
      expect(getText(result)).toContain(".mcp.json");
      expect(getText(result)).toContain("Test Browser Server");
    });

    it("should include env vars in config", async () => {
      mockSearchSmithery.mockResolvedValue([sampleServer]);
      const handler = registry.handlers.get("mcp_registry_install")!;
      const result = await handler({ serverId: "test-server", source: "smithery", envVars: { API_KEY: "test123" } });
      expect(getText(result)).toContain("API_KEY");
    });

    it("should return NOT_FOUND for missing server", async () => {
      mockSearchSmithery.mockResolvedValue([]);
      const handler = registry.handlers.get("mcp_registry_install")!;
      const result = await handler({ serverId: "missing", source: "smithery" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("mcp_registry_list_installed", () => {
    it("should list installed servers", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        mcpServers: { "browser-server": { transport: "stdio", url: "https://example.com" } },
      }));

      const handler = registry.handlers.get("mcp_registry_list_installed")!;
      const result = await handler({});
      expect(getText(result)).toContain("browser-server");
      expect(getText(result)).toContain("Configured MCP Servers (1)");
    });

    it("should handle missing .mcp.json", async () => {
      mockExistsSync.mockReturnValue(false);

      const handler = registry.handlers.get("mcp_registry_list_installed")!;
      const result = await handler({});
      expect(getText(result)).toContain("No .mcp.json found");
    });
  });
});
