import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ToolRegistry } from "../tool-registry";
import { registerTabletopTools } from "./tabletop";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("tabletop tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerTabletopTools(registry, userId); });

  it("should register 4 tabletop tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
  });

  describe("tabletop_create_game", () => {
    it("should return TODO stub for GameSession model", async () => {
      const handler = registry.handlers.get("tabletop_create_game")!;
      const result = await handler({ name: "Chess Match", game_type: "chess" });
      expect(getText(result)).toContain("GameSession model not yet added to schema");
    });
  });

  describe("tabletop_get_game", () => {
    it("should return TODO stub for GameSession model", async () => {
      const handler = registry.handlers.get("tabletop_get_game")!;
      const result = await handler({ game_id: "g1" });
      expect(getText(result)).toContain("GameSession model not yet added to schema");
    });
  });

  describe("tabletop_list_games", () => {
    it("should return TODO stub for GameSession model", async () => {
      const handler = registry.handlers.get("tabletop_list_games")!;
      const result = await handler({});
      expect(getText(result)).toContain("GameSession model not yet added to schema");
    });
  });

  describe("tabletop_game_action", () => {
    it("should return TODO stub for GameSession model", async () => {
      const handler = registry.handlers.get("tabletop_game_action")!;
      const result = await handler({ game_id: "g1", action: "start" });
      expect(getText(result)).toContain("GameSession model not yet added to schema");
    });
  });
});
