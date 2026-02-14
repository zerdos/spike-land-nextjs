/**
 * Capability-Filtered Tool Registry
 *
 * Wraps ToolRegistry to intercept every tool handler call with
 * capability evaluation, audit logging, and budget deduction.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Prisma } from "@/generated/prisma";
import logger from "@/lib/logger";
import type { ToolDefinition } from "./tool-registry";
import { ToolRegistry } from "./tool-registry";
import { evaluateCapability, createPermissionRequest } from "./capability-evaluator";
import { textResult } from "./tools/tool-helpers";

export class CapabilityFilteredRegistry extends ToolRegistry {
  private capabilityTokenId: string;
  private agentId: string;
  private userId: string;

  constructor(
    mcpServer: McpServer,
    capabilityTokenId: string,
    agentId: string,
    userId: string,
  ) {
    super(mcpServer);
    this.capabilityTokenId = capabilityTokenId;
    this.agentId = agentId;
    this.userId = userId;
  }

  override register(def: ToolDefinition): void {
    const originalHandler = def.handler;
    const { capabilityTokenId, agentId, userId } = this;

    const wrappedHandler = async (input: never): Promise<CallToolResult> => {
      const startTime = Date.now();
      const evalResult = await evaluateCapability(
        capabilityTokenId,
        def.name,
        def.category,
      );

      if (!evalResult.allowed) {
        if (evalResult.action === "request_permission") {
          await createPermissionRequest(
            agentId,
            userId,
            def.name,
            def.category,
            (input ?? {}) as Record<string, unknown>,
            "QUEUE",
          );
          return textResult(
            `**PERMISSION_NEEDED**\nTool \`${def.name}\` requires approval. ` +
            `A permission request has been submitted. ${evalResult.reason}`,
          );
        }
        return textResult(`**PERMISSION_DENIED**\n${evalResult.reason}`);
      }

      const result = await originalHandler(input);

      // Record audit + deduct budget (fire-and-forget, single import)
      void recordAuditAndDeductBudget({
        agentId,
        userId,
        capabilityTokenId,
        action: def.name,
        actionType: def.category,
        input: input as Record<string, unknown>,
        durationMs: Date.now() - startTime,
        isError: false,
      });

      return result;
    };

    super.register({
      ...def,
      handler: wrappedHandler as typeof def.handler,
    });
  }
}

async function recordAuditAndDeductBudget(data: {
  agentId: string;
  userId: string;
  capabilityTokenId: string;
  action: string;
  actionType: string;
  input: Record<string, unknown>;
  durationMs: number;
  isError: boolean;
}): Promise<void> {
  try {
    const prisma = (await import("@/lib/prisma")).default;

    await Promise.all([
      prisma.agentAuditLog.create({
        data: {
          agentId: data.agentId,
          userId: data.userId,
          capabilityTokenId: data.capabilityTokenId,
          action: data.action,
          actionType: data.actionType,
          input: data.input as Prisma.InputJsonValue,
          durationMs: data.durationMs,
          isError: data.isError,
          delegationChain: [],
        },
      }),
      prisma.agentCapabilityToken.update({
        where: { id: data.capabilityTokenId },
        data: { usedApiCalls: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    logger.error("Failed to record audit/deduct budget", { error: err });
  }
}
