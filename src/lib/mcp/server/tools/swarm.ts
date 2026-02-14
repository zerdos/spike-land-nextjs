/**
 * Swarm Management MCP Tools
 *
 * Tools for managing AI agents in the swarm: list, inspect, spawn, stop,
 * redirect, broadcast, timeline, and topology.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult } from "./tool-helpers";
import { McpError, McpErrorCode } from "../../errors";

/**
 * Verify that a user has ADMIN or SUPER_ADMIN role.
 * Throws McpError with PERMISSION_DENIED if not.
 */
async function requireAdminRole(userId: string): Promise<void> {
  const prisma = (await import("@/lib/prisma")).default;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new McpError("Admin access required.", McpErrorCode.PERMISSION_DENIED, false);
  }
}

const ListAgentsSchema = z.object({
  status: z.enum(["active", "idle", "stopped", "all"]).optional().default("all").describe("Filter by agent status."),
  limit: z.number().int().min(1).max(100).optional().default(20).describe("Max results."),
});

const GetAgentSchema = z.object({
  agent_id: z.string().min(1).describe("Agent ID."),
});

const SpawnAgentSchema = z.object({
  display_name: z.string().min(1).max(100).describe("Agent display name."),
  machine_id: z.string().min(1).describe("Machine identifier."),
  session_id: z.string().min(1).describe("Session identifier."),
  project_path: z.string().optional().describe("Project path."),
});

const StopAgentSchema = z.object({
  agent_id: z.string().min(1).describe("Agent ID to stop."),
});

const RedirectAgentSchema = z.object({
  agent_id: z.string().min(1).describe("Agent ID."),
  project_path: z.string().optional().describe("New project path."),
  working_directory: z.string().optional().describe("New working directory."),
});

const BroadcastSchema = z.object({
  content: z.string().min(1).max(10000).describe("Message content."),
});

const AgentTimelineSchema = z.object({
  agent_id: z.string().min(1).describe("Agent ID."),
  limit: z.number().int().min(1).max(100).optional().default(20).describe("Max entries."),
});

export function registerSwarmTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "swarm_list_agents",
    description: "List all AI agents with their status, tasks, and session info.",
    category: "swarm",
    tier: "workspace",
    inputSchema: ListAgentsSchema.shape,
    handler: async ({ status = "all", limit = 20 }: z.infer<typeof ListAgentsSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_list_agents", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

        const agents = await prisma.claudeCodeAgent.findMany({
          where: { deletedAt: null },
          select: {
            id: true, displayName: true, lastSeenAt: true,
            totalTokensUsed: true, totalTasksCompleted: true,
            machineId: true, projectPath: true,
            _count: { select: { messages: true } },
          },
          take: limit,
          orderBy: { lastSeenAt: "desc" },
        });

        const filtered = status === "all" ? agents : agents.filter(a => {
          const isActive = a.lastSeenAt && a.lastSeenAt > fiveMinAgo;
          if (status === "active") return isActive;
          if (status === "idle") return a.lastSeenAt && !isActive;
          if (status === "stopped") return !a.lastSeenAt;
          return true;
        });

        if (filtered.length === 0) return textResult("No agents found.");
        let text = `**Swarm Agents (${filtered.length}):**\n\n`;
        for (const a of filtered) {
          const isActive = a.lastSeenAt && a.lastSeenAt > fiveMinAgo;
          const statusLabel = isActive ? "ACTIVE" : a.lastSeenAt ? "IDLE" : "STOPPED";
          text += `- **${a.displayName}** [${statusLabel}]\n  Tasks: ${a.totalTasksCompleted} | Tokens: ${a.totalTokensUsed} | Messages: ${a._count.messages}\n  ID: ${a.id}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "swarm_get_agent",
    description: "Get detailed information about a specific agent including messages and audit log.",
    category: "swarm",
    tier: "workspace",
    inputSchema: GetAgentSchema.shape,
    handler: async ({ agent_id }: z.infer<typeof GetAgentSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_get_agent", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const agent = await prisma.claudeCodeAgent.findUnique({
          where: { id: agent_id },
          include: { _count: { select: { messages: true } } },
        });
        if (!agent || agent.deletedAt) return textResult("Agent not found.");
        return textResult(
          `**Agent: ${agent.displayName}**\n\n` +
          `- ID: ${agent.id}\n- Machine: ${agent.machineId}\n- Session: ${agent.sessionId}\n` +
          `- Project: ${agent.projectPath || "(none)"}\n- Working Dir: ${agent.workingDirectory || "(none)"}\n` +
          `- Messages: ${agent._count.messages}\n- Tokens: ${agent.totalTokensUsed}\n` +
          `- Tasks: ${agent.totalTasksCompleted}\n- Session Time: ${agent.totalSessionTime}s\n` +
          `- Last Seen: ${agent.lastSeenAt?.toISOString() || "never"}\n- Created: ${agent.createdAt.toISOString()}`
        );
      }),
  });

  registry.register({
    name: "swarm_spawn_agent",
    description: "Register a new agent in the swarm.",
    category: "swarm",
    tier: "workspace",
    inputSchema: SpawnAgentSchema.shape,
    handler: async ({ display_name, machine_id, session_id, project_path }: z.infer<typeof SpawnAgentSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_spawn_agent", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const agent = await prisma.claudeCodeAgent.create({
          data: {
            id: session_id,
            userId,
            machineId: machine_id,
            sessionId: session_id,
            displayName: display_name,
            projectPath: project_path,
            lastSeenAt: new Date(),
          },
        });
        return textResult(`**Agent spawned!**\n\nID: ${agent.id}\nName: ${agent.displayName}`);
      }),
  });

  registry.register({
    name: "swarm_stop_agent",
    description: "Stop an agent by soft-deleting it.",
    category: "swarm",
    tier: "workspace",
    inputSchema: StopAgentSchema.shape,
    handler: async ({ agent_id }: z.infer<typeof StopAgentSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_stop_agent", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        await prisma.claudeCodeAgent.update({ where: { id: agent_id }, data: { deletedAt: new Date() } });
        return textResult(`Agent ${agent_id} stopped.`);
      }),
  });

  registry.register({
    name: "swarm_redirect_agent",
    description: "Redirect an agent to a different project or working directory.",
    category: "swarm",
    tier: "workspace",
    inputSchema: RedirectAgentSchema.shape,
    handler: async ({ agent_id, project_path, working_directory }: z.infer<typeof RedirectAgentSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_redirect_agent", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const data: Record<string, string> = {};
        if (project_path !== undefined) data["projectPath"] = project_path;
        if (working_directory !== undefined) data["workingDirectory"] = working_directory;
        await prisma.claudeCodeAgent.update({ where: { id: agent_id }, data });
        return textResult(`Agent ${agent_id} redirected.`);
      }),
  });

  registry.register({
    name: "swarm_broadcast",
    description: "Broadcast a message to all active agents.",
    category: "swarm",
    tier: "workspace",
    inputSchema: BroadcastSchema.shape,
    handler: async ({ content }: z.infer<typeof BroadcastSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_broadcast", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const agents = await prisma.claudeCodeAgent.findMany({ where: { deletedAt: null }, select: { id: true } });
        const messages = agents.map(a => ({ agentId: a.id, role: "USER" as const, content, isRead: false }));
        const result = await prisma.agentMessage.createMany({ data: messages });
        return textResult(`Broadcast sent to ${result.count} agents.`);
      }),
  });

  registry.register({
    name: "swarm_agent_timeline",
    description: "Get an agent's activity timeline from the audit log.",
    category: "swarm",
    tier: "workspace",
    inputSchema: AgentTimelineSchema.shape,
    handler: async ({ agent_id, limit = 20 }: z.infer<typeof AgentTimelineSchema>): Promise<CallToolResult> =>
      safeToolCall("swarm_agent_timeline", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const logs = await prisma.agentAuditLog.findMany({
          where: { agentId: agent_id },
          select: { action: true, actionType: true, createdAt: true, durationMs: true, isError: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        if (logs.length === 0) return textResult("No timeline entries found.");
        let text = `**Agent Timeline (${logs.length}):**\n\n`;
        for (const log of logs) {
          text += `- **${log.action}** [${log.actionType}] ${log.isError ? "[ERROR]" : ""}\n  Duration: ${log.durationMs}ms | ${log.createdAt.toISOString()}\n\n`;
        }
        return textResult(text);
      }),
  });

  registry.register({
    name: "swarm_topology",
    description: "Get the swarm topology showing agent relationships and trust scores.",
    category: "swarm",
    tier: "workspace",
    inputSchema: {},
    handler: async (): Promise<CallToolResult> =>
      safeToolCall("swarm_topology", async () => {
        await requireAdminRole(userId);
        const prisma = (await import("@/lib/prisma")).default;
        const agents = await prisma.claudeCodeAgent.findMany({
          where: { deletedAt: null },
          select: {
            id: true, displayName: true, lastSeenAt: true,
            trustScore: { select: { trustLevel: true, totalSuccessful: true, totalFailed: true } },
          },
        });
        if (agents.length === 0) return textResult("No agents in the swarm.");
        let text = `**Swarm Topology (${agents.length} agents):**\n\n`;
        for (const a of agents) {
          const trust = a.trustScore;
          text += `- **${a.displayName}** — Trust: ${trust?.trustLevel || "SANDBOX"} (${trust?.totalSuccessful || 0} ok / ${trust?.totalFailed || 0} fail)\n  ID: ${a.id}\n\n`;
        }
        return textResult(text);
      }),
  });
}
