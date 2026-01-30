import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the redis client
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  lpush: vi.fn(),
  lrange: vi.fn(),
  ltrim: vi.fn(),
  rpop: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  hincrby: vi.fn(),
  hgetall: vi.fn(),
  publish: vi.fn(),
  ping: vi.fn(),
};

vi.mock("@/lib/upstash/client", () => ({
  redis: mockRedis,
}));

const {
  AGENT_KEYS,
  disconnectAgent,
  getAgentActivity,
  getAgentData,
  getAgentSSEEvents,
  getAgentStatus,
  getAgentToolStats,
  getPendingTasks,
  getUserAgents,
  isRedisAvailable,
  logAgentActivity,
  popTask,
  processHeartbeat,
  publishAgentEvent,
  registerAgent,
  removeAgent,
  sendTaskToAgent,
} = await import("./redis-client");

describe("Agent Redis Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("AGENT_KEYS", () => {
    it("generates correct key patterns", () => {
      expect(AGENT_KEYS.AGENT_DATA("agent123")).toBe("agent:agent123:data");
      expect(AGENT_KEYS.AGENT_STATUS("agent123")).toBe("agent:agent123:status");
      expect(AGENT_KEYS.AGENT_ACTIVITY("agent123")).toBe("agent:agent123:activity");
      expect(AGENT_KEYS.AGENT_TOOL_STATS("agent123")).toBe("agent:agent123:tools");
      expect(AGENT_KEYS.USER_AGENTS("user123")).toBe("user:user123:agents");
      expect(AGENT_KEYS.AGENT_TASK_QUEUE("agent123")).toBe("agent:agent123:tasks");
      expect(AGENT_KEYS.SSE_AGENT_EVENTS("user123")).toBe("sse:agents:user123:events");
    });
  });

  describe("registerAgent", () => {
    it("stores agent data and sets status", async () => {
      const agentData = {
        agentId: "machine:session",
        userId: "user123",
        machineId: "machine",
        sessionId: "session",
        displayName: "Test Agent",
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      mockRedis.set.mockResolvedValue("OK");
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue("OK");
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.publish.mockResolvedValue(1);

      await registerAgent(agentData);

      // Should store agent data
      expect(mockRedis.set).toHaveBeenCalledWith(
        "agent:machine:session:data",
        expect.any(String),
      );

      // Should set status with TTL
      expect(mockRedis.set).toHaveBeenCalledWith(
        "agent:machine:session:status",
        "online",
        { ex: 90 },
      );

      // Should add to user's agent set
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        "user:user123:agents",
        "machine:session",
      );
    });
  });

  describe("processHeartbeat", () => {
    it("refreshes status TTL", async () => {
      mockRedis.set.mockResolvedValue("OK");

      await processHeartbeat("agent123", "online");

      expect(mockRedis.set).toHaveBeenCalledWith(
        "agent:agent123:status",
        "online",
        { ex: 90 },
      );
    });

    it("updates tool usage stats", async () => {
      mockRedis.set.mockResolvedValue("OK");
      mockRedis.hincrby.mockResolvedValue(5);

      await processHeartbeat("agent123", "online", {
        toolUsage: { Read: 3, Write: 2 },
      });

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        "agent:agent123:tools",
        "Read",
        3,
      );
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        "agent:agent123:tools",
        "Write",
        2,
      );
    });
  });

  describe("getAgentStatus", () => {
    it("returns status from Redis", async () => {
      mockRedis.get.mockResolvedValue("online");

      const status = await getAgentStatus("agent123");

      expect(status).toBe("online");
      expect(mockRedis.get).toHaveBeenCalledWith("agent:agent123:status");
    });

    it("returns offline when no status found", async () => {
      mockRedis.get.mockResolvedValue(null);

      const status = await getAgentStatus("agent123");

      expect(status).toBe("offline");
    });
  });

  describe("getAgentData", () => {
    it("returns parsed agent data", async () => {
      const data = {
        agentId: "agent123",
        userId: "user123",
        displayName: "Test",
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(data));

      const result = await getAgentData("agent123");

      expect(result).toEqual(data);
    });

    it("returns null when no data found", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getAgentData("agent123");

      expect(result).toBeNull();
    });
  });

  describe("logAgentActivity", () => {
    it("adds activity to list with TTL and trim", async () => {
      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue("OK");
      mockRedis.expire.mockResolvedValue(1);

      const activity = {
        type: "file_read",
        description: "Read config",
        timestamp: Date.now(),
      };

      await logAgentActivity("agent123", activity);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        "agent:agent123:activity",
        JSON.stringify(activity),
      );
      expect(mockRedis.ltrim).toHaveBeenCalledWith(
        "agent:agent123:activity",
        0,
        99,
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        "agent:agent123:activity",
        86400,
      );
    });
  });

  describe("getAgentActivity", () => {
    it("returns parsed activity log", async () => {
      const activities = [
        { type: "a", description: "First", timestamp: 1 },
        { type: "b", description: "Second", timestamp: 2 },
      ];
      mockRedis.lrange.mockResolvedValue(
        activities.map((a) => JSON.stringify(a)),
      );

      const result = await getAgentActivity("agent123", 10);

      expect(result).toEqual(activities);
      expect(mockRedis.lrange).toHaveBeenCalledWith(
        "agent:agent123:activity",
        0,
        9,
      );
    });
  });

  describe("getAgentToolStats", () => {
    it("returns parsed tool statistics", async () => {
      mockRedis.hgetall.mockResolvedValue({ Read: "5", Write: "3" });

      const result = await getAgentToolStats("agent123");

      expect(result).toEqual({ Read: 5, Write: 3 });
    });

    it("returns empty object when no stats", async () => {
      mockRedis.hgetall.mockResolvedValue(null);

      const result = await getAgentToolStats("agent123");

      expect(result).toEqual({});
    });
  });

  describe("getUserAgents", () => {
    it("returns agents with their status", async () => {
      const agentData = {
        agentId: "agent1",
        userId: "user123",
        displayName: "Agent 1",
      };

      mockRedis.smembers.mockResolvedValue(["agent1"]);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(agentData))
        .mockResolvedValueOnce("online");

      const result = await getUserAgents("user123");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        agentId: "agent1",
        status: "online",
      });
    });

    it("returns empty array when no agents", async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await getUserAgents("user123");

      expect(result).toEqual([]);
    });
  });

  describe("disconnectAgent", () => {
    it("removes status and logs activity", async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue("OK");
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.publish.mockResolvedValue(1);

      await disconnectAgent("agent123", "user123");

      expect(mockRedis.del).toHaveBeenCalledWith("agent:agent123:status");
    });
  });

  describe("removeAgent", () => {
    it("removes all agent keys from Redis", async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.srem.mockResolvedValue(1);

      await removeAgent("agent123", "user123");

      expect(mockRedis.del).toHaveBeenCalledWith("agent:agent123:data");
      expect(mockRedis.del).toHaveBeenCalledWith("agent:agent123:status");
      expect(mockRedis.del).toHaveBeenCalledWith("agent:agent123:activity");
      expect(mockRedis.del).toHaveBeenCalledWith("agent:agent123:tools");
      expect(mockRedis.del).toHaveBeenCalledWith("agent:agent123:tasks");
      expect(mockRedis.srem).toHaveBeenCalledWith("user:user123:agents", "agent123");
    });
  });

  describe("sendTaskToAgent", () => {
    it("adds task to queue with TTL", async () => {
      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const task = {
        id: "task123",
        prompt: "Do something",
        createdAt: Date.now(),
      };

      await sendTaskToAgent("agent123", task);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        "agent:agent123:tasks",
        expect.stringContaining("task123"),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        "agent:agent123:tasks",
        86400,
      );
    });
  });

  describe("getPendingTasks", () => {
    it("returns only pending tasks", async () => {
      const tasks = [
        { id: "1", prompt: "Task 1", status: "pending", createdAt: 1 },
        { id: "2", prompt: "Task 2", status: "completed", createdAt: 2 },
        { id: "3", prompt: "Task 3", status: "pending", createdAt: 3 },
      ];
      mockRedis.lrange.mockResolvedValue(tasks.map((t) => JSON.stringify(t)));

      const result = await getPendingTasks("agent123");

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.status === "pending")).toBe(true);
    });
  });

  describe("popTask", () => {
    it("removes and returns task from queue", async () => {
      const task = { id: "task123", prompt: "Do it", status: "pending" };
      mockRedis.rpop.mockResolvedValue(JSON.stringify(task));

      const result = await popTask("agent123");

      expect(result).toEqual(task);
      expect(mockRedis.rpop).toHaveBeenCalledWith("agent:agent123:tasks");
    });

    it("returns null when queue is empty", async () => {
      mockRedis.rpop.mockResolvedValue(null);

      const result = await popTask("agent123");

      expect(result).toBeNull();
    });
  });

  describe("publishAgentEvent", () => {
    it("publishes to channel and stores in list", async () => {
      mockRedis.publish.mockResolvedValue(1);
      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue("OK");

      const event = {
        type: "agent_connected" as const,
        agentId: "agent123",
        data: {},
        timestamp: Date.now(),
      };

      await publishAgentEvent("user123", event);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        "sse:agents:user123",
        expect.any(String),
      );
      expect(mockRedis.lpush).toHaveBeenCalled();
    });
  });

  describe("getAgentSSEEvents", () => {
    it("returns events after timestamp", async () => {
      const events = [
        { type: "a", timestamp: 1000 },
        { type: "b", timestamp: 2000 },
        { type: "c", timestamp: 3000 },
      ];
      mockRedis.lrange.mockResolvedValue(events.map((e) => JSON.stringify(e)));

      const result = await getAgentSSEEvents("user123", 1500);

      expect(result).toHaveLength(2);
      // Results are returned oldest first after reversing
      expect(result[0]?.timestamp).toBe(3000);
      expect(result[1]?.timestamp).toBe(2000);
    });
  });

  describe("isRedisAvailable", () => {
    it("returns true when ping succeeds", async () => {
      mockRedis.ping.mockResolvedValue("PONG");

      const result = await isRedisAvailable();

      expect(result).toBe(true);
    });

    it("returns false when ping fails", async () => {
      mockRedis.ping.mockRejectedValue(new Error("Connection failed"));

      const result = await isRedisAvailable();

      expect(result).toBe(false);
    });
  });
});
