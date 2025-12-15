import prisma from "@/lib/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fraudDetection from "./fraud-detection";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    referral: {
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Fraud Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getBlockedEmailDomains", () => {
    const originalEnv = process.env.BLOCKED_EMAIL_DOMAINS;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.BLOCKED_EMAIL_DOMAINS;
      } else {
        process.env.BLOCKED_EMAIL_DOMAINS = originalEnv;
      }
    });

    it("should return default disposable domains when no env var set", () => {
      delete process.env.BLOCKED_EMAIL_DOMAINS;
      const domains = fraudDetection.getBlockedEmailDomains();
      expect(domains).toContain("tempmail.com");
      expect(domains).toContain("mailinator.com");
    });

    it("should include custom domains from BLOCKED_EMAIL_DOMAINS env var", () => {
      process.env.BLOCKED_EMAIL_DOMAINS = "custom-spam.com, another-bad.org";
      const domains = fraudDetection.getBlockedEmailDomains();
      expect(domains).toContain("tempmail.com"); // Original list
      expect(domains).toContain("custom-spam.com"); // Custom domain
      expect(domains).toContain("another-bad.org"); // Custom domain
    });

    it("should filter out empty strings from custom domains", () => {
      process.env.BLOCKED_EMAIL_DOMAINS = "custom-spam.com,,  ,valid.com";
      const domains = fraudDetection.getBlockedEmailDomains();
      expect(domains).toContain("custom-spam.com");
      expect(domains).toContain("valid.com");
      expect(domains).not.toContain("");
    });
  });

  describe("isDisposableEmail", () => {
    it("should detect disposable email addresses", () => {
      expect(fraudDetection.isDisposableEmail("test@tempmail.com")).toBe(true);
      expect(fraudDetection.isDisposableEmail("user@mailinator.com")).toBe(
        true,
      );
      expect(fraudDetection.isDisposableEmail("fake@10minutemail.com")).toBe(
        true,
      );
    });

    it("should allow legitimate email addresses", () => {
      expect(fraudDetection.isDisposableEmail("user@gmail.com")).toBe(false);
      expect(fraudDetection.isDisposableEmail("john@company.com")).toBe(false);
      expect(fraudDetection.isDisposableEmail("test@outlook.com")).toBe(false);
    });

    it("should handle invalid email formats", () => {
      expect(fraudDetection.isDisposableEmail("notanemail")).toBe(false);
      expect(fraudDetection.isDisposableEmail("")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(fraudDetection.isDisposableEmail("test@TempMail.COM")).toBe(true);
      expect(fraudDetection.isDisposableEmail("user@MAILINATOR.COM")).toBe(
        true,
      );
    });
  });

  describe("checkSameIpReferral", () => {
    it("should detect recent referrals from same IP", async () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 2); // 2 hours ago

      vi.mocked(prisma.referral.findFirst).mockResolvedValue({
        id: "ref-123",
        ipAddress: "192.168.1.1",
        createdAt: recentDate,
      } as any);

      const result = await fraudDetection.checkSameIpReferral(
        "192.168.1.1",
        "referrer-123",
      );

      expect(result).toBe(true);
    });

    it("should allow referrals from same IP after 24 hours", async () => {
      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);

      const result = await fraudDetection.checkSameIpReferral(
        "192.168.1.1",
        "referrer-123",
      );

      expect(result).toBe(false);
    });

    it("should return false if no IP address provided", async () => {
      const result = await fraudDetection.checkSameIpReferral(
        "",
        "referrer-123",
      );

      expect(result).toBe(false);
      expect(prisma.referral.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("checkReferralRateLimit", () => {
    it("should detect when referrer exceeds daily limit", async () => {
      vi.mocked(prisma.referral.count).mockResolvedValue(10);

      const result = await fraudDetection.checkReferralRateLimit(
        "referrer-123",
      );

      expect(result).toBe(true);
    });

    it("should allow referrals within daily limit", async () => {
      vi.mocked(prisma.referral.count).mockResolvedValue(5);

      const result = await fraudDetection.checkReferralRateLimit(
        "referrer-123",
      );

      expect(result).toBe(false);
    });

    it("should allow exactly 10 referrals", async () => {
      vi.mocked(prisma.referral.count).mockResolvedValue(9);

      const result = await fraudDetection.checkReferralRateLimit(
        "referrer-123",
      );

      expect(result).toBe(false);
    });
  });

  describe("checkEmailVerified", () => {
    it("should return true for verified email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: new Date(),
      } as any);

      const result = await fraudDetection.checkEmailVerified("user-123");

      expect(result).toBe(true);
    });

    it("should return false for unverified email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: null,
      } as any);

      const result = await fraudDetection.checkEmailVerified("user-123");

      expect(result).toBe(false);
    });

    it("should return false if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await fraudDetection.checkEmailVerified("user-123");

      expect(result).toBe(false);
    });
  });

  describe("performFraudChecks", () => {
    it("should pass all checks for legitimate referral", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@gmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.performFraudChecks(
        "referee-456",
        "referrer-123",
        "192.168.1.1",
      );

      expect(result.passed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("should fail on disposable email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@tempmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.performFraudChecks(
        "referee-456",
        "referrer-123",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain("Disposable email address detected");
    });

    it("should fail on unverified email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@gmail.com",
        emailVerified: null,
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.performFraudChecks(
        "referee-456",
        "referrer-123",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain("Email not verified");
    });

    it("should fail on same IP within 24 hours", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@gmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue({
        id: "ref-123",
      } as any);

      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.performFraudChecks(
        "referee-456",
        "referrer-123",
        "192.168.1.1",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain("Same IP address used within 24 hours");
    });

    it("should fail on rate limit exceeded", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@gmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.referral.count).mockResolvedValue(10);

      const result = await fraudDetection.performFraudChecks(
        "referee-456",
        "referrer-123",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain(
        "Referrer exceeded daily referral limit",
      );
    });

    it("should fail on self-referral", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@gmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.performFraudChecks(
        "user-123",
        "user-123",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain("Self-referral not allowed");
    });

    it("should accumulate multiple fraud reasons", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@tempmail.com",
        emailVerified: null,
      } as any);

      vi.mocked(prisma.referral.findFirst).mockResolvedValue({
        id: "ref-123",
      } as any);

      vi.mocked(prisma.referral.count).mockResolvedValue(15);

      const result = await fraudDetection.performFraudChecks(
        "referee-456",
        "referrer-123",
        "192.168.1.1",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(1);
    });

    it("should fail when referee user is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await fraudDetection.performFraudChecks(
        "nonexistent-user",
        "referrer-123",
        "192.168.1.1",
      );

      expect(result.passed).toBe(false);
      expect(result.reasons).toContain("Referee user not found");
    });
  });

  describe("validateReferralAfterVerification", () => {
    it("should approve valid referral after verification", async () => {
      vi.mocked(prisma.referral.findFirst).mockResolvedValue({
        id: "ref-123",
        referrerId: "referrer-123",
        refereeId: "referee-456",
        status: "PENDING",
        ipAddress: "192.168.1.1",
        referrer: { id: "referrer-123" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@gmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.findFirst)
        .mockResolvedValueOnce({
          id: "ref-123",
          referrerId: "referrer-123",
          refereeId: "referee-456",
          status: "PENDING",
          ipAddress: "192.168.1.1",
          referrer: { id: "referrer-123" },
        } as any)
        .mockResolvedValueOnce(null); // For same IP check

      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.validateReferralAfterVerification(
        "referee-456",
      );

      expect(result.success).toBe(true);
      expect(result.shouldGrantRewards).toBe(true);
      expect(result.referralId).toBe("ref-123");
    });

    it("should reject referral that fails fraud checks", async () => {
      vi.mocked(prisma.referral.findFirst).mockResolvedValue({
        id: "ref-123",
        referrerId: "referrer-123",
        refereeId: "referee-456",
        status: "PENDING",
        ipAddress: null,
        referrer: { id: "referrer-123" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@tempmail.com",
        emailVerified: new Date(),
      } as any);

      vi.mocked(prisma.referral.count).mockResolvedValue(0);

      const result = await fraudDetection.validateReferralAfterVerification(
        "referee-456",
      );

      expect(result.success).toBe(true);
      expect(result.shouldGrantRewards).toBe(false);
      expect(result.error).toContain("Fraud checks failed");
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: "ref-123" },
        data: { status: "INVALID" },
      });
    });

    it("should handle no pending referral", async () => {
      vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);

      const result = await fraudDetection.validateReferralAfterVerification(
        "referee-456",
      );

      expect(result.success).toBe(false);
      expect(result.shouldGrantRewards).toBe(false);
      expect(result.error).toBe("No pending referral found");
    });

    it("should handle database errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      vi.mocked(prisma.referral.findFirst).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await fraudDetection.validateReferralAfterVerification(
        "referee-456",
      );

      expect(result.success).toBe(false);
      expect(result.shouldGrantRewards).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to validate referral:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should handle unknown errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      vi.mocked(prisma.referral.findFirst).mockRejectedValue(
        "Unknown error type",
      );

      const result = await fraudDetection.validateReferralAfterVerification(
        "referee-456",
      );

      expect(result.success).toBe(false);
      expect(result.shouldGrantRewards).toBe(false);
      expect(result.error).toBe("Unknown error");
      consoleSpy.mockRestore();
    });
  });

  describe("getFraudStats", () => {
    it("should return fraud statistics", async () => {
      vi.mocked(prisma.referral.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // valid
        .mockResolvedValueOnce(15) // invalid
        .mockResolvedValueOnce(5); // pending

      const stats = await fraudDetection.getFraudStats();

      expect(stats).toEqual({
        totalReferrals: 100,
        validReferrals: 80,
        invalidReferrals: 15,
        pendingReferrals: 5,
        invalidReasons: {},
      });
    });
  });
});
