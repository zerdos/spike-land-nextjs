/**
 * Tests for Agent Sandbox Service
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module
vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    sandboxJob: {
      update: vi.fn(),
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

// Create a variable that will hold the mock (must be at top level before any vi.mock)
let mockSandboxInstance: ReturnType<typeof createMockSandbox>;

function createMockSandbox() {
  return {
    sandboxId: "sbx_test123",
    writeFiles: vi.fn().mockResolvedValue(undefined),
    runCommand: vi.fn().mockResolvedValue({
      exitCode: 0,
      cmdId: "cmd_test456",
      stdout: vi.fn().mockResolvedValue(""),
      stderr: vi.fn().mockResolvedValue(""),
    }),
    stop: vi.fn().mockResolvedValue(undefined),
    status: "running",
  };
}

// Mock the Vercel Sandbox SDK
vi.mock("@vercel/sandbox", () => ({
  Sandbox: {
    create: vi.fn().mockImplementation(() => {
      return Promise.resolve(mockSandboxInstance);
    }),
    get: vi.fn().mockImplementation(() => {
      return Promise.resolve(mockSandboxInstance);
    }),
  },
}));

// Now import the functions after mocking
import prisma from "@/lib/prisma";
import { Sandbox } from "@vercel/sandbox";
import { getSandboxStatus, spawnAgentSandbox, stopSandbox } from "./agent-sandbox";

describe("Agent Sandbox Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh mock sandbox for each test
    mockSandboxInstance = createMockSandbox();
    process.env = { ...originalEnv };
    // Set required env vars for tests
    process.env["SANDBOX_CALLBACK_SECRET"] = "test-callback-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("spawnAgentSandbox", () => {
    it("should return error when SANDBOX_CALLBACK_SECRET is not configured", async () => {
      delete process.env["SANDBOX_CALLBACK_SECRET"];

      const result = await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sandbox callback secret not configured");
    });

    it("should successfully spawn a sandbox with correct configuration", async () => {
      const result = await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      expect(result.success).toBe(true);
      expect(result.sandboxId).toBe("sbx_test123");

      // Verify Sandbox.create was called with correct config
      expect(Sandbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: "node24",
          resources: { vcpus: 2 },
        }),
      );

      // Verify files were written to sandbox
      expect(mockSandboxInstance.writeFiles).toHaveBeenCalledWith([
        expect.objectContaining({ path: "context.json" }),
        expect.objectContaining({ path: "agent-executor.js" }),
      ]);

      // Verify npm install was run
      expect(mockSandboxInstance.runCommand).toHaveBeenCalledWith("npm", [
        "install",
        "@anthropic-ai/claude-agent-sdk",
      ]);
    });

    it("should update job status to SPAWNING then RUNNING", async () => {
      await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      // First call should set status to SPAWNING
      expect(prisma.sandboxJob.update).toHaveBeenCalledWith({
        where: { id: "job789" },
        data: { status: "SPAWNING" },
      });

      // Second call should set status to RUNNING with sandboxId
      expect(prisma.sandboxJob.update).toHaveBeenCalledWith({
        where: { id: "job789" },
        data: {
          sandboxId: "sbx_test123",
          status: "RUNNING",
        },
      });
    });

    it("should include ANTHROPIC_API_KEY in agent environment", async () => {
      process.env["ANTHROPIC_API_KEY"] = "test-api-key";

      await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      // Verify node command was run with env vars
      expect(mockSandboxInstance.runCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          cmd: "node",
          args: ["agent-executor.js"],
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: "test-api-key",
          }),
          detached: true,
        }),
      );
    });

    it("should handle sandbox creation failure", async () => {
      vi.mocked(Sandbox.create).mockRejectedValueOnce(
        new Error("Sandbox quota exceeded"),
      );

      const result = await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sandbox quota exceeded");

      // Verify job was marked as FAILED
      expect(prisma.sandboxJob.update).toHaveBeenCalledWith({
        where: { id: "job789" },
        data: expect.objectContaining({
          status: "FAILED",
          error: "Sandbox quota exceeded",
        }),
      });
    });

    it("should handle npm install failure", async () => {
      mockSandboxInstance.runCommand.mockResolvedValueOnce({
        exitCode: 1,
        cmdId: "cmd_fail",
        stdout: vi.fn().mockResolvedValue(""),
        stderr: vi.fn().mockResolvedValue("npm ERR! network error"),
      });

      const result = await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("npm install failed");
    });

    it("should generate correct callback URL based on environment", async () => {
      // Test with VERCEL_URL set
      process.env["VERCEL_URL"] = "my-app.vercel.app";

      await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      // Verify context.json contains correct callback URL
      const writeFilesCall = mockSandboxInstance.writeFiles.mock.calls[0];
      expect(writeFilesCall).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contextFile = (writeFilesCall as any)[0].find(
        (f: { path: string; }) => f.path === "context.json",
      );
      const context = JSON.parse(contextFile.content.toString());

      expect(context.callbackUrl).toBe(
        "https://my-app.vercel.app/api/agent/sandbox/callback",
      );
    });

    it("should write correct context to sandbox", async () => {
      await spawnAgentSandbox(
        "app123",
        "msg456",
        "job789",
        "codespace-abc",
        "Hello, agent!",
      );

      const writeFilesCall = mockSandboxInstance.writeFiles.mock.calls[0];
      expect(writeFilesCall).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contextFile = (writeFilesCall as any)[0].find(
        (f: { path: string; }) => f.path === "context.json",
      );
      const context = JSON.parse(contextFile.content.toString());

      expect(context).toEqual(
        expect.objectContaining({
          appId: "app123",
          messageId: "msg456",
          jobId: "job789",
          codespaceId: "codespace-abc",
          userMessage: "Hello, agent!",
          callbackSecret: "test-callback-secret",
        }),
      );
    });
  });

  describe("getSandboxStatus", () => {
    it("should return sandbox status", async () => {
      const status = await getSandboxStatus("sbx_test123");

      expect(status).toBe("running");
      expect(Sandbox.get).toHaveBeenCalledWith({ sandboxId: "sbx_test123" });
    });

    it("should return null if sandbox not found", async () => {
      vi.mocked(Sandbox.get).mockRejectedValueOnce(new Error("Not found"));

      const status = await getSandboxStatus("sbx_invalid");

      expect(status).toBeNull();
    });
  });

  describe("stopSandbox", () => {
    it("should stop sandbox successfully", async () => {
      const result = await stopSandbox("sbx_test123");

      expect(result).toBe(true);
      expect(Sandbox.get).toHaveBeenCalledWith({ sandboxId: "sbx_test123" });
      expect(mockSandboxInstance.stop).toHaveBeenCalled();
    });

    it("should return false if sandbox stop fails", async () => {
      vi.mocked(Sandbox.get).mockRejectedValueOnce(new Error("Not found"));

      const result = await stopSandbox("sbx_invalid");

      expect(result).toBe(false);
    });
  });
});
