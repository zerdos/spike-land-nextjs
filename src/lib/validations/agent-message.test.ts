import { describe, expect, it } from "vitest";
import {
  agentMessageSchema,
  connectionRequestSchema,
  messageListQuerySchema,
  validateAgentMessage,
  validateConnectionRequest,
} from "./agent";

describe("connectionRequestSchema", () => {
  it("should validate a valid connection request", () => {
    const input = {
      machineId: "abc12345678",
      sessionId: "xyz98765432",
      displayName: "Test Agent",
      projectPath: "/home/user/project",
    };

    const result = connectionRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.machineId).toBe(input.machineId);
      expect(result.data.sessionId).toBe(input.sessionId);
      expect(result.data.displayName).toBe(input.displayName);
      expect(result.data.projectPath).toBe(input.projectPath);
    }
  });

  it("should accept request without optional fields", () => {
    const input = {
      machineId: "abc12345678",
      sessionId: "xyz98765432",
    };

    const result = connectionRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeUndefined();
      expect(result.data.projectPath).toBeUndefined();
    }
  });

  it("should reject machineId that is too short", () => {
    const input = {
      machineId: "abc",
      sessionId: "xyz98765432",
    };

    const result = connectionRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject machineId that is too long", () => {
    const input = {
      machineId: "a".repeat(65),
      sessionId: "xyz98765432",
    };

    const result = connectionRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("validateConnectionRequest", () => {
  it("should return success for valid input", () => {
    const result = validateConnectionRequest({
      machineId: "abc12345678",
      sessionId: "xyz98765432",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.machineId).toBe("abc12345678");
    }
  });

  it("should return error for invalid input", () => {
    const result = validateConnectionRequest({
      machineId: "abc", // too short
      sessionId: "xyz98765432",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("machineId");
    }
  });
});

describe("agentMessageSchema", () => {
  it("should validate a valid message", () => {
    const input = {
      content: "Hello, agent!",
      role: "USER" as const,
    };

    const result = agentMessageSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe(input.content);
      expect(result.data.role).toBe("USER");
    }
  });

  it("should default role to USER", () => {
    const input = {
      content: "Hello, agent!",
    };

    const result = agentMessageSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("USER");
    }
  });

  it("should reject empty content", () => {
    const input = {
      content: "",
    };

    const result = agentMessageSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject content that is too long", () => {
    const input = {
      content: "a".repeat(10001),
    };

    const result = agentMessageSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept all valid roles", () => {
    const roles = ["USER", "AGENT", "SYSTEM"] as const;

    for (const role of roles) {
      const result = agentMessageSchema.safeParse({
        content: "Test message",
        role,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe(role);
      }
    }
  });
});

describe("validateAgentMessage", () => {
  it("should return success for valid input", () => {
    const result = validateAgentMessage({
      content: "Test message",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Test message");
    }
  });

  it("should return error for empty content", () => {
    const result = validateAgentMessage({
      content: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("content");
    }
  });
});

describe("messageListQuerySchema", () => {
  it("should parse valid query params", () => {
    const input = {
      limit: "25",
      offset: "10",
      unreadOnly: "true",
    };

    const result = messageListQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(10);
      expect(result.data.unreadOnly).toBe(true);
    }
  });

  it("should use defaults for missing params", () => {
    const result = messageListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
      expect(result.data.unreadOnly).toBe(false);
    }
  });

  it("should reject limit over 100", () => {
    const result = messageListQuerySchema.safeParse({
      limit: "150",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative offset", () => {
    const result = messageListQuerySchema.safeParse({
      offset: "-5",
    });
    expect(result.success).toBe(false);
  });
});
