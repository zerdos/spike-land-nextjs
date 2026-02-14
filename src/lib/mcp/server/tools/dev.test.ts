import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock node:fs
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockAppendFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const mocked = {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    appendFileSync: (...args: unknown[]) => mockAppendFileSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  };
  return { ...mocked, default: mocked };
});

// Mock node:child_process
const mockExecSync = vi.fn();
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  const mocked = {
    ...actual,
    execSync: (...args: unknown[]) => mockExecSync(...args),
  };
  return { ...mocked, default: mocked };
});

import type { ToolRegistry } from "../tool-registry";
import { registerDevTools } from "./dev";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => {
      handlers.set(def.name, def.handler);
    }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

function isError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true;
}

describe("dev tools", () => {
  const userId = "test-user";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerDevTools(registry, userId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should register 5 dev tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("dev_logs")).toBe(true);
    expect(registry.handlers.has("dev_status")).toBe(true);
    expect(registry.handlers.has("github_status")).toBe(true);
    expect(registry.handlers.has("file_guard")).toBe(true);
    expect(registry.handlers.has("notify_agent")).toBe(true);
  });

  it("should register all tools as alwaysEnabled in dev category", () => {
    const mockRegister = registry.register as ReturnType<typeof vi.fn>;
    for (const call of mockRegister.mock.calls) {
      const def = call[0] as { category: string; tier: string; alwaysEnabled: boolean };
      expect(def.category).toBe("dev");
      expect(def.tier).toBe("free");
      expect(def.alwaysEnabled).toBe(true);
    }
  });

  // ── dev_logs ──────────────────────────────────────────────────

  describe("dev_logs", () => {
    it("should return error when log file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);
      const handler = registry.handlers.get("dev_logs")!;
      const result = await handler({});
      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("No dev logs found");
    });

    it("should return last 100 lines by default", async () => {
      mockExistsSync.mockReturnValue(true);
      const logLines = Array.from({ length: 150 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(logLines.join("\n"));

      const handler = registry.handlers.get("dev_logs")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("line 51");
      expect(text).toContain("line 150");
      expect(text).not.toContain("line 1\n");
    });

    it("should respect custom line count", async () => {
      mockExistsSync.mockReturnValue(true);
      const logLines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(logLines.join("\n"));

      const handler = registry.handlers.get("dev_logs")!;
      const result = await handler({ lines: 5 });
      const text = getText(result);
      expect(text).toContain("line 46");
      expect(text).toContain("line 50");
    });

    it("should filter lines by search term (case-insensitive)", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("INFO: server started\nERROR: connection failed\nINFO: request received");

      const handler = registry.handlers.get("dev_logs")!;
      const result = await handler({ search: "error" });
      const text = getText(result);
      expect(text).toContain("ERROR: connection failed");
      expect(text).not.toContain("server started");
    });

    it("should return placeholder when no lines match", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("some log line");

      const handler = registry.handlers.get("dev_logs")!;
      const result = await handler({ search: "nonexistent" });
      const text = getText(result);
      expect(text).toBe("(no matching log lines)");
    });
  });

  // ── dev_status ────────────────────────────────────────────────

  describe("dev_status", () => {
    it("should return error when meta file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);
      const handler = registry.handlers.get("dev_status")!;
      const result = await handler({});
      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("No dev server metadata found");
    });

    it("should return status with running process", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          pid: process.pid, // Use current PID so kill(pid, 0) succeeds
          startTime: new Date(Date.now() - 60_000).toISOString(),
          port: 3000,
          commitHash: "abc1234",
        }),
      );

      const handler = registry.handlers.get("dev_status")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("**Running:** yes");
      expect(text).toContain("**Port:** 3000");
      expect(text).toContain("abc1234");
    });

    it("should report stopped when process is not running", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          pid: 999999999, // Non-existent PID
          startTime: new Date().toISOString(),
          port: 3000,
          commitHash: "abc1234",
        }),
      );

      const handler = registry.handlers.get("dev_status")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("**Running:** no");
      expect(text).toContain("stopped");
    });
  });

  // ── github_status ─────────────────────────────────────────────

  describe("github_status", () => {
    it("should return git info from exec calls", async () => {
      mockExecSync
        .mockReturnValueOnce("main\n")       // branch
        .mockReturnValueOnce("abc1234\n")     // short commit
        .mockReturnValueOnce("abc1234567890\n") // full commit
        .mockReturnValueOnce("abc1234 latest commit\n") // log
        .mockReturnValueOnce("")              // porcelain (clean)
        .mockReturnValueOnce("completed:success\n") // CI status
        .mockReturnValueOnce('#1 My PR (feature-branch)\n'); // PRs

      const handler = registry.handlers.get("github_status")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("**Branch:** main");
      expect(text).toContain("**Commit:** abc1234");
      expect(text).toContain("**Dirty:** no");
    });

    it("should handle exec failures gracefully", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("git not found");
      });

      const handler = registry.handlers.get("github_status")!;
      const result = await handler({});
      const text = getText(result);
      // Should still return structured output (safeExec returns "" on failure)
      expect(text).toContain("Git & CI Status");
      expect(text).toContain("**Branch:**");
    });
  });

  // ── file_guard ────────────────────────────────────────────────

  describe("file_guard", () => {
    it("should return PASS when vitest succeeds", async () => {
      mockExecSync.mockReturnValue("Tests passed\n 5 passed\n");

      const handler = registry.handlers.get("file_guard")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("File Guard: PASS");
      expect(isError(result)).toBe(false);
    });

    it("should return FAIL when vitest fails", async () => {
      const err = new Error("Tests failed") as Error & { stdout?: string };
      err.stdout = "FAIL src/test.ts\n Expected true, got false";
      mockExecSync.mockImplementation(() => {
        throw err;
      });

      const handler = registry.handlers.get("file_guard")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("File Guard: FAIL");
      expect(isError(result)).toBe(true);
    });

    it("should use HEAD~1 as default base", async () => {
      mockExecSync.mockReturnValue("Tests passed\n");

      const handler = registry.handlers.get("file_guard")!;
      await handler({});
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("--changed HEAD~1"),
        expect.objectContaining({ timeout: 120_000 }),
      );
    });

    it("should accept a custom commit hash", async () => {
      mockExecSync.mockReturnValue("Tests passed\n");

      const handler = registry.handlers.get("file_guard")!;
      await handler({ commit_hash: "abc123" });
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("--changed abc123"),
        expect.objectContaining({ timeout: 120_000 }),
      );
    });

    it("should reject invalid commit hash to prevent command injection", async () => {
      const handler = registry.handlers.get("file_guard")!;
      const result = await handler({ commit_hash: "HEAD; rm -rf /" });
      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("Invalid commit hash format");
    });

    it("should reject commit hash with backticks", async () => {
      const handler = registry.handlers.get("file_guard")!;
      const result = await handler({ commit_hash: "`whoami`" });
      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("Invalid commit hash format");
    });

    it("should reject commit hash with $() subshell", async () => {
      const handler = registry.handlers.get("file_guard")!;
      const result = await handler({ commit_hash: "$(whoami)" });
      expect(isError(result)).toBe(true);
      expect(getText(result)).toContain("Invalid commit hash format");
    });

    it("should accept valid branch-like refs", async () => {
      mockExecSync.mockReturnValue("Tests passed\n");

      const handler = registry.handlers.get("file_guard")!;
      await handler({ commit_hash: "feature/my-branch" });
      expect(mockExecSync).toHaveBeenCalled();
    });
  });

  // ── notify_agent ──────────────────────────────────────────────

  describe("notify_agent", () => {
    it("should create notification and write to files", async () => {
      mockExistsSync.mockReturnValue(false); // No existing notifications

      const handler = registry.handlers.get("notify_agent")!;
      const result = await handler({
        event: "test_failure",
        message: "Tests failed in auth module",
        severity: "error",
      });

      const text = getText(result);
      expect(text).toContain("test_failure");
      expect(text).toContain("Tests failed in auth module");
      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockAppendFileSync).toHaveBeenCalled();
    });

    it("should append to existing notifications", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify([{ timestamp: "old", event: "old", message: "old", severity: "info" }]),
      );

      const handler = registry.handlers.get("notify_agent")!;
      await handler({ event: "new_event", message: "new message" });

      const writeCall = mockWriteFileSync.mock.calls[0];
      const written = JSON.parse(writeCall?.[1] as string) as unknown[];
      expect(written).toHaveLength(2);
    });

    it("should cap notifications at 50", async () => {
      mockExistsSync.mockReturnValue(true);
      const existing = Array.from({ length: 55 }, (_, i) => ({
        timestamp: `t${i}`,
        event: `e${i}`,
        message: `m${i}`,
        severity: "info",
      }));
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      const handler = registry.handlers.get("notify_agent")!;
      await handler({ event: "overflow", message: "cap test" });

      const capCall = mockWriteFileSync.mock.calls[0];
      const written = JSON.parse(capCall?.[1] as string) as unknown[];
      expect(written.length).toBeLessThanOrEqual(50);
    });

    it("should default severity to info", async () => {
      mockExistsSync.mockReturnValue(false);

      const handler = registry.handlers.get("notify_agent")!;
      const result = await handler({ event: "build_done", message: "build ok" });
      expect(getText(result)).toContain("[info]");
    });

    it("should handle corrupted notification file gracefully", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("not json{{{");

      const handler = registry.handlers.get("notify_agent")!;
      const result = await handler({ event: "test", message: "test" });
      // Should not throw, creates fresh array
      expect(isError(result)).toBe(false);
    });
  });
});
