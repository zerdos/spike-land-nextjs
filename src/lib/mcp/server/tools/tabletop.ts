/**
 * Tabletop MCP Tools
 *
 * Tabletop simulator tools for board games, cards, and game state management.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

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
  userId: string,
): void {
  registry.register({
    name: "tabletop_create_game",
    description: "Create a new tabletop game session.",
    category: "tabletop",
    tier: "free",
    inputSchema: CreateGameSchema.shape,
    handler: async ({ name, game_type, max_players = 4 }: z.infer<typeof CreateGameSchema>): Promise<CallToolResult> =>
      safeToolCall("tabletop_create_game", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const game = await prisma.gameSession.create({
          data: { name, gameType: game_type, maxPlayers: max_players, status: "WAITING", hostId: userId, playerCount: 1 },
        });
        return textResult(
          `**Game Created!**\n\n` +
          `**ID:** ${game.id}\n` +
          `**Name:** ${name}\n` +
          `**Type:** ${game_type}\n` +
          `**Max Players:** ${max_players}\n` +
          `**Status:** WAITING`
        );
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
        const prisma = (await import("@/lib/prisma")).default;
        const game = await prisma.gameSession.findUnique({
          where: { id: game_id },
          select: { id: true, name: true, gameType: true, status: true, maxPlayers: true, playerCount: true, createdAt: true },
        });
        if (!game) return textResult("**Error: NOT_FOUND**\nGame not found.\n**Retryable:** false");
        return textResult(
          `**Tabletop Game**\n\n` +
          `**ID:** ${game.id}\n` +
          `**Name:** ${game.name}\n` +
          `**Type:** ${game.gameType}\n` +
          `**Status:** ${game.status}\n` +
          `**Players:** ${game.playerCount}/${game.maxPlayers}\n` +
          `**Created:** ${game.createdAt.toISOString()}`
        );
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
        const prisma = (await import("@/lib/prisma")).default;
        const where = status === "ALL" ? {} : { status };
        const games = await prisma.gameSession.findMany({
          where,
          select: { id: true, name: true, gameType: true, status: true, playerCount: true, maxPlayers: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (games.length === 0) return textResult("No games found.");
        let text = `**Games (${games.length}):**\n\n`;
        for (const g of games) {
          text += `- **${g.name}** (${g.gameType}) [${g.status}] — ${g.playerCount}/${g.maxPlayers} players\n  ID: ${g.id}\n\n`;
        }
        return textResult(text);
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
        const prisma = (await import("@/lib/prisma")).default;
        const statusMap: Record<string, string> = { start: "IN_PROGRESS", end: "FINISHED", reset: "WAITING" };
        const data: Record<string, unknown> = {};
        if (statusMap[action]) data.status = statusMap[action];
        if (action === "join") data.playerCount = { increment: 1 };
        if (action === "leave") data.playerCount = { decrement: 1 };
        if (action === "reset") data.playerCount = 1;
        await prisma.gameSession.update({ where: { id: game_id }, data });
        return textResult(`**Game ${game_id}** — ${action} completed!`);
      }),
  });
}
