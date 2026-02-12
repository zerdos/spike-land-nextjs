import { describe, expect, it } from "vitest";
import {
  EDIT_MODE_PREAMBLE,
  PLAN_ALLOWED_TOOLS,
  PLAN_MODE_PREAMBLE,
} from "./vibe-code-system";

describe("vibe-code-system prompts", () => {
  describe("PLAN_MODE_PREAMBLE", () => {
    it("should be a non-empty string", () => {
      expect(typeof PLAN_MODE_PREAMBLE).toBe("string");
      expect(PLAN_MODE_PREAMBLE.length).toBeGreaterThan(0);
    });

    it("should mention PLAN mode", () => {
      expect(PLAN_MODE_PREAMBLE).toContain("PLAN mode");
    });

    it("should mention not modifying code", () => {
      expect(PLAN_MODE_PREAMBLE).toContain("MUST NOT modify");
    });
  });

  describe("EDIT_MODE_PREAMBLE", () => {
    it("should be a non-empty string", () => {
      expect(typeof EDIT_MODE_PREAMBLE).toBe("string");
      expect(EDIT_MODE_PREAMBLE.length).toBeGreaterThan(0);
    });

    it("should mention EDIT mode", () => {
      expect(EDIT_MODE_PREAMBLE).toContain("EDIT mode");
    });

    it("should mention modifying code", () => {
      expect(EDIT_MODE_PREAMBLE).toContain("modify");
    });
  });

  describe("PLAN_ALLOWED_TOOLS", () => {
    it("should be an array", () => {
      expect(Array.isArray(PLAN_ALLOWED_TOOLS)).toBe(true);
    });

    it("should contain read_code tool", () => {
      expect(PLAN_ALLOWED_TOOLS).toContain("mcp__codespace__read_code");
    });

    it("should contain find_lines tool", () => {
      expect(PLAN_ALLOWED_TOOLS).toContain("mcp__codespace__find_lines");
    });

    it("should only contain read-only tools", () => {
      expect(PLAN_ALLOWED_TOOLS).toHaveLength(2);
      for (const tool of PLAN_ALLOWED_TOOLS) {
        expect(tool).not.toContain("update_code");
        expect(tool).not.toContain("edit_code");
        expect(tool).not.toContain("search_and_replace");
      }
    });
  });
});
