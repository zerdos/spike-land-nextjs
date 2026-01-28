/**
 * Unit tests for tier-config.ts
 */

import { describe, expect, it } from "vitest";

import {
  getNextTier,
  getTierIndex,
  getTierLimits,
  isDowngrade,
  isUnlimited,
  isUpgrade,
  WORKSPACE_TIER_DISPLAY_NAMES,
  WORKSPACE_TIER_LIMITS,
  WORKSPACE_TIER_ORDER,
} from "./tier-config";

describe("tier-config", () => {
  describe("WORKSPACE_TIER_LIMITS", () => {
    it("should define FREE tier with correct limits", () => {
      expect(WORKSPACE_TIER_LIMITS["FREE"]).toEqual({
        maxSocialAccounts: 3,
        maxScheduledPosts: 30,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        maxTeamMembers: 1,
        priceUSD: 0,
      });
    });

    it("should define PRO tier with correct limits", () => {
      expect(WORKSPACE_TIER_LIMITS["PRO"]).toEqual({
        maxSocialAccounts: 10,
        maxScheduledPosts: -1,
        maxAbTests: 10,
        monthlyAiCredits: 1000,
        maxTeamMembers: 3,
        priceUSD: 29,
      });
    });

    it("should define BUSINESS tier with correct limits", () => {
      expect(WORKSPACE_TIER_LIMITS["BUSINESS"]).toEqual({
        maxSocialAccounts: -1,
        maxScheduledPosts: -1,
        maxAbTests: -1,
        monthlyAiCredits: 5000,
        maxTeamMembers: 10,
        priceUSD: 99,
      });
    });
  });

  describe("WORKSPACE_TIER_DISPLAY_NAMES", () => {
    it("should have display names for all tiers", () => {
      expect(WORKSPACE_TIER_DISPLAY_NAMES["FREE"]).toBe("Free");
      expect(WORKSPACE_TIER_DISPLAY_NAMES["PRO"]).toBe("Pro");
      expect(WORKSPACE_TIER_DISPLAY_NAMES["BUSINESS"]).toBe("Business");
    });
  });

  describe("WORKSPACE_TIER_ORDER", () => {
    it("should define correct tier order", () => {
      expect(WORKSPACE_TIER_ORDER).toEqual(["FREE", "PRO", "BUSINESS"]);
    });
  });

  describe("isUnlimited", () => {
    it("should return true for -1", () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it("should return false for positive numbers", () => {
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(1)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });

    it("should return false for other negative numbers", () => {
      expect(isUnlimited(-2)).toBe(false);
    });
  });

  describe("getTierIndex", () => {
    it("should return correct index for each tier", () => {
      expect(getTierIndex("FREE")).toBe(0);
      expect(getTierIndex("PRO")).toBe(1);
      expect(getTierIndex("BUSINESS")).toBe(2);
    });
  });

  describe("isUpgrade", () => {
    it("should return true for FREE to PRO", () => {
      expect(isUpgrade("FREE", "PRO")).toBe(true);
    });

    it("should return true for FREE to BUSINESS", () => {
      expect(isUpgrade("FREE", "BUSINESS")).toBe(true);
    });

    it("should return true for PRO to BUSINESS", () => {
      expect(isUpgrade("PRO", "BUSINESS")).toBe(true);
    });

    it("should return false for same tier", () => {
      expect(isUpgrade("FREE", "FREE")).toBe(false);
      expect(isUpgrade("PRO", "PRO")).toBe(false);
      expect(isUpgrade("BUSINESS", "BUSINESS")).toBe(false);
    });

    it("should return false for downgrades", () => {
      expect(isUpgrade("PRO", "FREE")).toBe(false);
      expect(isUpgrade("BUSINESS", "PRO")).toBe(false);
      expect(isUpgrade("BUSINESS", "FREE")).toBe(false);
    });
  });

  describe("isDowngrade", () => {
    it("should return true for PRO to FREE", () => {
      expect(isDowngrade("PRO", "FREE")).toBe(true);
    });

    it("should return true for BUSINESS to PRO", () => {
      expect(isDowngrade("BUSINESS", "PRO")).toBe(true);
    });

    it("should return true for BUSINESS to FREE", () => {
      expect(isDowngrade("BUSINESS", "FREE")).toBe(true);
    });

    it("should return false for same tier", () => {
      expect(isDowngrade("FREE", "FREE")).toBe(false);
      expect(isDowngrade("PRO", "PRO")).toBe(false);
      expect(isDowngrade("BUSINESS", "BUSINESS")).toBe(false);
    });

    it("should return false for upgrades", () => {
      expect(isDowngrade("FREE", "PRO")).toBe(false);
      expect(isDowngrade("PRO", "BUSINESS")).toBe(false);
      expect(isDowngrade("FREE", "BUSINESS")).toBe(false);
    });
  });

  describe("getTierLimits", () => {
    it("should return limits for FREE tier", () => {
      const limits = getTierLimits("FREE");
      expect(limits).toBe(WORKSPACE_TIER_LIMITS["FREE"]);
    });

    it("should return limits for PRO tier", () => {
      const limits = getTierLimits("PRO");
      expect(limits).toBe(WORKSPACE_TIER_LIMITS["PRO"]);
    });

    it("should return limits for BUSINESS tier", () => {
      const limits = getTierLimits("BUSINESS");
      expect(limits).toBe(WORKSPACE_TIER_LIMITS["BUSINESS"]);
    });
  });

  describe("getNextTier", () => {
    it("should return PRO for FREE", () => {
      expect(getNextTier("FREE")).toBe("PRO");
    });

    it("should return BUSINESS for PRO", () => {
      expect(getNextTier("PRO")).toBe("BUSINESS");
    });

    it("should return null for BUSINESS (highest tier)", () => {
      expect(getNextTier("BUSINESS")).toBeNull();
    });
  });
});
