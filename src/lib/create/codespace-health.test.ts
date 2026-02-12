import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterHealthyCodespaces, healthCache, isCodespaceHealthy } from "./codespace-health";

const mockGetSession = vi.fn();

vi.mock("@/lib/codespace/session-service", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("codespace-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthCache.clear();
  });

  describe("isCodespaceHealthy", () => {
    it("returns true for healthy session with real content", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: "var x = 1;",
        codeSpace: "test-cs",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("test-cs");
      expect(result).toBe(true);
    });

    it("returns false when session is null", async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await isCodespaceHealthy("missing-cs");
      expect(result).toBe(false);
    });

    it("returns false when getSession throws", async () => {
      mockGetSession.mockRejectedValue(new Error("DB error"));

      const result = await isCodespaceHealthy("error-cs");
      expect(result).toBe(false);
    });

    it("returns false when code is too short", async () => {
      mockGetSession.mockResolvedValue({
        code: "short",
        transpiled: "var x = 1;",
        codeSpace: "short-cs",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("short-cs");
      expect(result).toBe(false);
    });

    it("returns false when transpiled is empty", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: "",
        codeSpace: "empty-transpiled",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("empty-transpiled");
      expect(result).toBe(false);
    });

    it("returns false when transpiled contains '404 - for now'", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: "some code 404 - for now",
        codeSpace: "404-transpiled",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("404-transpiled");
      expect(result).toBe(false);
    });

    it("returns false when code contains '404 - for now'", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(50) + "404 - for now" + "x".repeat(50),
        transpiled: "var x = 1;",
        codeSpace: "404-code",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("404-code");
      expect(result).toBe(false);
    });

    it("returns false when code is null/undefined", async () => {
      mockGetSession.mockResolvedValue({
        code: null,
        transpiled: "var x = 1;",
        codeSpace: "null-code",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("null-code");
      expect(result).toBe(false);
    });

    it("returns false when transpiled is null/undefined", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: null,
        codeSpace: "null-transpiled",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const result = await isCodespaceHealthy("null-transpiled");
      expect(result).toBe(false);
    });

    it("uses cached result within TTL", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: "var x = 1;",
        codeSpace: "cached-cs",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      // First call — hits session service
      const result1 = await isCodespaceHealthy("cached-cs");
      expect(result1).toBe(true);
      expect(mockGetSession).toHaveBeenCalledTimes(1);

      // Second call — uses cache
      const result2 = await isCodespaceHealthy("cached-cs");
      expect(result2).toBe(true);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it("refetches after cache TTL expires", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: "var x = 1;",
        codeSpace: "expired-cs",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      await isCodespaceHealthy("expired-cs");
      expect(mockGetSession).toHaveBeenCalledTimes(1);

      // Manually expire the cache entry
      const cached = healthCache.get("expired-cs")!;
      cached.cachedAt = Date.now() - 61_000;

      await isCodespaceHealthy("expired-cs");
      expect(mockGetSession).toHaveBeenCalledTimes(2);
    });
  });

  describe("filterHealthyCodespaces", () => {
    it("filters out items with null codespaceId", async () => {
      const items = [
        { codespaceId: null, name: "no-cs" },
      ];

      const result = await filterHealthyCodespaces(items);
      expect(result).toEqual([]);
    });

    it("filters out unhealthy codespaces", async () => {
      mockGetSession.mockImplementation(async (id: string) => {
        if (id === "healthy-cs") {
          return {
            code: "x".repeat(200),
            transpiled: "var x = 1;",
            codeSpace: "healthy-cs",
            html: "",
            css: "",
            messages: [],
            hash: "abc",
          };
        }
        return null;
      });

      const items = [
        { codespaceId: "healthy-cs", name: "good" },
        { codespaceId: "missing-cs", name: "bad" },
      ];

      const result = await filterHealthyCodespaces(items);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("good");
    });

    it("returns empty array when all items are unhealthy", async () => {
      mockGetSession.mockResolvedValue(null);

      const items = [
        { codespaceId: "bad-1", name: "bad1" },
        { codespaceId: "bad-2", name: "bad2" },
      ];

      const result = await filterHealthyCodespaces(items);
      expect(result).toEqual([]);
    });

    it("returns all items when all are healthy", async () => {
      mockGetSession.mockResolvedValue({
        code: "x".repeat(200),
        transpiled: "var x = 1;",
        codeSpace: "cs",
        html: "",
        css: "",
        messages: [],
        hash: "abc",
      });

      const items = [
        { codespaceId: "cs-1", name: "a" },
        { codespaceId: "cs-2", name: "b" },
      ];

      const result = await filterHealthyCodespaces(items);
      expect(result).toHaveLength(2);
    });

    it("returns empty array for empty input", async () => {
      const result = await filterHealthyCodespaces([]);
      expect(result).toEqual([]);
    });
  });
});
