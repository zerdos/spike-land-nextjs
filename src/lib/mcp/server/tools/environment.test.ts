import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
  },
}));

const { mockGetAllConfigs, mockGetEnvConfig, mockCheckHealth } = vi.hoisted(() => ({
  mockGetAllConfigs: vi.fn(),
  mockGetEnvConfig: vi.fn(),
  mockCheckHealth: vi.fn(),
}));

const { mockListDeployments } = vi.hoisted(() => ({
  mockListDeployments: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dashboard/environments", () => ({
  getAllEnvironmentConfigs: mockGetAllConfigs,
  getEnvironmentConfig: mockGetEnvConfig,
  checkEnvironmentHealth: mockCheckHealth,
}));
vi.mock("@/lib/bridges/vercel", () => ({
  listVercelDeployments: mockListDeployments,
}));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerEnvironmentTools } from "./environment";

describe("environment tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    registry = createMockRegistry();
    registerEnvironmentTools(registry, userId);
  });

  it("should register 4 environment tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
    expect(registry.handlers.has("env_list")).toBe(true);
    expect(registry.handlers.has("env_status")).toBe(true);
    expect(registry.handlers.has("env_compare")).toBe(true);
    expect(registry.handlers.has("env_deployments")).toBe(true);
  });

  describe("env_list", () => {
    it("should list all environment configs", async () => {
      mockGetAllConfigs.mockReturnValue([
        { name: "dev", url: "http://localhost:3000", healthEndpoint: "http://localhost:3000/api/health" },
        { name: "prod", url: "https://spike.land", healthEndpoint: "https://spike.land/api/health" },
      ]);
      const handler = registry.handlers.get("env_list")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("dev");
      expect(text).toContain("prod");
      expect(text).toContain("localhost:3000");
      expect(text).toContain("spike.land");
    });
  });

  describe("env_status", () => {
    it("should return environment health status", async () => {
      const config = { name: "prod", url: "https://spike.land", healthEndpoint: "https://spike.land/api/health" };
      mockGetEnvConfig.mockReturnValue(config);
      mockCheckHealth.mockResolvedValue({
        name: "prod", url: "https://spike.land", status: "healthy",
        version: "1.2.3", commitSha: "abc1234", lastDeployedAt: new Date("2026-01-01"),
      });
      const handler = registry.handlers.get("env_status")!;
      const result = await handler({ name: "prod" });
      const text = getText(result);
      expect(text).toContain("prod");
      expect(text).toContain("healthy");
      expect(text).toContain("1.2.3");
      expect(text).toContain("abc1234");
    });

    it("should return not found for unknown environment", async () => {
      mockGetEnvConfig.mockReturnValue(undefined);
      const handler = registry.handlers.get("env_status")!;
      const result = await handler({ name: "dev" });
      expect(getText(result)).toContain("not found");
    });

    it("should handle environment with unknown version", async () => {
      const config = { name: "dev", url: "http://localhost:3000", healthEndpoint: "http://localhost:3000/api/health" };
      mockGetEnvConfig.mockReturnValue(config);
      mockCheckHealth.mockResolvedValue({
        name: "dev", url: "http://localhost:3000", status: "down",
        version: null, commitSha: null, lastDeployedAt: null,
      });
      const handler = registry.handlers.get("env_status")!;
      const result = await handler({ name: "dev" });
      const text = getText(result);
      expect(text).toContain("down");
      expect(text).toContain("unknown");
    });
  });

  describe("env_compare", () => {
    it("should compare two environments", async () => {
      const devConfig = { name: "dev", url: "http://localhost:3000", healthEndpoint: "http://localhost:3000/api/health" };
      const prodConfig = { name: "prod", url: "https://spike.land", healthEndpoint: "https://spike.land/api/health" };
      mockGetEnvConfig.mockImplementation((name: string) => {
        if (name === "dev") return devConfig;
        if (name === "prod") return prodConfig;
        return undefined;
      });
      mockCheckHealth.mockImplementation((config: { name: string }) => {
        if (config.name === "dev") {
          return Promise.resolve({
            name: "dev", status: "healthy", version: "1.2.3",
            commitSha: "abc1234", lastDeployedAt: null,
          });
        }
        return Promise.resolve({
          name: "prod", status: "healthy", version: "1.2.3",
          commitSha: "abc1234", lastDeployedAt: new Date("2026-01-01"),
        });
      });
      const handler = registry.handlers.get("env_compare")!;
      const result = await handler({ env_a: "dev", env_b: "prod" });
      const text = getText(result);
      expect(text).toContain("dev vs prod");
      expect(text).toContain("Version match: YES");
      expect(text).toContain("Commit match: YES");
    });

    it("should show NO when versions differ", async () => {
      const devConfig = { name: "dev", url: "http://localhost:3000", healthEndpoint: "http://localhost:3000/api/health" };
      const prodConfig = { name: "prod", url: "https://spike.land", healthEndpoint: "https://spike.land/api/health" };
      mockGetEnvConfig.mockImplementation((name: string) => {
        if (name === "dev") return devConfig;
        if (name === "prod") return prodConfig;
        return undefined;
      });
      mockCheckHealth.mockImplementation((config: { name: string }) => {
        if (config.name === "dev") {
          return Promise.resolve({
            name: "dev", status: "healthy", version: "1.2.4",
            commitSha: "def5678", lastDeployedAt: null,
          });
        }
        return Promise.resolve({
          name: "prod", status: "healthy", version: "1.2.3",
          commitSha: "abc1234", lastDeployedAt: null,
        });
      });
      const handler = registry.handlers.get("env_compare")!;
      const result = await handler({ env_a: "dev", env_b: "prod" });
      const text = getText(result);
      expect(text).toContain("Version match: NO");
      expect(text).toContain("Commit match: NO");
    });

    it("should return not found for unknown env_a", async () => {
      mockGetEnvConfig.mockReturnValue(undefined);
      const handler = registry.handlers.get("env_compare")!;
      const result = await handler({ env_a: "dev", env_b: "prod" });
      expect(getText(result)).toContain("not found");
    });

    it("should return not found for unknown env_b", async () => {
      mockGetEnvConfig.mockImplementation((name: string) => {
        if (name === "dev") return { name: "dev", url: "http://localhost:3000", healthEndpoint: "http://localhost:3000/api/health" };
        return undefined;
      });
      const handler = registry.handlers.get("env_compare")!;
      const result = await handler({ env_a: "dev", env_b: "prod" });
      expect(getText(result)).toContain("not found");
    });
  });

  describe("env_deployments", () => {
    it("should list deployments from Vercel", async () => {
      mockListDeployments.mockResolvedValue([
        { uid: "d1", name: "spike-land", url: "spike-land.vercel.app", state: "READY", created: Date.now(), source: "github" },
      ]);
      const handler = registry.handlers.get("env_deployments")!;
      const result = await handler({});
      const text = getText(result);
      expect(text).toContain("spike-land");
      expect(text).toContain("READY");
    });

    it("should return message when no deployments", async () => {
      mockListDeployments.mockResolvedValue(null);
      const handler = registry.handlers.get("env_deployments")!;
      const result = await handler({});
      expect(getText(result)).toContain("No deployments found");
    });

    it("should return message for empty deployments array", async () => {
      mockListDeployments.mockResolvedValue([]);
      const handler = registry.handlers.get("env_deployments")!;
      const result = await handler({});
      expect(getText(result)).toContain("No deployments found");
    });

    it("should pass state filter to Vercel bridge", async () => {
      mockListDeployments.mockResolvedValue([]);
      const handler = registry.handlers.get("env_deployments")!;
      await handler({ state: "ERROR" });
      expect(mockListDeployments).toHaveBeenCalledWith(
        expect.objectContaining({ state: "ERROR" }),
      );
    });
  });

  describe("requireAdminRole", () => {
    it("should deny access when user has USER role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });
      mockGetAllConfigs.mockReturnValue([]);
      const handler = registry.handlers.get("env_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("PERMISSION_DENIED");
    });

    it("should deny access when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockGetAllConfigs.mockReturnValue([]);
      const handler = registry.handlers.get("env_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("PERMISSION_DENIED");
    });

    it("should allow SUPER_ADMIN role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: "SUPER_ADMIN" });
      mockGetAllConfigs.mockReturnValue([]);
      const handler = registry.handlers.get("env_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("Environments (0)");
    });

    it("should check admin role on every environment tool handler", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });
      const toolNames = ["env_list", "env_status", "env_compare", "env_deployments"];
      for (const toolName of toolNames) {
        const handler = registry.handlers.get(toolName)!;
        const result = await handler({});
        expect(getText(result)).toContain("PERMISSION_DENIED");
      }
    });
  });
});
