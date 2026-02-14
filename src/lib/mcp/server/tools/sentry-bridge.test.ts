import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockListIssues, mockGetDetail, mockGetStats } = vi.hoisted(() => ({
  mockListIssues: vi.fn(),
  mockGetDetail: vi.fn(),
  mockGetStats: vi.fn(),
}));

vi.mock("@/lib/bridges/sentry", () => ({
  listSentryIssues: mockListIssues,
  getSentryIssueDetail: mockGetDetail,
  getSentryStats: mockGetStats,
}));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerSentryBridgeTools } from "./sentry-bridge";

describe("sentry bridge tools", () => {
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SENTRY_MCP_AUTH_TOKEN", "test-token");
    registry = createMockRegistry();
    registerSentryBridgeTools(registry, "user-123");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("registers 3 tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("sentry_issues")).toBe(true);
    expect(registry.handlers.has("sentry_issue_detail")).toBe(true);
    expect(registry.handlers.has("sentry_stats")).toBe(true);
  });

  describe("sentry_issues", () => {
    it("should list issues", async () => {
      mockListIssues.mockResolvedValue([
        {
          id: "100",
          title: "TypeError in handler",
          level: "error",
          status: "unresolved",
          count: "42",
          firstSeen: "2026-01-01",
          lastSeen: "2026-02-14",
        },
      ]);
      const handler = registry.handlers.get("sentry_issues")!;
      const result = await handler({});
      expect(getText(result)).toContain("TypeError in handler");
      expect(getText(result)).toContain("error/unresolved");
      expect(getText(result)).toContain("Events: 42");
    });

    it("should return empty message when no issues found", async () => {
      mockListIssues.mockResolvedValue([]);
      const handler = registry.handlers.get("sentry_issues")!;
      const result = await handler({});
      expect(getText(result)).toContain("No Sentry issues found");
    });

    it("should return empty message when API returns null", async () => {
      mockListIssues.mockResolvedValue(null);
      const handler = registry.handlers.get("sentry_issues")!;
      const result = await handler({});
      expect(getText(result)).toContain("No Sentry issues found");
    });

    it("should pass query and limit to bridge", async () => {
      mockListIssues.mockResolvedValue([]);
      const handler = registry.handlers.get("sentry_issues")!;
      await handler({ query: "TypeError", limit: 10 });
      expect(mockListIssues).toHaveBeenCalledWith({ query: "TypeError", limit: 10 });
    });

    it("should show not-configured when SENTRY_MCP_AUTH_TOKEN is missing", async () => {
      vi.stubEnv("SENTRY_MCP_AUTH_TOKEN", "");
      delete process.env.SENTRY_MCP_AUTH_TOKEN;
      const handler = registry.handlers.get("sentry_issues")!;
      const result = await handler({});
      expect(getText(result)).toContain("Sentry not configured");
    });
  });

  describe("sentry_issue_detail", () => {
    it("should return issue details", async () => {
      mockGetDetail.mockResolvedValue({
        id: "100",
        title: "TypeError in handler",
        type: "error",
        level: "error",
        status: "unresolved",
        count: "42",
        firstSeen: "2026-01-01",
        lastSeen: "2026-02-14",
        culprit: "app/api/route.ts",
        permalink: "https://sentry.io/issues/100",
      });
      const handler = registry.handlers.get("sentry_issue_detail")!;
      const result = await handler({ issue_id: "100" });
      expect(getText(result)).toContain("TypeError in handler");
      expect(getText(result)).toContain("app/api/route.ts");
      expect(getText(result)).toContain("https://sentry.io/issues/100");
    });

    it("should return not-found when issue is null", async () => {
      mockGetDetail.mockResolvedValue(null);
      const handler = registry.handlers.get("sentry_issue_detail")!;
      const result = await handler({ issue_id: "999" });
      expect(getText(result)).toContain("Issue not found");
    });

    it("should show not-configured when SENTRY_MCP_AUTH_TOKEN is missing", async () => {
      vi.stubEnv("SENTRY_MCP_AUTH_TOKEN", "");
      delete process.env.SENTRY_MCP_AUTH_TOKEN;
      const handler = registry.handlers.get("sentry_issue_detail")!;
      const result = await handler({ issue_id: "100" });
      expect(getText(result)).toContain("Sentry not configured");
    });
  });

  describe("sentry_stats", () => {
    it("should return stats", async () => {
      mockGetStats.mockResolvedValue({
        received: [10, 20, 30],
        rejected: [1, 2, 3],
      });
      const handler = registry.handlers.get("sentry_stats")!;
      const result = await handler({});
      expect(getText(result)).toContain("Total received: 60");
      expect(getText(result)).toContain("Total rejected: 6");
      expect(getText(result)).toContain("Data points: 3");
    });

    it("should return error when stats are null", async () => {
      mockGetStats.mockResolvedValue(null);
      const handler = registry.handlers.get("sentry_stats")!;
      const result = await handler({});
      expect(getText(result)).toContain("Could not fetch Sentry stats");
    });

    it("should show not-configured when SENTRY_MCP_AUTH_TOKEN is missing", async () => {
      vi.stubEnv("SENTRY_MCP_AUTH_TOKEN", "");
      delete process.env.SENTRY_MCP_AUTH_TOKEN;
      const handler = registry.handlers.get("sentry_stats")!;
      const result = await handler({});
      expect(getText(result)).toContain("Sentry not configured");
    });
  });
});
