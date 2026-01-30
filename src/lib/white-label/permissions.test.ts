/**
 * White-Label Permissions Tests
 *
 * Unit tests for tier and role-based access control.
 */

import { describe, expect, it } from "vitest";
import {
  canAccessWhiteLabel,
  canConfigureDomain,
  canConfigureWhiteLabel,
  canDeleteWhiteLabelConfig,
  getWhiteLabelPermissionMessage,
  getWhiteLabelTierMessage,
  getWhiteLabelTiers,
} from "./permissions";

describe("canAccessWhiteLabel", () => {
  it("should return true for PRO tier", () => {
    expect(canAccessWhiteLabel({ subscriptionTier: "PRO" })).toBe(true);
  });

  it("should return true for BUSINESS tier", () => {
    expect(canAccessWhiteLabel({ subscriptionTier: "BUSINESS" })).toBe(true);
  });

  it("should return false for FREE tier", () => {
    expect(canAccessWhiteLabel({ subscriptionTier: "FREE" })).toBe(false);
  });
});

describe("canConfigureWhiteLabel", () => {
  it("should return true for OWNER with PRO tier", () => {
    const result = canConfigureWhiteLabel({ subscriptionTier: "PRO" }, { role: "OWNER" });
    expect(result).toBe(true);
  });

  it("should return true for ADMIN with BUSINESS tier", () => {
    const result = canConfigureWhiteLabel({ subscriptionTier: "BUSINESS" }, { role: "ADMIN" });
    expect(result).toBe(true);
  });

  it("should return false for MEMBER with PRO tier", () => {
    const result = canConfigureWhiteLabel({ subscriptionTier: "PRO" }, { role: "MEMBER" });
    expect(result).toBe(false);
  });

  it("should return false for OWNER with FREE tier", () => {
    const result = canConfigureWhiteLabel({ subscriptionTier: "FREE" }, { role: "OWNER" });
    expect(result).toBe(false);
  });
});

describe("canConfigureDomain", () => {
  it("should return true for OWNER with PRO tier", () => {
    const result = canConfigureDomain({ subscriptionTier: "PRO" }, { role: "OWNER" });
    expect(result).toBe(true);
  });

  it("should return false for MEMBER with PRO tier", () => {
    const result = canConfigureDomain({ subscriptionTier: "PRO" }, { role: "MEMBER" });
    expect(result).toBe(false);
  });

  it("should return false for OWNER with FREE tier", () => {
    const result = canConfigureDomain({ subscriptionTier: "FREE" }, { role: "OWNER" });
    expect(result).toBe(false);
  });
});

describe("canDeleteWhiteLabelConfig", () => {
  it("should return true for OWNER", () => {
    expect(canDeleteWhiteLabelConfig({ role: "OWNER" })).toBe(true);
  });

  it("should return false for ADMIN", () => {
    expect(canDeleteWhiteLabelConfig({ role: "ADMIN" })).toBe(false);
  });

  it("should return false for MEMBER", () => {
    expect(canDeleteWhiteLabelConfig({ role: "MEMBER" })).toBe(false);
  });
});

describe("getWhiteLabelTiers", () => {
  it("should return PRO and BUSINESS tiers", () => {
    const tiers = getWhiteLabelTiers();
    expect(tiers).toContain("PRO");
    expect(tiers).toContain("BUSINESS");
    expect(tiers).not.toContain("FREE");
  });
});

describe("getWhiteLabelTierMessage", () => {
  it("should return a descriptive message about tier requirements", () => {
    const message = getWhiteLabelTierMessage();
    expect(message).toContain("PRO");
    expect(message).toContain("BUSINESS");
    expect(message).toContain("subscription");
  });
});

describe("getWhiteLabelPermissionMessage", () => {
  it("should return a descriptive message about permission requirements", () => {
    const message = getWhiteLabelPermissionMessage();
    expect(message).toContain("owners");
    expect(message).toContain("administrators");
  });
});
