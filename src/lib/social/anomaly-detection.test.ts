/**
 * Tests for Pulse Anomaly Detection
 *
 * Resolves #647
 */

import prisma from "@/lib/prisma";
import type { SocialMetrics, SocialPlatform } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AnomalyResult,
  calculateMean,
  calculateMovingAverage,
  calculateStandardDeviation,
  calculateZScore,
  detectAnomalies,
  getRecentAnomalies,
  getWorkspaceHealth,
  storeAnomaly,
} from "./anomaly-detection";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
    socialMetrics: {
      findMany: vi.fn(),
    },
    socialMetricAnomaly: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Statistical Functions", () => {
  describe("calculateMean", () => {
    it("should calculate mean correctly", () => {
      expect(calculateMean([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateMean([10, 20, 30])).toBe(20);
      expect(calculateMean([100])).toBe(100);
    });

    it("should return 0 for empty array", () => {
      expect(calculateMean([])).toBe(0);
    });
  });

  describe("calculateStandardDeviation", () => {
    it("should calculate standard deviation correctly", () => {
      // Sample: [2, 4, 4, 4, 5, 5, 7, 9]
      // Mean: 5, Variance: 4, StdDev: 2
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const stdDev = calculateStandardDeviation(values);
      expect(stdDev).toBeCloseTo(2.138, 2);
    });

    it("should return 0 for array with single value", () => {
      expect(calculateStandardDeviation([5])).toBe(0);
    });

    it("should return 0 for empty array", () => {
      expect(calculateStandardDeviation([])).toBe(0);
    });
  });

  describe("calculateZScore", () => {
    it("should calculate Z-score correctly", () => {
      // Value 7, Mean 5, StdDev 2 -> Z = (7-5)/2 = 1
      expect(calculateZScore(7, 5, 2)).toBe(1);
      // Value 3, Mean 5, StdDev 2 -> Z = (3-5)/2 = -1
      expect(calculateZScore(3, 5, 2)).toBe(-1);
    });

    it("should return 0 when stdDev is 0", () => {
      expect(calculateZScore(10, 5, 0)).toBe(0);
    });
  });

  describe("calculateMovingAverage", () => {
    it("should calculate moving average correctly", () => {
      const values = [1, 2, 3, 4, 5, 6, 7];
      const result = calculateMovingAverage(values, 3);
      // Window 1: [1,2,3] -> 2
      // Window 2: [2,3,4] -> 3
      // etc.
      expect(result).toEqual([2, 3, 4, 5, 6]);
    });

    it("should return empty array if not enough values", () => {
      expect(calculateMovingAverage([1, 2], 3)).toEqual([]);
    });

    it("should handle window size equal to array length", () => {
      expect(calculateMovingAverage([2, 4, 6], 3)).toEqual([4]);
    });
  });
});

describe("detectAnomalies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty result when no accounts found", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    const result = await detectAnomalies("workspace-1");

    expect(result.workspaceId).toBe("workspace-1");
    expect(result.analyzedAccounts).toBe(0);
    expect(result.anomalies).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should detect spike anomaly when value exceeds threshold", async () => {
    const mockAccount = {
      id: "account-1",
      platform: "LINKEDIN" as SocialPlatform,
    };

    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
      [mockAccount] as never,
    );

    // Create 8 days of metrics with a spike on the last day
    const mockMetrics = createMockMetricsWithSpike(
      "account-1",
      [100, 102, 101, 99, 100, 103, 98, 200], // Last value is a big spike
    );
    vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(mockMetrics);

    const result = await detectAnomalies("workspace-1");

    expect(result.analyzedAccounts).toBe(1);
    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.anomalies[0]!.direction).toBe("spike");
    expect(result.anomalies[0]!.metricType).toBe("followers");
  });

  it("should detect drop anomaly when value drops significantly", async () => {
    const mockAccount = {
      id: "account-1",
      platform: "INSTAGRAM" as SocialPlatform,
    };

    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
      [mockAccount] as never,
    );

    // Create metrics with a significant drop
    const mockMetrics = createMockMetricsWithSpike(
      "account-1",
      [1000, 1010, 990, 1005, 995, 1000, 1002, 500], // Last value is a big drop
    );
    vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(mockMetrics);

    const result = await detectAnomalies("workspace-1");

    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.anomalies[0]!.direction).toBe("drop");
  });

  it("should not detect anomaly for normal fluctuations", async () => {
    const mockAccount = {
      id: "account-1",
      platform: "TWITTER" as SocialPlatform,
    };

    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
      [mockAccount] as never,
    );

    // Normal fluctuations within 1 standard deviation
    const mockMetrics = createMockMetricsWithSpike(
      "account-1",
      [100, 102, 99, 101, 100, 103, 98, 101],
    );
    vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(mockMetrics);

    const result = await detectAnomalies("workspace-1");

    expect(result.anomalies).toHaveLength(0);
  });

  it("should classify critical vs warning based on Z-score", async () => {
    const mockAccount = {
      id: "account-1",
      platform: "FACEBOOK" as SocialPlatform,
    };

    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
      [mockAccount] as never,
    );

    // Extreme spike for critical severity (Z > 3)
    // Need some variation in historical data so stdDev is not 0
    const mockMetrics = createMockMetricsWithSpike(
      "account-1",
      [100, 101, 99, 100, 102, 98, 101, 500], // Historical variation + extreme spike
    );
    vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(mockMetrics);

    const result = await detectAnomalies("workspace-1");

    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.anomalies[0]!.severity).toBe("critical");
  });

  it("should skip metrics with all zero values", async () => {
    const mockAccount = {
      id: "account-1",
      platform: "YOUTUBE" as SocialPlatform,
    };

    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
      [mockAccount] as never,
    );

    // All zeros for impressions
    const mockMetrics = createMockMetricsWithSpike(
      "account-1",
      [0, 0, 0, 0, 0, 0, 0, 0],
    );
    vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue(mockMetrics);

    const result = await detectAnomalies("workspace-1");

    expect(result.anomalies).toHaveLength(0);
  });

  it("should handle multiple accounts", async () => {
    const mockAccounts = [
      { id: "account-1", platform: "LINKEDIN" as SocialPlatform },
      { id: "account-2", platform: "INSTAGRAM" as SocialPlatform },
    ];

    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue(
      mockAccounts as never,
    );
    vi.mocked(prisma.socialMetrics.findMany).mockResolvedValue([]);

    const result = await detectAnomalies("workspace-1");

    expect(result.analyzedAccounts).toBe(2);
    expect(prisma.socialMetrics.findMany).toHaveBeenCalledTimes(2);
  });

  it("should respect custom config options", async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

    await detectAnomalies("workspace-1", {
      windowSize: 14,
      warningThreshold: 1.5,
      criticalThreshold: 2.5,
    });

    expect(prisma.socialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "workspace-1",
          status: "ACTIVE",
        },
      }),
    );
  });
});

describe("storeAnomaly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should store anomaly in database", async () => {
    vi.mocked(prisma.socialMetricAnomaly.create).mockResolvedValue({
      id: "anomaly-1",
      accountId: "account-1",
      metricType: "followers",
      detectedAt: new Date(),
      currentValue: 200,
      expectedValue: 100,
      zScore: 3.5,
      severity: "critical",
      direction: "spike",
      percentChange: 100,
      createdAt: new Date(),
    });

    const anomaly: AnomalyResult = {
      accountId: "account-1",
      platform: "LINKEDIN" as SocialPlatform,
      metricType: "followers",
      currentValue: 200,
      expectedValue: 100,
      zScore: 3.5,
      severity: "critical",
      direction: "spike",
      percentChange: 100,
      detectedAt: new Date(),
    };

    await storeAnomaly(anomaly);

    expect(prisma.socialMetricAnomaly.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "account-1",
        metricType: "followers",
        severity: "critical",
      }),
    });
  });
});

describe("getRecentAnomalies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return recent anomalies for workspace", async () => {
    const mockAnomalies = [
      {
        id: "anomaly-1",
        accountId: "account-1",
        metricType: "followers",
        detectedAt: new Date(),
        currentValue: 200,
        expectedValue: 100,
        zScore: 3.5,
        severity: "critical",
        direction: "spike",
        percentChange: 100,
        createdAt: new Date(),
        account: { platform: "LINKEDIN" as SocialPlatform },
      },
    ];

    vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValue(
      mockAnomalies,
    );

    const result = await getRecentAnomalies("workspace-1", 10);

    expect(result).toHaveLength(1);
    expect(result[0]!.platform).toBe("LINKEDIN");
    expect(result[0]!.severity).toBe("critical");
  });

  it("should return empty array on error", async () => {
    vi.mocked(prisma.socialMetricAnomaly.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const result = await getRecentAnomalies("workspace-1");

    expect(result).toHaveLength(0);
  });
});

describe("getWorkspaceHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return healthy when no anomalies", async () => {
    vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValue([]);

    const result = await getWorkspaceHealth("workspace-1");

    expect(result.status).toBe("healthy");
    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it("should return warning when only warnings exist", async () => {
    vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValue([
      { severity: "warning" },
      { severity: "warning" },
    ] as never);

    const result = await getWorkspaceHealth("workspace-1");

    expect(result.status).toBe("warning");
    expect(result.warningCount).toBe(2);
    expect(result.criticalCount).toBe(0);
  });

  it("should return critical when any critical exists", async () => {
    vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValue([
      { severity: "warning" },
      { severity: "critical" },
    ] as never);

    const result = await getWorkspaceHealth("workspace-1");

    expect(result.status).toBe("critical");
    expect(result.criticalCount).toBe(1);
    expect(result.warningCount).toBe(1);
  });

  it("should return healthy on error", async () => {
    vi.mocked(prisma.socialMetricAnomaly.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const result = await getWorkspaceHealth("workspace-1");

    expect(result.status).toBe("healthy");
  });
});

// Helper to create mock metrics with specific follower values
function createMockMetricsWithSpike(
  accountId: string,
  followerValues: number[],
): SocialMetrics[] {
  const baseDate = new Date();
  return followerValues.map((followers, index) => ({
    id: `metrics-${index}`,
    accountId,
    date: new Date(
      baseDate.getTime() -
        (followerValues.length - 1 - index) * 24 * 60 * 60 * 1000,
    ),
    followers,
    following: 100,
    postsCount: 50,
    engagementRate: {
      toNumber: () => 5.0,
    } as unknown as SocialMetrics["engagementRate"],
    impressions: 1000,
    reach: 800,
    likes: 100,
    comments: 10,
    shares: 5,
    rawData: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}
