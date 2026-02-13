/**
 * Tabletop MCP Tools
 *
 * Tabletop simulator tools for board games, cards, and game state management.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall } from "./tool-helpers";

const CreateGameSchema = z.object({
  name: z.string().min(1).max(200).describe("Game session name."),
  game_type: z.string().min(1).describe("Type of game (chess, cards, custom, etc)."),
  max_players: z.number().int().min(1).max(20).optional().default(4).describe("Maximum players."),
});

const GetGameSchema = z.object({
  game_id: z.string().min(1).describe("Game session ID."),
});

const ListGamesSchema = z.object({
  status: z.enum(["WAITING", "IN_PROGRESS", "FINISHED", "ALL"]).optional().default("ALL").describe("Filter by status."),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
});

const GameActionSchema = z.object({
  game_id: z.string().min(1).describe("Game session ID."),
  action: z.enum(["join", "leave", "start", "end", "reset"]).describe("Action to perform."),
});

export function registerTabletopTools(
  registry: ToolRegistry,
  _userId: string,
): void {
  registry.register({
    name: "tabletop_create_game",
    description: "Create a new tabletop game session.",
    category: "tabletop",
    tier: "free",
    inputSchema: CreateGameSchema.shape,
    handler: async ({ name, game_type, max_players = 4 }: z.infer<typeof CreateGameSchema>): Promise<CallToolResult> =>
      safeToolCall("tabletop_create_game", async () => {
        void name; void game_type; void max_players;
        // TODO: Add GameSession model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "GameSession model not yet added to schema" }) }] };
      }),
  });

  registry.register({
    name: "tabletop_get_game",
    description: "Get details of a tabletop game session including players and state.",
    category: "tabletop",
    tier: "free",
    inputSchema: GetGameSchema.shape,
    handler: async ({ game_id }: z.infer<typeof GetGameSchema>): Promise<CallToolResult> =>
      safeToolCall("tabletop_get_game", async () => {
        void game_id;
        // TODO: Add GameSession model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "GameSession model not yet added to schema" }) }] };
      }),
  });

  registry.register({
    name: "tabletop_list_games",
    description: "List tabletop game sessions with optional status filter.",
    category: "tabletop",
    tier: "free",
    inputSchema: ListGamesSchema.shape,
    handler: async ({ status = "ALL", limit = 10 }: z.infer<typeof ListGamesSchema>): Promise<CallToolResult> =>
      safeToolCall("tabletop_list_games", async () => {
        void status; void limit;
        // TODO: Add GameSession model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "GameSession model not yet added to schema" }) }] };
      }),
  });

  registry.register({
    name: "tabletop_game_action",
    description: "Perform an action on a game session (join, leave, start, end, reset).",
    category: "tabletop",
    tier: "free",
    inputSchema: GameActionSchema.shape,
    handler: async ({ game_id, action }: z.infer<typeof GameActionSchema>): Promise<CallToolResult> =>
      safeToolCall("tabletop_game_action", async () => {
        void game_id; void action;
        // TODO: Add GameSession model to prisma/schema.prisma
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "GameSession model not yet added to schema" }) }] };
      }),
  });
}
