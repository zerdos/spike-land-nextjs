/**
 * Health Calculator Tests
 *
 * Tests for health score calculation functions.
 */

import type { SocialAccountHealth } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateErrorScore,
  calculateFullHealth,
  calculateHealthScore,
  calculateRateLimitScore,
  calculateSyncScore,
  calculateTokenScore,
  scoreToStatus,
} from "./health-calculator";
import { DEFAULT_HEALTH_WEIGHTS, HEALTH_THRESHOLDS } from "./types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccountHealth: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    socialAccount: {
      findMany: vi.fn(),
    },
  },
}));

describe("Health Calculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scoreToStatus", () => {
    it("returns HEALTHY for scores >= 80", () => {
      expect(scoreToStatus(100)).toBe("HEALTHY");
      expect(scoreToStatus(80)).toBe("HEALTHY");
      expect(scoreToStatus(85)).toBe("HEALTHY");
    });

    it("returns DEGRADED for scores 50-79", () => {
      expect(scoreToStatus(79)).toBe("DEGRADED");
      expect(scoreToStatus(50)).toBe("DEGRADED");
      expect(scoreToStatus(65)).toBe("DEGRADED");
    });

    it("returns UNHEALTHY for scores 20-49", () => {
      expect(scoreToStatus(49)).toBe("UNHEALTHY");
      expect(scoreToStatus(20)).toBe("UNHEALTHY");
      expect(scoreToStatus(35)).toBe("UNHEALTHY");
    });

    it("returns CRITICAL for scores < 20", () => {
      expect(scoreToStatus(19)).toBe("CRITICAL");
      expect(scoreToStatus(0)).toBe("CRITICAL");
      expect(scoreToStatus(10)).toBe("CRITICAL");
    });
  });

  describe("calculateSyncScore", () => {
    it("returns 100 for recent sync with no errors", () => {
      const now = new Date();
      const score = calculateSyncScore(now, 0);
      expect(score).toBe(100);
    });

    it("returns 100 for sync within 6 hours", () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const score = calculateSyncScore(twoHoursAgo, 0);
      expect(score).toBe(100);
    });

    it("decreases score for older syncs", () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours
      const score = calculateSyncScore(oneDayAgo, 0);
      expect(score).toBeLessThan(100);
      expect(score).toBe(50); // Between 24-48 hours = 50
    });

    it("returns 70 for sync between 12-24 hours ago", () => {
      const now = new Date();
      const fourteenHoursAgo = new Date(now.getTime() - 14 * 60 * 60 * 1000);
      const score = calculateSyncScore(fourteenHoursAgo, 0);
      expect(score).toBe(70);
    });

    it("returns 85 for sync between 6-12 hours ago", () => {
      const now = new Date();
      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      const score = calculateSyncScore(eightHoursAgo, 0);
      expect(score).toBe(85);
    });

    it("returns 20 for very stale sync (>48 hours)", () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      const score = calculateSyncScore(threeDaysAgo, 0);
      expect(score).toBe(20);
    });

    it("penalizes consecutive errors", () => {
      const now = new Date();
      const scoreNoErrors = calculateSyncScore(now, 0);
      const scoreWithErrors = calculateSyncScore(now, 3);
      expect(scoreWithErrors).toBeLessThan(scoreNoErrors);
      expect(scoreWithErrors).toBe(70); // 100 - 3*10 = 70
    });

    it("returns 0 for null lastSync", () => {
      const score = calculateSyncScore(null, 0);
      expect(score).toBe(0);
    });

    it("clamps score at 0 minimum", () => {
      const now = new Date();
      const score = calculateSyncScore(now, 15); // 100 - 150 = clamped to 0
      expect(score).toBe(0);
    });
  });

  describe("calculateRateLimitScore", () => {
    it("returns 100 when not rate limited and low usage (<50%)", () => {
      const score = calculateRateLimitScore(900, 1000, false);
      expect(score).toBe(100); // 10% used
    });

    it("returns 0 when currently rate limited", () => {
      const score = calculateRateLimitScore(0, 1000, true);
      expect(score).toBe(0);
    });

    it("decreases score as rate limit usage increases", () => {
      const score10percent = calculateRateLimitScore(900, 1000, false); // 10% used
      const score90percent = calculateRateLimitScore(100, 1000, false); // 90% used
      expect(score90percent).toBeLessThan(score10percent);
    });

    it("returns 100 when rate limits are null", () => {
      const score = calculateRateLimitScore(null, null, false);
      expect(score).toBe(100);
    });

    it("returns 100 when total is 0", () => {
      const score = calculateRateLimitScore(0, 0, false);
      expect(score).toBe(100);
    });

    it("returns 10 for critical usage (>=95%)", () => {
      const score = calculateRateLimitScore(50, 1000, false); // 95% used
      expect(score).toBe(10);
    });

    it("returns 30 for high usage (85-95%)", () => {
      const score = calculateRateLimitScore(100, 1000, false); // 90% used
      expect(score).toBe(30);
    });

    it("returns 60 for moderate usage (70-85%)", () => {
      const score = calculateRateLimitScore(200, 1000, false); // 80% used
      expect(score).toBe(60);
    });

    it("returns 80 for normal usage (50-70%)", () => {
      const score = calculateRateLimitScore(400, 1000, false); // 60% used
      expect(score).toBe(80);
    });
  });

  describe("calculateErrorScore", () => {
    it("returns 100 for no errors", () => {
      const score = calculateErrorScore(0);
      expect(score).toBe(100);
    });

    it("returns 80 for 1-2 errors", () => {
      expect(calculateErrorScore(1)).toBe(80);
      expect(calculateErrorScore(2)).toBe(80);
    });

    it("returns 60 for 3-5 errors", () => {
      expect(calculateErrorScore(3)).toBe(60);
      expect(calculateErrorScore(5)).toBe(60);
    });

    it("returns 40 for 6-10 errors", () => {
      expect(calculateErrorScore(6)).toBe(40);
      expect(calculateErrorScore(10)).toBe(40);
    });

    it("returns 20 for 11-20 errors", () => {
      expect(calculateErrorScore(11)).toBe(20);
      expect(calculateErrorScore(20)).toBe(20);
    });

    it("returns 0 for more than 20 errors", () => {
      const score = calculateErrorScore(25);
      expect(score).toBe(0);
    });
  });

  describe("calculateTokenScore", () => {
    it("returns 100 for no expiry set", () => {
      const score = calculateTokenScore(null, false);
      expect(score).toBe(100);
    });

    it("returns 20 when token refresh required", () => {
      const score = calculateTokenScore(null, true);
      expect(score).toBe(20);
    });

    it("returns 100 for far future expiry (>1 week)", () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
      const score = calculateTokenScore(futureDate, false);
      expect(score).toBe(100);
    });

    it("returns 90 for expiry within 3-7 days", () => {
      const in5days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const score = calculateTokenScore(in5days, false);
      expect(score).toBe(90);
    });

    it("returns 75 for expiry within 1-3 days", () => {
      const in2days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const score = calculateTokenScore(in2days, false);
      expect(score).toBe(75);
    });

    it("returns 50 for expiry within 6-24 hours", () => {
      const in12hours = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const score = calculateTokenScore(in12hours, false);
      expect(score).toBe(50);
    });

    it("returns 20 for expiry within 0-6 hours", () => {
      const in3hours = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const score = calculateTokenScore(in3hours, false);
      expect(score).toBe(20);
    });

    it("returns 0 for expired token", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const score = calculateTokenScore(pastDate, false);
      expect(score).toBe(0);
    });
  });

  describe("calculateHealthScore", () => {
    it("calculates weighted average of component scores", () => {
      // All 100s should give 100
      const score = calculateHealthScore(100, 100, 100, 100);
      expect(score).toBe(100);
    });

    it("applies weights correctly", () => {
      // With sync=0 and others at 100:
      // 0 * 0.3 + 100 * 0.25 + 100 * 0.25 + 100 * 0.2 = 70
      const score = calculateHealthScore(0, 100, 100, 100);
      expect(score).toBe(70);
    });

    it("calculates all zeros correctly", () => {
      const score = calculateHealthScore(0, 0, 0, 0);
      expect(score).toBe(0);
    });

    it("allows custom weights", () => {
      const customWeights = {
        syncStatus: 0.25,
        rateLimitUsage: 0.25,
        errorFrequency: 0.25,
        tokenHealth: 0.25,
      };
      const score = calculateHealthScore(50, 50, 50, 50, customWeights);
      expect(score).toBe(50);
    });

    it("clamps score between 0 and 100", () => {
      // Even with high individual scores, final should be clamped
      expect(calculateHealthScore(100, 100, 100, 100)).toBeLessThanOrEqual(100);
      expect(calculateHealthScore(0, 0, 0, 0)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateFullHealth", () => {
    it("calculates full health from health record", () => {
      const health: Partial<SocialAccountHealth> = {
        lastSuccessfulSync: new Date(),
        consecutiveErrors: 0,
        totalErrorsLast24h: 0,
        isRateLimited: false,
        rateLimitRemaining: 900,
        rateLimitTotal: 1000,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tokenRefreshRequired: false,
      };

      const result = calculateFullHealth(health as SocialAccountHealth);

      expect(result.score).toBeGreaterThan(80);
      expect(result.status).toBe("HEALTHY");
    });

    it("returns unhealthy status for problematic health record", () => {
      const health: Partial<SocialAccountHealth> = {
        lastSuccessfulSync: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Very stale
        consecutiveErrors: 5,
        totalErrorsLast24h: 25, // High errors
        isRateLimited: true,
        rateLimitRemaining: 0,
        rateLimitTotal: 1000,
        tokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        tokenRefreshRequired: true,
      };

      const result = calculateFullHealth(health as SocialAccountHealth);

      expect(result.score).toBeLessThan(50);
      expect(["UNHEALTHY", "CRITICAL"]).toContain(result.status);
    });
  });

  describe("Health thresholds", () => {
    it("uses correct threshold values", () => {
      expect(HEALTH_THRESHOLDS.HEALTHY).toBe(80);
      expect(HEALTH_THRESHOLDS.DEGRADED).toBe(50);
      expect(HEALTH_THRESHOLDS.UNHEALTHY).toBe(20);
    });
  });

  describe("Default weights", () => {
    it("uses correct weight values", () => {
      expect(DEFAULT_HEALTH_WEIGHTS.syncStatus).toBe(0.3);
      expect(DEFAULT_HEALTH_WEIGHTS.rateLimitUsage).toBe(0.25);
      expect(DEFAULT_HEALTH_WEIGHTS.errorFrequency).toBe(0.25);
      expect(DEFAULT_HEALTH_WEIGHTS.tokenHealth).toBe(0.2);
    });

    it("weights sum to 1", () => {
      const total = DEFAULT_HEALTH_WEIGHTS.syncStatus +
        DEFAULT_HEALTH_WEIGHTS.rateLimitUsage +
        DEFAULT_HEALTH_WEIGHTS.errorFrequency +
        DEFAULT_HEALTH_WEIGHTS.tokenHealth;
      expect(total).toBe(1);
    });
  });
});
