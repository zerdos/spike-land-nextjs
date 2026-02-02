import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock chokidar
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn().mockResolvedValue(undefined),
};
vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => mockWatcher),
  },
}));

// Mock node:fs with default export
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  };
});

// Mock fs module
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    default: {
      ...actual,
      readFile: vi.fn().mockResolvedValue(
        "export default function App() { return <div>Test</div>; }",
      ),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
    readFile: vi.fn().mockResolvedValue(
      "export default function App() { return <div>Test</div>; }",
    ),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findFirst: vi.fn().mockResolvedValue({ id: "test-app-id" }),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ code: "test code" }),
  text: vi.fn().mockResolvedValue(""),
});
vi.stubGlobal("fetch", mockFetch);

describe("vibe-watcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    // Reset module state between tests
    vi.resetModules();
  });

  describe("startVibeWatcher", () => {
    it("should initialize chokidar watcher", async () => {
      const { startVibeWatcher, stopVibeWatcher } = await import("./vibe-watcher");
      const chokidar = await import("chokidar");

      startVibeWatcher();

      expect(chokidar.default.watch).toHaveBeenCalledWith(
        expect.stringContaining("live"),
        expect.objectContaining({
          ignoreInitial: true,
        }),
      );

      // Clean up
      stopVibeWatcher();
    });

    it("should not create multiple watchers when called twice", async () => {
      const { startVibeWatcher, stopVibeWatcher } = await import("./vibe-watcher");
      const chokidar = await import("chokidar");

      startVibeWatcher();
      const firstCallCount = vi.mocked(chokidar.default.watch).mock.calls.length;

      startVibeWatcher();
      const secondCallCount = vi.mocked(chokidar.default.watch).mock.calls.length;

      // Should not increase after second call
      expect(secondCallCount).toBe(firstCallCount);

      stopVibeWatcher();
    });
  });

  describe("ensureLocalFile", () => {
    it("should return existing file path if file exists", async () => {
      const { ensureLocalFile } = await import("./vibe-watcher");
      const fs = await import("fs");

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await ensureLocalFile("test-codespace");

      expect(result).toContain("test-codespace.tsx");
    });

    it("should handle file download when file does not exist", async () => {
      // Reset mocks for this specific test
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ code: "downloaded code" }),
      });

      const { ensureLocalFile } = await import("./vibe-watcher");
      const fs = await import("fs");

      // Simulate: live dir exists, but file doesn't
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true) // live dir exists
        .mockReturnValueOnce(false); // file doesn't exist

      const result = await ensureLocalFile("download-test-codespace");

      // Verify path is returned correctly
      expect(result).toContain("download-test-codespace.tsx");
    });
  });

  describe("stopVibeWatcher", () => {
    it("should close watcher and clear timers", async () => {
      const { startVibeWatcher, stopVibeWatcher } = await import("./vibe-watcher");

      startVibeWatcher();
      stopVibeWatcher();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe("clearAppIdCache", () => {
    it("should clear the cache without throwing", async () => {
      const { clearAppIdCache } = await import("./vibe-watcher");

      // Should not throw
      expect(() => clearAppIdCache()).not.toThrow();
    });
  });
});
