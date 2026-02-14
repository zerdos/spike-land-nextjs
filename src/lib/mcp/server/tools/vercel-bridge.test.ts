import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockListDeployments, mockGetDeployment, mockGetAnalytics } = vi.hoisted(() => ({
  mockListDeployments: vi.fn(),
  mockGetDeployment: vi.fn(),
  mockGetAnalytics: vi.fn(),
}));

vi.mock("@/lib/bridges/vercel", () => ({
  listVercelDeployments: mockListDeployments,
  getVercelDeployment: mockGetDeployment,
  getVercelAnalytics: mockGetAnalytics,
}));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerVercelBridgeTools } from "./vercel-bridge";

describe("vercel bridge tools", () => {
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_TOKEN", "test-token");
    registry = createMockRegistry();
    registerVercelBridgeTools(registry, "user-123");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("registers 3 tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("vercel_deployments")).toBe(true);
    expect(registry.handlers.has("vercel_deployment_detail")).toBe(true);
    expect(registry.handlers.has("vercel_analytics")).toBe(true);
  });

  describe("vercel_deployments", () => {
    it("should list deployments", async () => {
      mockListDeployments.mockResolvedValue([
        {
          uid: "dpl_abc123",
          name: "spike-land-nextjs",
          url: "spike-land-abc123.vercel.app",
          state: "READY",
          created: 1707900000000,
          ready: 1707900060000,
          source: "github",
          meta: {},
        },
      ]);
      const handler = registry.handlers.get("vercel_deployments")!;
      const result = await handler({});
      expect(getText(result)).toContain("spike-land-nextjs");
      expect(getText(result)).toContain("READY");
      expect(getText(result)).toContain("dpl_abc123");
    });

    it("should return empty message when no deployments found", async () => {
      mockListDeployments.mockResolvedValue([]);
      const handler = registry.handlers.get("vercel_deployments")!;
      const result = await handler({});
      expect(getText(result)).toContain("No Vercel deployments found");
    });

    it("should return empty message when API returns null", async () => {
      mockListDeployments.mockResolvedValue(null);
      const handler = registry.handlers.get("vercel_deployments")!;
      const result = await handler({});
      expect(getText(result)).toContain("No Vercel deployments found");
    });

    it("should pass limit and state to bridge", async () => {
      mockListDeployments.mockResolvedValue([]);
      const handler = registry.handlers.get("vercel_deployments")!;
      await handler({ limit: 5, state: "ERROR" });
      expect(mockListDeployments).toHaveBeenCalledWith({ limit: 5, state: "ERROR" });
    });

    it("should show not-configured when VERCEL_TOKEN is missing", async () => {
      vi.stubEnv("VERCEL_TOKEN", "");
      delete process.env["VERCEL_TOKEN"];
      const handler = registry.handlers.get("vercel_deployments")!;
      const result = await handler({});
      expect(getText(result)).toContain("Vercel not configured");
    });
  });

  describe("vercel_deployment_detail", () => {
    it("should return deployment details", async () => {
      mockGetDeployment.mockResolvedValue({
        uid: "dpl_abc123",
        name: "spike-land-nextjs",
        url: "spike-land-abc123.vercel.app",
        state: "READY",
        readyState: "READY",
        created: 1707900000000,
        ready: 1707900060000,
        source: "github",
        meta: {},
        alias: ["spike.land", "www.spike.land"],
        regions: ["iad1", "sfo1"],
        buildingAt: 1707900000000,
        inspectorUrl: "https://vercel.com/inspect/dpl_abc123",
      });
      const handler = registry.handlers.get("vercel_deployment_detail")!;
      const result = await handler({ deployment_id: "dpl_abc123" });
      expect(getText(result)).toContain("spike-land-nextjs");
      expect(getText(result)).toContain("spike.land");
      expect(getText(result)).toContain("iad1");
      expect(getText(result)).toContain("https://vercel.com/inspect/dpl_abc123");
    });

    it("should show 'none' for empty aliases", async () => {
      mockGetDeployment.mockResolvedValue({
        uid: "dpl_abc123",
        name: "test",
        url: "test.vercel.app",
        state: "READY",
        readyState: "READY",
        created: 0,
        ready: 0,
        source: "cli",
        meta: {},
        alias: [],
        regions: ["iad1"],
        buildingAt: 0,
        inspectorUrl: "https://vercel.com/inspect/x",
      });
      const handler = registry.handlers.get("vercel_deployment_detail")!;
      const result = await handler({ deployment_id: "dpl_abc123" });
      expect(getText(result)).toContain("Aliases: none");
    });

    it("should return not-found when deployment is null", async () => {
      mockGetDeployment.mockResolvedValue(null);
      const handler = registry.handlers.get("vercel_deployment_detail")!;
      const result = await handler({ deployment_id: "dpl_missing" });
      expect(getText(result)).toContain("Deployment not found");
    });

    it("should show not-configured when VERCEL_TOKEN is missing", async () => {
      vi.stubEnv("VERCEL_TOKEN", "");
      delete process.env["VERCEL_TOKEN"];
      const handler = registry.handlers.get("vercel_deployment_detail")!;
      const result = await handler({ deployment_id: "dpl_abc123" });
      expect(getText(result)).toContain("Vercel not configured");
    });
  });

  describe("vercel_analytics", () => {
    it("should return analytics data", async () => {
      mockGetAnalytics.mockResolvedValue({
        pageViews: 5000,
        visitors: 1200,
        bounceRate: 35,
        avgDuration: 120,
        topPages: [
          { path: "/", views: 2000 },
          { path: "/about", views: 800 },
        ],
      });
      const handler = registry.handlers.get("vercel_analytics")!;
      const result = await handler({});
      expect(getText(result)).toContain("Page views: 5000");
      expect(getText(result)).toContain("Visitors: 1200");
      expect(getText(result)).toContain("Bounce rate: 35%");
      expect(getText(result)).toContain("/about: 800 views");
    });

    it("should handle empty top pages", async () => {
      mockGetAnalytics.mockResolvedValue({
        pageViews: 0,
        visitors: 0,
        bounceRate: 0,
        avgDuration: 0,
        topPages: [],
      });
      const handler = registry.handlers.get("vercel_analytics")!;
      const result = await handler({});
      expect(getText(result)).toContain("Page views: 0");
      expect(getText(result)).not.toContain("Top Pages");
    });

    it("should return error when analytics are null", async () => {
      mockGetAnalytics.mockResolvedValue(null);
      const handler = registry.handlers.get("vercel_analytics")!;
      const result = await handler({});
      expect(getText(result)).toContain("Could not fetch Vercel analytics");
    });

    it("should show not-configured when VERCEL_TOKEN is missing", async () => {
      vi.stubEnv("VERCEL_TOKEN", "");
      delete process.env["VERCEL_TOKEN"];
      const handler = registry.handlers.get("vercel_analytics")!;
      const result = await handler({});
      expect(getText(result)).toContain("Vercel not configured");
    });
  });
});
