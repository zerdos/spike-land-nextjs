import { authenticateMcpRequest } from "@/lib/mcp/auth";
import type { AgentTask, Box } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    agentTask: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    box: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpRequest: vi.fn(),
}));

const prisma = (await import("@/lib/prisma")).default;

describe("GET /api/v1/agent/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if authentication fails", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: false,
      error: "Invalid API key",
    });

    const request = new NextRequest(
      "http://localhost/api/v1/agent/tasks?boxId=box-1",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid API key");
  });

  it("should return 400 if boxId is missing", async () => {
    // Auth must pass first
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing boxId");
  });

  it("should return 404 if box not found", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.box.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/v1/agent/tasks?boxId=box-1",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Box not found");
  });

  it("should return 403 if user does not own the box", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-1",
      userId: "user-2",
    } as Box);

    const request = new NextRequest(
      "http://localhost/api/v1/agent/tasks?boxId=box-1",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized access to box");
  });

  it("should return pending tasks for a given boxId when authorized", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-1",
      userId: "user-1",
    } as Box);

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

  it("should handle server errors", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.box.findUnique).mockResolvedValue({
      id: "box-1",
      userId: "user-1",
    } as Box);

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

  it("should return 401 if authentication fails", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: false,
      error: "Invalid API key",
    });

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
        status: "COMPLETED",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid API key");
  });

  it("should return 404 if task not found", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.agentTask.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
        status: "COMPLETED",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Task not found");
  });

  it("should return 403 if user does not own the task's box", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.agentTask.findUnique).mockResolvedValue({
      id: "task-1",
      box: { userId: "user-2" },
    } as any);

    const request = new NextRequest("http://localhost/api/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: "task-1",
        status: "COMPLETED",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized access to task");
  });

  it("should update task status to COMPLETED when authorized", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.agentTask.findUnique).mockResolvedValue({
      id: "task-1",
      box: { userId: "user-1" },
    } as any);

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
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.agentTask.findUnique).mockResolvedValue({
      id: "task-2",
      box: { userId: "user-1" },
    } as any);

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

  it("should return 400 for missing taskId", async () => {
    // Auth success needed first
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

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

  it("should handle server errors during update", async () => {
    vi.mocked(authenticateMcpRequest).mockResolvedValue({
      success: true,
      userId: "user-1",
    });

    vi.mocked(prisma.agentTask.findUnique).mockResolvedValue({
      id: "task-1",
      box: { userId: "user-1" },
    } as any);

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
});
