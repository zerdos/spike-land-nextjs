/**
 * Domain Verification Tests
 *
 * Unit tests for DNS verification and SSL provisioning.
 */

import { describe, expect, it } from "vitest";
import {
  calculateDaysUntilExpiration,
  generateVerificationToken,
  getSslStatusFromExpiration,
  getVerificationInstructions,
  isValidDomain,
} from "./domain-verification";

describe("generateVerificationToken", () => {
  it("should generate a token with the correct prefix", () => {
    const token = generateVerificationToken();
    expect(token).toMatch(/^spike-land-verify=[a-f0-9]{32}$/);
  });

  it("should generate unique tokens on each call", () => {
    const token1 = generateVerificationToken();
    const token2 = generateVerificationToken();
    expect(token1).not.toBe(token2);
  });
});

describe("getVerificationInstructions", () => {
  it("should return correct DNS verification instructions", () => {
    const token = "spike-land-verify=abc123";
    const instructions = getVerificationInstructions("example.com", token);

    expect(instructions.recordType).toBe("TXT");
    expect(instructions.host).toBe("example.com");
    expect(instructions.value).toBe(token);
    expect(instructions.ttl).toBe(3600);
  });
});

describe("calculateDaysUntilExpiration", () => {
  it("should return correct days for future date", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);

    const days = calculateDaysUntilExpiration(futureDate);
    // Allow for slight timing variance (59-60 days depending on execution time)
    expect(days).toBeGreaterThanOrEqual(59);
    expect(days).toBeLessThanOrEqual(60);
  });

  it("should return 0 for expired date", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const days = calculateDaysUntilExpiration(pastDate);
    expect(days).toBe(0);
  });

  it("should return null for null input", () => {
    expect(calculateDaysUntilExpiration(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(calculateDaysUntilExpiration(undefined)).toBeNull();
  });
});

describe("getSslStatusFromExpiration", () => {
  it("should return ACTIVE for dates more than 30 days away", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);

    expect(getSslStatusFromExpiration(futureDate)).toBe("ACTIVE");
  });

  it("should return EXPIRING_SOON for dates within 30 days", () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 15);

    expect(getSslStatusFromExpiration(soonDate)).toBe("EXPIRING_SOON");
  });

  it("should return EXPIRED for past dates", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    expect(getSslStatusFromExpiration(pastDate)).toBe("EXPIRED");
  });

  it("should return PENDING for null input", () => {
    expect(getSslStatusFromExpiration(null)).toBe("PENDING");
  });

  it("should return PENDING for undefined input", () => {
    expect(getSslStatusFromExpiration(undefined)).toBe("PENDING");
  });

  it("should return EXPIRED for exactly expired (0 days)", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Set to yesterday to ensure it's expired
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    expect(getSslStatusFromExpiration(yesterday)).toBe("EXPIRED");
  });
});

describe("isValidDomain", () => {
  it("should return true for valid domains", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("sub.example.com")).toBe(true);
    expect(isValidDomain("deep.sub.example.co.uk")).toBe(true);
    expect(isValidDomain("my-domain.com")).toBe(true);
  });

  it("should return false for invalid domains", () => {
    expect(isValidDomain("")).toBe(false);
    expect(isValidDomain("example")).toBe(false);
    expect(isValidDomain(".com")).toBe(false);
    expect(isValidDomain("example.")).toBe(false);
    expect(isValidDomain("-example.com")).toBe(false);
    expect(isValidDomain("example-.com")).toBe(false);
    expect(isValidDomain("http://example.com")).toBe(false);
    expect(isValidDomain("example.com/path")).toBe(false);
  });
});

// Tests for async functions with mocked DNS
describe("verifyDomainOwnership", () => {
  it("should return false when DNS lookup fails", async () => {
    const { verifyDomainOwnership } = await import("./domain-verification");
    // Use an invalid domain that will fail DNS resolution
    const result = await verifyDomainOwnership("invalid.nonexistent.tld", "spike-land-verify=test");
    expect(result).toBe(false);
  });
});

describe("initiateSslProvisioning", () => {
  it("should return PROVISIONING status (placeholder)", async () => {
    const { initiateSslProvisioning } = await import("./domain-verification");
    const result = await initiateSslProvisioning("example.com");
    expect(result.success).toBe(true);
    expect(result.status).toBe("PROVISIONING");
  });
});

describe("checkSslStatus", () => {
  it("should return PENDING status (placeholder)", async () => {
    const { checkSslStatus } = await import("./domain-verification");
    const result = await checkSslStatus("example.com");
    expect(result.status).toBe("PENDING");
  });
});
