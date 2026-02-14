import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    claudeCodeAgent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    agentMessage: { createMany: vi.fn() },
    agentAuditLog: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerSwarmTools } from "./swarm";

describe("swarm tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    registry = createMockRegistry();
    registerSwarmTools(registry, userId);
  });

  it("should register 8 swarm tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(8);
    expect(registry.handlers.has("swarm_list_agents")).toBe(true);
    expect(registry.handlers.has("swarm_get_agent")).toBe(true);
    expect(registry.handlers.has("swarm_spawn_agent")).toBe(true);
    expect(registry.handlers.has("swarm_stop_agent")).toBe(true);
    expect(registry.handlers.has("swarm_redirect_agent")).toBe(true);
    expect(registry.handlers.has("swarm_broadcast")).toBe(true);
    expect(registry.handlers.has("swarm_agent_timeline")).toBe(true);
    expect(registry.handlers.has("swarm_topology")).toBe(true);
  });

  describe("swarm_list_agents", () => {
    it("should list agents with status labels", async () => {
      const now = new Date();
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        {
          id: "agent-1", displayName: "Worker-1", lastSeenAt: now,
          totalTokensUsed: 1000, totalTasksCompleted: 5,
          machineId: "m1", projectPath: "/proj",
          _count: { messages: 10 },
        },
      ]);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("Worker-1");
      expect(getText(result)).toContain("ACTIVE");
      expect(getText(result)).toContain("Tasks: 5");
    });

    it("should return message when no agents found", async () => {
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("No agents found");
    });

    it("should filter by active status", async () => {
      const now = new Date();
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        {
          id: "a1", displayName: "Active", lastSeenAt: now,
          totalTokensUsed: 0, totalTasksCompleted: 0,
          machineId: "m1", projectPath: null,
          _count: { messages: 0 },
        },
        {
          id: "a2", displayName: "Idle", lastSeenAt: tenMinAgo,
          totalTokensUsed: 0, totalTasksCompleted: 0,
          machineId: "m2", projectPath: null,
          _count: { messages: 0 },
        },
      ]);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({ status: "active" });
      expect(getText(result)).toContain("Active");
      expect(getText(result)).not.toContain("Idle");
    });

    it("should show IDLE for agents seen more than 5 minutes ago", async () => {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        {
          id: "a1", displayName: "OldAgent", lastSeenAt: tenMinAgo,
          totalTokensUsed: 0, totalTasksCompleted: 0,
          machineId: "m1", projectPath: null,
          _count: { messages: 0 },
        },
      ]);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("IDLE");
    });

    it("should show STOPPED for agents with no lastSeenAt", async () => {
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        {
          id: "a1", displayName: "NeverSeen", lastSeenAt: null,
          totalTokensUsed: 0, totalTasksCompleted: 0,
          machineId: "m1", projectPath: null,
          _count: { messages: 0 },
        },
      ]);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("STOPPED");
    });
  });

  describe("swarm_get_agent", () => {
    it("should return detailed agent info", async () => {
      const now = new Date();
      mockPrisma.claudeCodeAgent.findUnique.mockResolvedValue({
        id: "agent-1", displayName: "Worker-1", machineId: "m1",
        sessionId: "s1", projectPath: "/proj", workingDirectory: "/work",
        totalTokensUsed: 500, totalTasksCompleted: 3, totalSessionTime: 120,
        lastSeenAt: now, createdAt: now, deletedAt: null,
        _count: { messages: 5 },
      });
      const handler = registry.handlers.get("swarm_get_agent")!;
      const result = await handler({ agent_id: "agent-1" });
      expect(getText(result)).toContain("Worker-1");
      expect(getText(result)).toContain("Tokens: 500");
      expect(getText(result)).toContain("Tasks: 3");
    });

    it("should return not found for missing agent", async () => {
      mockPrisma.claudeCodeAgent.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("swarm_get_agent")!;
      const result = await handler({ agent_id: "missing" });
      expect(getText(result)).toContain("Agent not found");
    });

    it("should return not found for soft-deleted agent", async () => {
      mockPrisma.claudeCodeAgent.findUnique.mockResolvedValue({
        id: "agent-1", displayName: "Deleted", deletedAt: new Date(),
        _count: { messages: 0 },
      });
      const handler = registry.handlers.get("swarm_get_agent")!;
      const result = await handler({ agent_id: "agent-1" });
      expect(getText(result)).toContain("Agent not found");
    });
  });

  describe("swarm_spawn_agent", () => {
    it("should create a new agent", async () => {
      mockPrisma.claudeCodeAgent.create.mockResolvedValue({
        id: "new-session", displayName: "NewBot",
      });
      const handler = registry.handlers.get("swarm_spawn_agent")!;
      const result = await handler({
        display_name: "NewBot", machine_id: "m1",
        session_id: "new-session", project_path: "/proj",
      });
      expect(getText(result)).toContain("Agent spawned");
      expect(getText(result)).toContain("NewBot");
      expect(mockPrisma.claudeCodeAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ displayName: "NewBot", userId }),
        }),
      );
    });
  });

  describe("swarm_stop_agent", () => {
    it("should soft-delete an agent", async () => {
      mockPrisma.claudeCodeAgent.update.mockResolvedValue({});
      const handler = registry.handlers.get("swarm_stop_agent")!;
      const result = await handler({ agent_id: "agent-1" });
      expect(getText(result)).toContain("stopped");
      expect(mockPrisma.claudeCodeAgent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });
  });

  describe("swarm_redirect_agent", () => {
    it("should redirect an agent", async () => {
      mockPrisma.claudeCodeAgent.update.mockResolvedValue({});
      const handler = registry.handlers.get("swarm_redirect_agent")!;
      const result = await handler({
        agent_id: "agent-1", project_path: "/new-proj", working_directory: "/new-dir",
      });
      expect(getText(result)).toContain("redirected");
    });
  });

  describe("swarm_broadcast", () => {
    it("should broadcast to all agents", async () => {
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        { id: "a1" }, { id: "a2" },
      ]);
      mockPrisma.agentMessage.createMany.mockResolvedValue({ count: 2 });
      const handler = registry.handlers.get("swarm_broadcast")!;
      const result = await handler({ content: "Hello swarm" });
      expect(getText(result)).toContain("Broadcast sent to 2 agents");
    });
  });

  describe("swarm_agent_timeline", () => {
    it("should return timeline entries", async () => {
      mockPrisma.agentAuditLog.findMany.mockResolvedValue([
        {
          action: "tool_call", actionType: "CODE_EDIT",
          createdAt: new Date(), durationMs: 150, isError: false,
        },
      ]);
      const handler = registry.handlers.get("swarm_agent_timeline")!;
      const result = await handler({ agent_id: "agent-1" });
      expect(getText(result)).toContain("tool_call");
      expect(getText(result)).toContain("CODE_EDIT");
    });

    it("should return message when no timeline entries", async () => {
      mockPrisma.agentAuditLog.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("swarm_agent_timeline")!;
      const result = await handler({ agent_id: "agent-1" });
      expect(getText(result)).toContain("No timeline entries found");
    });

    it("should show ERROR marker for error entries", async () => {
      mockPrisma.agentAuditLog.findMany.mockResolvedValue([
        {
          action: "compile", actionType: "BUILD",
          createdAt: new Date(), durationMs: 500, isError: true,
        },
      ]);
      const handler = registry.handlers.get("swarm_agent_timeline")!;
      const result = await handler({ agent_id: "agent-1" });
      expect(getText(result)).toContain("[ERROR]");
    });
  });

  describe("swarm_topology", () => {
    it("should show agent topology with trust scores", async () => {
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        {
          id: "a1", displayName: "Alpha", lastSeenAt: new Date(),
          trustScore: { trustLevel: "TRUSTED", totalSuccessful: 100, totalFailed: 2 },
        },
      ]);
      const handler = registry.handlers.get("swarm_topology")!;
      const result = await handler({});
      expect(getText(result)).toContain("Alpha");
      expect(getText(result)).toContain("TRUSTED");
      expect(getText(result)).toContain("100 ok / 2 fail");
    });

    it("should return message when no agents in swarm", async () => {
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("swarm_topology")!;
      const result = await handler({});
      expect(getText(result)).toContain("No agents in the swarm");
    });

    it("should default trust level to SANDBOX when no trust score", async () => {
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([
        { id: "a1", displayName: "Newbie", lastSeenAt: new Date(), trustScore: null },
      ]);
      const handler = registry.handlers.get("swarm_topology")!;
      const result = await handler({});
      expect(getText(result)).toContain("SANDBOX");
    });
  });

  describe("requireAdminRole", () => {
    it("should deny access when user has USER role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("PERMISSION_DENIED");
    });

    it("should deny access when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("PERMISSION_DENIED");
    });

    it("should allow SUPER_ADMIN role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: "SUPER_ADMIN" });
      mockPrisma.claudeCodeAgent.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("swarm_list_agents")!;
      const result = await handler({});
      expect(getText(result)).toContain("No agents found");
    });

    it("should check admin role on every swarm tool handler", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });
      const toolNames = [
        "swarm_list_agents", "swarm_get_agent", "swarm_spawn_agent",
        "swarm_stop_agent", "swarm_redirect_agent", "swarm_broadcast",
        "swarm_agent_timeline", "swarm_topology",
      ];
      for (const toolName of toolNames) {
        const handler = registry.handlers.get(toolName)!;
        const result = await handler({});
        expect(getText(result)).toContain("PERMISSION_DENIED");
      }
    });
  });
});
