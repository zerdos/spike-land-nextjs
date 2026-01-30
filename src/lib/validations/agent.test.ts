import { describe, expect, it } from "vitest";
import {
  agentConnectSchema,
  agentHeartbeatSchema,
  agentListQuerySchema,
  agentUpdateSchema,
  generateAgentId,
  parseAgentId,
  sendTaskSchema,
  validateAgentConnect,
  validateAgentHeartbeat,
  validateSendTask,
} from "./agent";

describe("Agent Validation Schemas", () => {
  describe("agentConnectSchema", () => {
    it("accepts valid connect request", () => {
      const result = agentConnectSchema.safeParse({
        machineId: "machine123456",
        sessionId: "session123456",
        displayName: "My Agent",
        projectPath: "/path/to/project",
        workingDirectory: "/home/user",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal connect request", () => {
      const result = agentConnectSchema.safeParse({
        machineId: "machine12",
        sessionId: "session12",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short machineId", () => {
      const result = agentConnectSchema.safeParse({
        machineId: "short",
        sessionId: "session123456",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short sessionId", () => {
      const result = agentConnectSchema.safeParse({
        machineId: "machine123456",
        sessionId: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects too long machineId", () => {
      const result = agentConnectSchema.safeParse({
        machineId: "a".repeat(65),
        sessionId: "session123456",
      });
      expect(result.success).toBe(false);
    });

    it("rejects too long displayName", () => {
      const result = agentConnectSchema.safeParse({
        machineId: "machine123456",
        sessionId: "session123456",
        displayName: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("agentHeartbeatSchema", () => {
    it("accepts valid heartbeat request", () => {
      const result = agentHeartbeatSchema.safeParse({
        machineId: "machine123",
        sessionId: "session123",
        status: "online",
        currentProject: "/path/to/project",
        toolUsage: { Read: 5, Write: 3 },
        tokensUsed: 1500,
        activity: {
          type: "file_read",
          description: "Read config file",
          metadata: { file: "config.json" },
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal heartbeat request", () => {
      const result = agentHeartbeatSchema.safeParse({
        machineId: "machine123",
        sessionId: "session123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("online"); // default
      }
    });

    it("rejects invalid status", () => {
      const result = agentHeartbeatSchema.safeParse({
        machineId: "machine123",
        sessionId: "session123",
        status: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative tokensUsed", () => {
      const result = agentHeartbeatSchema.safeParse({
        machineId: "machine123",
        sessionId: "session123",
        tokensUsed: -100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects activity without type", () => {
      const result = agentHeartbeatSchema.safeParse({
        machineId: "machine123",
        sessionId: "session123",
        activity: {
          description: "Some activity",
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("agentUpdateSchema", () => {
    it("accepts valid update request", () => {
      const result = agentUpdateSchema.safeParse({
        displayName: "New Name",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty displayName", () => {
      const result = agentUpdateSchema.safeParse({
        displayName: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects too long displayName", () => {
      const result = agentUpdateSchema.safeParse({
        displayName: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty object", () => {
      const result = agentUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("sendTaskSchema", () => {
    it("accepts valid task request", () => {
      const result = sendTaskSchema.safeParse({
        prompt: "Fix the authentication bug",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty prompt", () => {
      const result = sendTaskSchema.safeParse({
        prompt: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects too long prompt", () => {
      const result = sendTaskSchema.safeParse({
        prompt: "a".repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("agentListQuerySchema", () => {
    it("accepts valid query parameters", () => {
      const result = agentListQuerySchema.safeParse({
        status: "online",
        limit: 20,
        offset: 10,
      });
      expect(result.success).toBe(true);
    });

    it("applies defaults for missing parameters", () => {
      const result = agentListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("all");
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it("rejects invalid status", () => {
      const result = agentListQuerySchema.safeParse({
        status: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("coerces string limit to number", () => {
      const result = agentListQuerySchema.safeParse({
        limit: "25",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it("rejects limit above maximum", () => {
      const result = agentListQuerySchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Validation Helper Functions", () => {
  describe("validateAgentConnect", () => {
    it("returns success for valid data", () => {
      const result = validateAgentConnect({
        machineId: "machine123456",
        sessionId: "session123456",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.machineId).toBe("machine123456");
      }
    });

    it("returns error for invalid data", () => {
      const result = validateAgentConnect({
        machineId: "short",
        sessionId: "session123456",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("machineId");
      }
    });
  });

  describe("validateAgentHeartbeat", () => {
    it("returns success for valid data", () => {
      const result = validateAgentHeartbeat({
        machineId: "machine123",
        sessionId: "session123",
      });
      expect(result.success).toBe(true);
    });

    it("returns error for missing required fields", () => {
      const result = validateAgentHeartbeat({
        machineId: "machine123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validateSendTask", () => {
    it("returns success for valid data", () => {
      const result = validateSendTask({
        prompt: "Do something",
      });
      expect(result.success).toBe(true);
    });

    it("returns error for empty prompt", () => {
      const result = validateSendTask({
        prompt: "",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Agent ID Utilities", () => {
  describe("generateAgentId", () => {
    it("combines machineId and sessionId with colon", () => {
      const agentId = generateAgentId("machine123", "session456");
      expect(agentId).toBe("machine123:session456");
    });

    it("handles special characters", () => {
      const agentId = generateAgentId("machine-123", "session_456");
      expect(agentId).toBe("machine-123:session_456");
    });
  });

  describe("parseAgentId", () => {
    it("parses valid agent ID", () => {
      const result = parseAgentId("machine123:session456");
      expect(result).toEqual({
        machineId: "machine123",
        sessionId: "session456",
      });
    });

    it("returns null for invalid agent ID without colon", () => {
      const result = parseAgentId("invalid");
      expect(result).toBeNull();
    });

    it("returns null for empty parts", () => {
      const result = parseAgentId(":session");
      expect(result).toBeNull();
    });

    it("returns null for multiple colons (only takes first two parts)", () => {
      const result = parseAgentId("a:b:c");
      expect(result).toBeNull();
    });
  });
});
