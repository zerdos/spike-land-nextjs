import type { AgentTask } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    agentTask: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/v1/agent/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if boxId is missing", async () => {
    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing boxId");
  });

  it("should return pending tasks for a given boxId", async () => {
    const mockTasks: Partial<AgentTask>[] = [
      {
        id: "task-1",
        boxId: "box-1",
        type: "EXECUTE_COMMAND",
        payload: { command: "ls" },
        status: "PENDING",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "task-2",
        boxId: "box-1",
        type: "EXECUTE_COMMAND",
        payload: { command: "pwd" },
        status: "PENDING",
        createdAt: new Date("2025-01-01T00:01:00Z"),
      },
    ];

    vi.mocked(prisma.agentTask.findMany).mockResolvedValue(
      mockTasks as AgentTask[],
    );

    const request = new NextRequest(
      "http://localhost/api/v1/agent/tasks?boxId=box-1",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].id).toBe("task-1");
    expect(data.tasks[1].id).toBe("task-2");
    expect(prisma.agentTask.findMany).toHaveBeenCalledWith({
      where: {
        boxId: "box-1",
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  });

  it("should return empty array when no pending tasks", async () => {
    vi.mocked(prisma.agentTask.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/v1/agent/tasks?boxId=box-2",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toEqual([]);
  });

  it("should handle server errors", async () => {
    vi.mocked(prisma.agentTask.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const request = new NextRequest(
      "http://localhost/api/v1/agent/tasks?boxId=box-1",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal Server Error");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch agent tasks:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("POST /api/v1/agent/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update task status to COMPLETED", async () => {
    const mockUpdatedTask: Partial<AgentTask> = {
      id: "task-1",
      boxId: "box-1",
      type: "EXECUTE_COMMAND",
      payload: { command: "ls" },
      status: "COMPLETED",
      result: { output: "file1.txt" },
    };

    vi.mocked(prisma.agentTask.update).mockResolvedValue(
      mockUpdatedTask as AgentTask,
    );

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
        status: "COMPLETED",
        result: { output: "file1.txt" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.task.status).toBe("COMPLETED");
    expect(prisma.agentTask.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: {
        status: "COMPLETED",
        result: { output: "file1.txt" },
        error: undefined,
      },
    });
  });

  it("should update task status to FAILED with error message", async () => {
    const mockUpdatedTask: Partial<AgentTask> = {
      id: "task-2",
      boxId: "box-1",
      type: "EXECUTE_COMMAND",
      payload: { command: "invalid" },
      status: "FAILED",
      error: "Command not found",
    };

    vi.mocked(prisma.agentTask.update).mockResolvedValue(
      mockUpdatedTask as AgentTask,
    );

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-2",
        status: "FAILED",
        error: "Command not found",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.task.status).toBe("FAILED");
    expect(prisma.agentTask.update).toHaveBeenCalledWith({
      where: { id: "task-2" },
      data: {
        status: "FAILED",
        result: undefined,
        error: "Command not found",
      },
    });
  });

  it("should update task status to PROCESSING", async () => {
    const mockUpdatedTask: Partial<AgentTask> = {
      id: "task-3",
      boxId: "box-1",
      type: "EXECUTE_COMMAND",
      payload: { command: "long-running-cmd" },
      status: "PROCESSING",
    };

    vi.mocked(prisma.agentTask.update).mockResolvedValue(
      mockUpdatedTask as AgentTask,
    );

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-3",
        status: "PROCESSING",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.task.status).toBe("PROCESSING");
    expect(prisma.agentTask.update).toHaveBeenCalledWith({
      where: { id: "task-3" },
      data: {
        status: "PROCESSING",
        result: undefined,
        error: undefined,
      },
    });
  });

  it("should return 400 for missing taskId", async () => {
    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        status: "COMPLETED",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for missing status", async () => {
    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for invalid status value", async () => {
    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
        status: "INVALID_STATUS",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(data.details).toBeDefined();
  });

  it("should handle server errors during update", async () => {
    vi.mocked(prisma.agentTask.update).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
        status: "COMPLETED",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal Server Error");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to update agent task:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle task not found error", async () => {
    vi.mocked(prisma.agentTask.update).mockRejectedValue(
      new Error("Record to update not found"),
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "non-existent-task",
        status: "COMPLETED",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal Server Error");

    consoleErrorSpy.mockRestore();
  });
});
