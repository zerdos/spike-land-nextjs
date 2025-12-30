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

// Helper to set environment variables (bypasses read-only restriction)
const setEnv = (key: string, value: string | undefined): void => {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
};

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
      setEnv("NODE_ENV", "development");
      setEnv("PORT", "3000");
      setEnv("DATABASE_URL", "postgresql://localhost:5432/test");
      setEnv("JULES_API_KEY", "test-jules-key");
      setEnv("GH_PAT_TOKEN", "ghp_test_token");

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
      setEnv("NODE_ENV", "production");
      setEnv("PORT", undefined);
      setEnv("DATABASE_URL", undefined);
      setEnv("JULES_API_KEY", undefined);
      setEnv("GH_PAT_TOKEN", undefined);

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
      setEnv("NODE_ENV", "development");
      setEnv("PORT", undefined);

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.devServer.port).toBe(3000);
      expect(result.devServer.url).toBe("http://localhost:3000");
    });

    it("should use custom PORT when set", async () => {
      setEnv("NODE_ENV", "development");
      setEnv("PORT", "4000");

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.devServer.port).toBe(4000);
      expect(result.devServer.url).toBe("http://localhost:4000");
    });

    it("should handle empty MCP config", async () => {
      setEnv("NODE_ENV", "development");

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({}));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should handle MCP config with no servers", async () => {
      setEnv("NODE_ENV", "development");

      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({ mcpServers: {} }),
      );

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should handle invalid JSON in MCP config", async () => {
      setEnv("NODE_ENV", "development");

      vi.mocked(fs.readFile).mockResolvedValueOnce("not valid json");

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should use default type 'stdio' when MCP server type not specified", async () => {
      setEnv("NODE_ENV", "development");

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
      setEnv("NODE_ENV", undefined);

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.environment.nodeEnv).toBe("development");
    });

    it("should handle file read returning empty string", async () => {
      setEnv("NODE_ENV", "development");

      vi.mocked(fs.readFile).mockResolvedValueOnce("");

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.mcpServers).toHaveLength(0);
    });

    it("should correctly identify database as not connected when URL missing", async () => {
      setEnv("NODE_ENV", "development");
      setEnv("DATABASE_URL", "");

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.database.connected).toBe(false);
    });

    it("should correctly identify database as connected when URL present", async () => {
      setEnv("NODE_ENV", "development");
      setEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/mydb");

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.database.connected).toBe(true);
      expect(result.database.provider).toBe("postgresql");
    });

    it("should handle multiple MCP servers with different types", async () => {
      setEnv("NODE_ENV", "development");

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
      expect(result.mcpServers.find((s) => s.name === "playwright")?.type).toBe(
        "stdio",
      );
      expect(result.mcpServers.find((s) => s.name === "docker")?.type).toBe(
        "http",
      );
      expect(result.mcpServers.find((s) => s.name === "custom")?.type).toBe(
        "websocket",
      );
    });

    it("should detect partial configuration", async () => {
      setEnv("NODE_ENV", "development");
      setEnv("JULES_API_KEY", "test-key");
      setEnv("GH_PAT_TOKEN", undefined);

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

      const { detectResources } = await import("./resource-detector");
      const result = await detectResources();

      expect(result.environment.julesConfigured).toBe(true);
      expect(result.environment.githubConfigured).toBe(false);
    });
  });
});
