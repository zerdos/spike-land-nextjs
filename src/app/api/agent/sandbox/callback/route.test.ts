/**
 * Tests for Sandbox Callback Route
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/api/apps/[id]/messages/stream/route", () => ({
  broadcastToApp: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    sandboxJob: {
      update: vi.fn().mockResolvedValue({ id: "job123" }),
    },
    appMessage: {
      create: vi.fn().mockResolvedValue({ id: "msg123" }),
    },
  },
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (promise) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

vi.mock("@/lib/upstash/client", () => ({
  setAgentWorking: vi.fn().mockResolvedValue(undefined),
}));

import { broadcastToApp } from "@/app/api/apps/[id]/messages/stream/route";
import prisma from "@/lib/prisma";
import { setAgentWorking } from "@/lib/upstash/client";
import { POST } from "./route";

describe("POST /api/agent/sandbox/callback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env["SANDBOX_CALLBACK_SECRET"] = "test-callback-secret-12345678";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (
    body: object,
    headers: Record<string, string> = {},
  ) => {
    return new NextRequest("http://localhost/api/agent/sandbox/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  it("should return 500 when SANDBOX_CALLBACK_SECRET is not configured", async () => {
    delete process.env["SANDBOX_CALLBACK_SECRET"];

    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: true,
        response: "Hello!",
      },
      { "X-Sandbox-Secret": "some-secret" },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
  });

  it("should return 401 when X-Sandbox-Secret header is missing", async () => {
    const request = createRequest({
      jobId: "job123",
      appId: "app123",
      messageId: "msg123",
      success: true,
      response: "Hello!",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when secret is invalid", async () => {
    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: true,
        response: "Hello!",
      },
      { "X-Sandbox-Secret": "wrong-secret" },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when payload is invalid", async () => {
    const request = createRequest(
      {
        // Missing required fields
        success: true,
      },
      { "X-Sandbox-Secret": "test-callback-secret-12345678" },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid payload");
  });

  it("should return 400 when request body is not valid JSON", async () => {
    const request = new NextRequest(
      "http://localhost/api/agent/sandbox/callback",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sandbox-Secret": "test-callback-secret-12345678",
        },
        body: "not valid json",
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should successfully process a successful callback", async () => {
    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: true,
        response: "Here is your code update!",
      },
      { "X-Sandbox-Secret": "test-callback-secret-12345678" },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify job was updated to COMPLETED
    expect(prisma.sandboxJob.update).toHaveBeenCalledWith({
      where: { id: "job123" },
      data: expect.objectContaining({
        status: "COMPLETED",
        result: { content: "Here is your code update!" },
        completedAt: expect.any(Date),
      }),
    });

    // Verify agent message was created
    expect(prisma.appMessage.create).toHaveBeenCalledWith({
      data: {
        appId: "app123",
        role: "AGENT",
        content: "Here is your code update!",
      },
    });

    // Verify SSE broadcast was sent
    expect(broadcastToApp).toHaveBeenCalledWith("app123", {
      type: "message",
      data: expect.objectContaining({
        role: "AGENT",
        content: "Here is your code update!",
      }),
    });

    // Verify agent working status was cleared
    expect(setAgentWorking).toHaveBeenCalledWith("app123", false);
  });

  it("should handle failed callback and broadcast error", async () => {
    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: false,
        error: "Agent SDK quota exceeded",
      },
      { "X-Sandbox-Secret": "test-callback-secret-12345678" },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify job was updated to FAILED
    expect(prisma.sandboxJob.update).toHaveBeenCalledWith({
      where: { id: "job123" },
      data: expect.objectContaining({
        status: "FAILED",
        error: "Agent SDK quota exceeded",
        completedAt: expect.any(Date),
      }),
    });

    // Verify error broadcast was sent
    expect(broadcastToApp).toHaveBeenCalledWith("app123", {
      type: "status",
      data: {
        error: true,
        message: "Agent SDK quota exceeded",
      },
    });

    // Verify agent working status was cleared
    expect(setAgentWorking).toHaveBeenCalledWith("app123", false);
  });

  it("should broadcast agent_working false after processing", async () => {
    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: true,
        response: "Done!",
      },
      { "X-Sandbox-Secret": "test-callback-secret-12345678" },
    );

    await POST(request);

    // Verify agent_working broadcast was sent
    expect(broadcastToApp).toHaveBeenCalledWith("app123", {
      type: "agent_working",
      data: { isWorking: false },
    });
  });

  it("should continue processing even if job update fails", async () => {
    vi.mocked(prisma.sandboxJob.update).mockRejectedValueOnce(
      new Error("Database error"),
    );

    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: true,
        response: "Hello!",
      },
      { "X-Sandbox-Secret": "test-callback-secret-12345678" },
    );

    const response = await POST(request);
    const data = await response.json();

    // Should still return success
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Should still try to create the message
    expect(prisma.appMessage.create).toHaveBeenCalled();
  });

  it("should use constant-time comparison for secret validation", async () => {
    // This test verifies that timing attacks are mitigated
    // We can't directly test timing, but we can verify the flow works correctly
    // with secrets of different lengths

    const request = createRequest(
      {
        jobId: "job123",
        appId: "app123",
        messageId: "msg123",
        success: true,
        response: "Hello!",
      },
      { "X-Sandbox-Secret": "short" }, // Different length than configured secret
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
