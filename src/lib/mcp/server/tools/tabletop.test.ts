import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  gameSession: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

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
    it("should create game", async () => {
      mockPrisma.gameSession.create.mockResolvedValue({ id: "g1" });
      const handler = registry.handlers.get("tabletop_create_game")!;
      const result = await handler({ name: "Chess Match", game_type: "chess" });
      expect(getText(result)).toContain("Game Created");
      expect(getText(result)).toContain("Chess Match");
    });
  });

  describe("tabletop_get_game", () => {
    it("should get game details", async () => {
      mockPrisma.gameSession.findUnique.mockResolvedValue({
        id: "g1", name: "Chess Match", gameType: "chess", status: "IN_PROGRESS",
        maxPlayers: 2, playerCount: 2, createdAt: new Date(),
      });
      const handler = registry.handlers.get("tabletop_get_game")!;
      const result = await handler({ game_id: "g1" });
      expect(getText(result)).toContain("Chess Match");
      expect(getText(result)).toContain("2/2");
    });

    it("should return NOT_FOUND", async () => {
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("tabletop_get_game")!;
      const result = await handler({ game_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("tabletop_list_games", () => {
    it("should list games", async () => {
      mockPrisma.gameSession.findMany.mockResolvedValue([
        { id: "g1", name: "Chess", gameType: "chess", status: "WAITING", playerCount: 1, maxPlayers: 2 },
      ]);
      const handler = registry.handlers.get("tabletop_list_games")!;
      const result = await handler({});
      expect(getText(result)).toContain("Chess");
    });

    it("should return empty message", async () => {
      mockPrisma.gameSession.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("tabletop_list_games")!;
      const result = await handler({});
      expect(getText(result)).toContain("No games found");
    });
  });

  describe("tabletop_game_action", () => {
    it("should start game", async () => {
      mockPrisma.gameSession.update.mockResolvedValue({});
      const handler = registry.handlers.get("tabletop_game_action")!;
      const result = await handler({ game_id: "g1", action: "start" });
      expect(getText(result)).toContain("start completed");
    });

    it("should join game", async () => {
      mockPrisma.gameSession.update.mockResolvedValue({});
      const handler = registry.handlers.get("tabletop_game_action")!;
      const result = await handler({ game_id: "g1", action: "join" });
      expect(getText(result)).toContain("join completed");
    });
  });
});
