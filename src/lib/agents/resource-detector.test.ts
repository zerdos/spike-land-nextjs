/**
 * Resource Detector Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}));

// Import fs mock for manipulation
import fs from "fs/promises";

// Save original env
const originalEnv = { ...process.env };

describe("resource-detector", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.mocked(fs.readFile).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("detectResources", () => {
    it("should detect all resource statuses", async () => {
      process.env.NODE_ENV = "development";
      process.env.PORT = "3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.JULES_API_KEY = "test-jules-key";
      process.env.GH_PAT_TOKEN = "ghp_test_token";

      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({
          mcpServers: {
            playwright: { type: "stdio" },
            docker: { type: "http" },
          },
        }),
      );

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.devServer.running).toBe(true);
      expect(result.devServer.port).toBe(3000);
      expect(result.devServer.url).toBe("http://localhost:3000");

      expect(result.mcpServers).toHaveLength(2);
      expect(result.mcpServers[0]).toEqual({
        name: "playwright",
        type: "stdio",
        configured: true,
      });

      expect(result.database.connected).toBe(true);
      expect(result.database.provider).toBe("postgresql");

      expect(result.environment.nodeEnv).toBe("development");
      expect(result.environment.julesConfigured).toBe(true);
      expect(result.environment.githubConfigured).toBe(true);
    });

    it("should handle production environment", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.PORT;
      delete process.env.DATABASE_URL;
      delete process.env.JULES_API_KEY;
      delete process.env.GH_PAT_TOKEN;

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.devServer.running).toBe(false);
      expect(result.devServer.port).toBeNull();
      expect(result.devServer.url).toBeNull();

      expect(result.mcpServers).toHaveLength(0);

      expect(result.database.connected).toBe(false);

      expect(result.environment.nodeEnv).toBe("production");
      expect(result.environment.julesConfigured).toBe(false);
      expect(result.environment.githubConfigured).toBe(false);
    });

    it("should use default port 3000 when PORT not set", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.PORT;

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.devServer.port).toBe(3000);
      expect(result.devServer.url).toBe("http://localhost:3000");
    });

    it("should use custom PORT when set", async () => {
      process.env.NODE_ENV = "development";
      process.env.PORT = "4000";

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.devServer.port).toBe(4000);
      expect(result.devServer.url).toBe("http://localhost:4000");
    });

    it("should handle empty MCP config", async () => {
      process.env.NODE_ENV = "development";

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({}));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should handle MCP config with no servers", async () => {
      process.env.NODE_ENV = "development";

      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({ mcpServers: {} }),
      );

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should handle invalid JSON in MCP config", async () => {
      process.env.NODE_ENV = "development";

      vi.mocked(fs.readFile).mockResolvedValueOnce("not valid json");

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should use default type 'stdio' when MCP server type not specified", async () => {
      process.env.NODE_ENV = "development";

      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({
          mcpServers: {
            "my-server": {},
          },
        }),
      );

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(1);
      expect(result.mcpServers[0]).toEqual({
        name: "my-server",
        type: "stdio",
        configured: true,
      });
    });

    it("should use default 'development' for NODE_ENV when not set", async () => {
      delete process.env.NODE_ENV;

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.environment.nodeEnv).toBe("development");
    });

    it("should handle file read returning empty string", async () => {
      process.env.NODE_ENV = "development";

      vi.mocked(fs.readFile).mockResolvedValueOnce("");

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should correctly identify database as not connected when URL missing", async () => {
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "";

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.database.connected).toBe(false);
    });

    it("should correctly identify database as connected when URL present", async () => {
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/mydb";

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.database.connected).toBe(true);
      expect(result.database.provider).toBe("postgresql");
    });

    it("should handle multiple MCP servers with different types", async () => {
      process.env.NODE_ENV = "development";

      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({
          mcpServers: {
            playwright: { type: "stdio", command: "npx" },
            docker: { type: "http", url: "http://localhost:8080" },
            custom: { type: "websocket" },
          },
        }),
      );

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(3);
      expect(result.mcpServers.find((s) => s.name === "playwright")?.type).toBe("stdio");
      expect(result.mcpServers.find((s) => s.name === "docker")?.type).toBe("http");
      expect(result.mcpServers.find((s) => s.name === "custom")?.type).toBe("websocket");
    });

    it("should detect partial configuration", async () => {
      process.env.NODE_ENV = "development";
      process.env.JULES_API_KEY = "test-key";
      delete process.env.GH_PAT_TOKEN;

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.environment.julesConfigured).toBe(true);
      expect(result.environment.githubConfigured).toBe(false);
    });
  });
});
