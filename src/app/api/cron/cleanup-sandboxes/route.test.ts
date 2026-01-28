/**
 * Tests for Sandbox Cleanup Cron Route
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
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "job123" }),
    },
    appMessage: {
      create: vi.fn().mockResolvedValue({ id: "msg123" }),
    },
  },
}));

vi.mock("@/lib/sandbox/agent-sandbox", () => ({
  stopSandbox: vi.fn().mockResolvedValue(true),
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
import { stopSandbox } from "@/lib/sandbox/agent-sandbox";
import { setAgentWorking } from "@/lib/upstash/client";
import { GET } from "./route";

describe("GET /api/cron/cleanup-sandboxes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env["CRON_SECRET"] = "test-cron-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (headers: Record<string, string> = {}) => {
    return new NextRequest("http://localhost/api/cron/cleanup-sandboxes", {
      method: "GET",
      headers,
    });
  };

  describe("Authentication", () => {
    it("should return 401 when authorization header is missing in production", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when cron secret is incorrect in production", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const request = createRequest({
        authorization: "Bearer wrong-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should allow access with correct cron secret", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow access without auth in development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env["CRON_SECRET"];

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Cleanup Logic", () => {
    it("should return success when no stale jobs found", async () => {
      vi.mocked(prisma.sandboxJob.findMany).mockResolvedValue([]);

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("No stale jobs found");
      expect(data.processed).toBe(0);
    });

    it("should cleanup stale jobs and stop their sandboxes", async () => {
      const staleJobs: any[] = [
        {
          id: "job1",
          appId: "app1",
          sandboxId: "sbx_123",
          status: "RUNNING",
          app: { id: "app1", name: "Test App", userId: "user1" },
        },
        {
          id: "job2",
          appId: "app2",
          sandboxId: "sbx_456",
          status: "SPAWNING",
          app: { id: "app2", name: "Another App", userId: "user2" },
        },
      ];

      vi.mocked(prisma.sandboxJob.findMany).mockResolvedValue(staleJobs);

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(2);

      // Verify sandboxes were stopped
      expect(stopSandbox).toHaveBeenCalledWith("sbx_123");
      expect(stopSandbox).toHaveBeenCalledWith("sbx_456");

      // Verify jobs were updated to TIMEOUT
      expect(prisma.sandboxJob.update).toHaveBeenCalledWith({
        where: { id: "job1" },
        data: expect.objectContaining({
          status: "TIMEOUT",
          error: expect.stringContaining("timed out"),
        }),
      });

      // Verify system messages were created
      expect(prisma.appMessage.create).toHaveBeenCalledTimes(2);
      expect(prisma.appMessage.create).toHaveBeenCalledWith({
        data: {
          appId: "app1",
          role: "SYSTEM",
          content: expect.stringContaining("took too long"),
        },
      });

      // Verify agent working status was cleared
      expect(setAgentWorking).toHaveBeenCalledWith("app1", false);
      expect(setAgentWorking).toHaveBeenCalledWith("app2", false);
    });

    it("should broadcast status updates to connected clients", async () => {
      const staleJobs: any[] = [
        {
          id: "job1",
          appId: "app1",
          sandboxId: "sbx_123",
          status: "RUNNING",
          app: { id: "app1", name: "Test App", userId: "user1" },
        },
      ];

      vi.mocked(prisma.sandboxJob.findMany).mockResolvedValue(staleJobs);

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      await GET(request);

      // Verify error broadcast
      expect(broadcastToApp).toHaveBeenCalledWith("app1", {
        type: "status",
        data: {
          error: true,
          message: "Agent request timed out. Please try again.",
        },
      });

      // Verify agent_working broadcast
      expect(broadcastToApp).toHaveBeenCalledWith("app1", {
        type: "agent_working",
        data: { isWorking: false },
      });
    });

    it("should continue processing other jobs if one fails", async () => {
      const staleJobs: any[] = [
        {
          id: "job1",
          appId: "app1",
          sandboxId: "sbx_123",
          status: "RUNNING",
          app: { id: "app1", name: "Test App", userId: "user1" },
        },
        {
          id: "job2",
          appId: "app2",
          sandboxId: "sbx_456",
          status: "RUNNING",
          app: { id: "app2", name: "Another App", userId: "user2" },
        },
      ];

      vi.mocked(prisma.sandboxJob.findMany).mockResolvedValue(staleJobs);

      // First job update fails
      vi.mocked(prisma.sandboxJob.update)
        .mockRejectedValueOnce(new Error("Database error"))
        .mockResolvedValueOnce({ id: "job2" } as any);

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.errors).toBe(1);
    });

    it("should handle jobs without sandboxId", async () => {
      const staleJobs: any[] = [
        {
          id: "job1",
          appId: "app1",
          sandboxId: null, // No sandbox ID
          status: "PENDING",
          app: { id: "app1", name: "Test App", userId: "user1" },
        },
      ];

      vi.mocked(prisma.sandboxJob.findMany).mockResolvedValue(staleJobs);

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);

      // Should NOT attempt to stop a sandbox without ID
      expect(stopSandbox).not.toHaveBeenCalled();

      // Should still update job status
      expect(prisma.sandboxJob.update).toHaveBeenCalled();
    });
  });

  describe("Timeout Configuration", () => {
    it("should query for jobs older than the configured timeout", async () => {
      // Note: The SANDBOX_TIMEOUT_MINUTES env var is read at module load time,
      // so we can only test the query structure, not the exact time calculation
      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      await GET(request);

      // Verify findMany was called
      expect(prisma.sandboxJob.findMany).toHaveBeenCalled();

      const findManyCall = vi.mocked(prisma.sandboxJob.findMany).mock.calls[0];
      expect(findManyCall).toBeDefined();

      const whereClause = (findManyCall as any)?.[0]?.where;
      expect(whereClause).toBeDefined();

      // Verify the query structure is correct
      expect(whereClause.status).toEqual({
        in: ["PENDING", "SPAWNING", "RUNNING"],
      });
      expect(whereClause.startedAt).toBeDefined();
      expect(whereClause.startedAt.lt).toBeInstanceOf(Date);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      vi.mocked(prisma.sandboxJob.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createRequest({
        authorization: "Bearer test-cron-secret",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to query stale jobs");
    });
  });
});
