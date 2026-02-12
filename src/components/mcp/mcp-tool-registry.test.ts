import { describe, expect, it } from "vitest";
import {
  ACTIVE_CATEGORY_COUNT,
  GATEWAY_TOOL_COUNT,
  getActiveCategories,
  getToolsByCategory,
  MCP_CATEGORIES,
  MCP_TOOLS,
  TOTAL_CATEGORY_COUNT,
  TOTAL_TOOL_COUNT,
} from "./mcp-tool-registry";

describe("mcp-tool-registry", () => {
  it("has 34 total tools", () => {
    expect(TOTAL_TOOL_COUNT).toBe(34);
    expect(MCP_TOOLS.length).toBe(34);
  });

  it("has 5 categories (all active)", () => {
    expect(TOTAL_CATEGORY_COUNT).toBe(5);
    expect(ACTIVE_CATEGORY_COUNT).toBe(5);
    expect(MCP_CATEGORIES.length).toBe(5);
  });

  it("has 5 gateway (always-enabled) tools", () => {
    expect(GATEWAY_TOOL_COUNT).toBe(5);
  });

  it("has no empty categories", () => {
    for (const cat of MCP_CATEGORIES) {
      expect(cat.toolCount).toBeGreaterThan(0);
    }
  });

  it("category toolCounts match actual tool counts", () => {
    for (const cat of MCP_CATEGORIES) {
      const tools = getToolsByCategory(cat.id);
      expect(tools.length).toBe(cat.toolCount);
    }
  });

  it("getActiveCategories returns all categories", () => {
    expect(getActiveCategories().length).toBe(MCP_CATEGORIES.length);
  });

  it("includes github_update_project_item in gateway tools", () => {
    const gatewayTools = getToolsByCategory("gateway");
    const toolNames = gatewayTools.map((t) => t.name);
    expect(toolNames).toContain("github_update_project_item");
  });

  it("every tool references a valid category", () => {
    const categoryIds = new Set(MCP_CATEGORIES.map((c) => c.id));
    for (const tool of MCP_TOOLS) {
      expect(categoryIds.has(tool.category)).toBe(true);
    }
  });
});
