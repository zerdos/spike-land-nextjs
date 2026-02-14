/**
 * Credits Management MCP Tools
 *
 * AI credit balance checking for workspace usage tracking.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";

export function registerCreditsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "credits_get_balance",
    description: "Get current user's AI credit balance including remaining credits, monthly limit, usage, and subscription tier.",
    category: "credits",
    tier: "free",
    inputSchema: z.object({}).shape,
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("credits_get_balance", async () => {
        const { WorkspaceCreditManager } = await import("@/lib/credits/workspace-credit-manager");
        const balance = await WorkspaceCreditManager.getBalance(userId);

        if (!balance) {
          return textResult("**Error:** Unable to retrieve credit balance. No active workspace found.");
        }

        return textResult(
          `**AI Credit Balance**\n\n` +
          `**Remaining:** ${balance.remaining}\n` +
          `**Limit:** ${balance.limit}\n` +
          `**Used:** ${balance.used}\n` +
          `**Tier:** ${balance.tier}\n` +
          `**Workspace ID:** ${balance.workspaceId}`,
        );
      }),
  });
}
