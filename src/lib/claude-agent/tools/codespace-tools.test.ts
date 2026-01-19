import { describe, expect, it } from "vitest";
import { CODESPACE_TOOL_NAMES, createCodespaceServer } from "./codespace-tools";

describe("codespace-tools", () => {
  const codespaceId = "test-codespace-id";

  describe("CODESPACE_TOOL_NAMES", () => {
    it("exports correct tool names", () => {
      expect(CODESPACE_TOOL_NAMES).toEqual([
        "mcp__codespace__read_code",
        "mcp__codespace__update_code",
        "mcp__codespace__edit_code",
        "mcp__codespace__search_and_replace",
        "mcp__codespace__find_lines",
        "mcp__codespace__validate_code",
      ]);
    });

    it("has 6 tool names", () => {
      expect(CODESPACE_TOOL_NAMES).toHaveLength(6);
    });

    it("all tool names follow mcp__codespace__ prefix pattern", () => {
      for (const name of CODESPACE_TOOL_NAMES) {
        expect(name).toMatch(/^mcp__codespace__/);
      }
    });
  });

  describe("createCodespaceServer", () => {
    it("creates an MCP server with correct name", () => {
      const server = createCodespaceServer(codespaceId);

      expect(server).toBeDefined();
      expect(server.name).toBe("codespace");
    });

    it("creates different servers for different codespaceIds", () => {
      const server1 = createCodespaceServer("codespace-1");
      const server2 = createCodespaceServer("codespace-2");

      // Both should be valid servers
      expect(server1).toBeDefined();
      expect(server2).toBeDefined();

      // They should be separate instances
      expect(server1).not.toBe(server2);
    });

    it("returns an object with name property", () => {
      const server = createCodespaceServer(codespaceId);

      expect(typeof server.name).toBe("string");
    });
  });
});
