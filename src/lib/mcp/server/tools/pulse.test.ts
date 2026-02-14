import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  socialAccount: { findMany: vi.fn() },
  socialAccountHealth: { findUnique: vi.fn() },
  socialMetricAnomaly: { findMany: vi.fn() },
  socialMetrics: { findMany: vi.fn() },
  accountHealthEvent: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerPulseTools } from "./pulse";

describe("pulse tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws-1", slug: "my-ws", name: "My Workspace" });
    registerPulseTools(registry, userId);
  });

  it("should register 5 pulse tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("pulse_get_health_score")).toBe(true);
    expect(registry.handlers.has("pulse_list_anomalies")).toBe(true);
    expect(registry.handlers.has("pulse_get_metrics")).toBe(true);
    expect(registry.handlers.has("pulse_get_account_health")).toBe(true);
    expect(registry.handlers.has("pulse_list_health_events")).toBe(true);
  });

  describe("pulse_get_health_score", () => {
    it("should return health details", async () => {
      mockPrisma.socialAccountHealth.findUnique.mockResolvedValue({
        healthScore: 85,
        status: "HEALTHY",
        lastSuccessfulSync: new Date("2025-07-01T12:00:00Z"),
        lastSyncAttempt: new Date("2025-07-01T12:00:00Z"),
        consecutiveErrors: 0,
        totalErrorsLast24h: 1,
        rateLimitRemaining: 450,
        rateLimitTotal: 500,
        rateLimitResetAt: new Date("2025-07-01T13:00:00Z"),
        isRateLimited: false,
        tokenRefreshRequired: false,
        tokenExpiresAt: new Date("2025-08-01"),
        account: { platform: "INSTAGRAM", accountName: "MyBrand" },
      });
      const handler = registry.handlers.get("pulse_get_health_score")!;
      const result = await handler({ workspace_slug: "my-ws", account_id: "acc-1" });
      const text = getText(result);
      expect(text).toContain("Account Health");
      expect(text).toContain("85/100");
      expect(text).toContain("HEALTHY");
      expect(text).toContain("MyBrand");
      expect(text).toContain("450 / 500");
    });

    it("should handle missing account", async () => {
      mockPrisma.socialAccountHealth.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("pulse_get_health_score")!;
      const result = await handler({ workspace_slug: "my-ws", account_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("pulse_list_anomalies", () => {
    it("should return anomaly list", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([{ id: "acc-1" }, { id: "acc-2" }]);
      mockPrisma.socialMetricAnomaly.findMany.mockResolvedValue([
        {
          id: "anom-1",
          metricType: "followers",
          currentValue: 500,
          expectedValue: 1000,
          zScore: -3.2,
          severity: "HIGH",
          direction: "DOWN",
          percentChange: -50.0,
          detectedAt: new Date("2025-07-01"),
          account: { accountName: "MyBrand", platform: "INSTAGRAM" },
        },
      ]);
      const handler = registry.handlers.get("pulse_list_anomalies")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Anomalies");
      expect(text).toContain("followers");
      expect(text).toContain("HIGH");
      expect(text).toContain("-3.20");
    });

    it("should respect severity filter", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([{ id: "acc-1" }]);
      mockPrisma.socialMetricAnomaly.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("pulse_list_anomalies")!;
      await handler({ workspace_slug: "my-ws", severity: "CRITICAL" });
      expect(mockPrisma.socialMetricAnomaly.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: "CRITICAL" }),
        }),
      );
    });

    it("should respect limit", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([{ id: "acc-1" }]);
      mockPrisma.socialMetricAnomaly.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("pulse_list_anomalies")!;
      await handler({ workspace_slug: "my-ws", limit: 5 });
      expect(mockPrisma.socialMetricAnomaly.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe("pulse_get_metrics", () => {
    it("should return metrics for date range", async () => {
      mockPrisma.socialMetrics.findMany.mockResolvedValue([
        {
          date: new Date("2025-07-01"),
          followers: 1000,
          engagementRate: 0.05,
          impressions: 5000,
          reach: 3000,
        },
        {
          date: new Date("2025-06-30"),
          followers: 990,
          engagementRate: 0.048,
          impressions: 4800,
          reach: 2900,
        },
      ]);
      const handler = registry.handlers.get("pulse_get_metrics")!;
      const result = await handler({ workspace_slug: "my-ws", account_id: "acc-1", days: 7 });
      const text = getText(result);
      expect(text).toContain("Metrics");
      expect(text).toContain("1000");
      expect(text).toContain("5000");
      expect(text).toContain("2025-07-01");
    });

    it("should handle empty data", async () => {
      mockPrisma.socialMetrics.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("pulse_get_metrics")!;
      const result = await handler({ workspace_slug: "my-ws", account_id: "acc-1" });
      const text = getText(result);
      expect(text).toContain("No metrics found");
    });
  });

  describe("pulse_get_account_health", () => {
    it("should return workspace dashboard", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        {
          id: "acc-1",
          platform: "INSTAGRAM",
          accountName: "MyBrand",
          status: "ACTIVE",
          health: { healthScore: 95, status: "HEALTHY", isRateLimited: false, tokenRefreshRequired: false },
        },
        {
          id: "acc-2",
          platform: "TWITTER",
          accountName: "MyBrandTW",
          status: "ACTIVE",
          health: { healthScore: 40, status: "DEGRADED", isRateLimited: true, tokenRefreshRequired: false },
        },
        {
          id: "acc-3",
          platform: "FACEBOOK",
          accountName: "MyBrandFB",
          status: "ACTIVE",
          health: null,
        },
      ]);
      const handler = registry.handlers.get("pulse_get_account_health")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Health Dashboard");
      expect(text).toContain("3 accounts");
      expect(text).toContain("95/100");
      expect(text).toContain("RATE LIMITED");
      expect(text).toContain("No health data");
    });
  });

  describe("pulse_list_health_events", () => {
    it("should return event list", async () => {
      mockPrisma.accountHealthEvent.findMany.mockResolvedValue([
        {
          id: "evt-1",
          eventType: "SCORE_DECREASED",
          severity: "MEDIUM",
          previousStatus: "HEALTHY",
          newStatus: "DEGRADED",
          previousScore: 90,
          newScore: 60,
          message: "Health score dropped due to API errors",
          createdAt: new Date("2025-07-01"),
          account: { accountName: "MyBrand", platform: "INSTAGRAM" },
        },
      ]);
      const handler = registry.handlers.get("pulse_list_health_events")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Health Events");
      expect(text).toContain("SCORE_DECREASED");
      expect(text).toContain("MEDIUM");
      expect(text).toContain("HEALTHY");
      expect(text).toContain("DEGRADED");
      expect(text).toContain("Health score dropped");
    });

    it("should filter by event type", async () => {
      mockPrisma.accountHealthEvent.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("pulse_list_health_events")!;
      await handler({ workspace_slug: "my-ws", event_type: "TOKEN_EXPIRED" });
      expect(mockPrisma.accountHealthEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventType: "TOKEN_EXPIRED" }),
        }),
      );
    });
  });
});
