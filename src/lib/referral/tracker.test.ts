import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tracker from "./tracker";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    referral: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("./code-generator", () => ({
  getUserByReferralCode: vi.fn(),
}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

describe("Referral Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("trackReferralCode", () => {
    it("should store valid referral code in cookie", async () => {
      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue("referrer-123");

      const result = await tracker.trackReferralCode("ABC12345");

      expect(result).toBe(true);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "ref_code",
        "ABC12345",
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });

    it("should reject invalid referral code", async () => {
      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue(null);

      const result = await tracker.trackReferralCode("INVALID");

      expect(result).toBe(false);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("should use secure flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as { NODE_ENV?: string; }).NODE_ENV = "production";

      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue("referrer-123");

      await tracker.trackReferralCode("ABC12345");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "ref_code",
        "ABC12345",
        expect.objectContaining({ secure: true }),
      );

      (process.env as { NODE_ENV?: string; }).NODE_ENV = originalEnv;
    });
  });

  describe("getReferralCodeFromCookie", () => {
    it("should return referral code from cookie", async () => {
      mockCookieStore.get.mockReturnValue({ value: "ABC12345" });

      const code = await tracker.getReferralCodeFromCookie();

      expect(code).toBe("ABC12345");
      expect(mockCookieStore.get).toHaveBeenCalledWith("ref_code");
    });

    it("should return null if cookie does not exist", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const code = await tracker.getReferralCodeFromCookie();

      expect(code).toBeNull();
    });
  });

  describe("clearReferralCookie", () => {
    it("should delete referral cookie", async () => {
      await tracker.clearReferralCookie();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("ref_code");
    });
  });

  describe("linkReferralOnSignup", () => {
    it("should link new user to referrer", async () => {
      mockCookieStore.get.mockReturnValue({ value: "ABC12345" });

      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue("referrer-123");

      vi.mocked(prisma.user.update).mockResolvedValue(
        { id: "user-456" } as never,
      );
      vi.mocked(prisma.referral.create).mockResolvedValue({
        id: "ref-789",
        referrerId: "referrer-123",
        refereeId: "user-456",
        status: "PENDING",
      } as never);

      const result = await tracker.linkReferralOnSignup(
        "user-456",
        "127.0.0.1",
      );

      expect(result.success).toBe(true);
      expect(result.referrerId).toBe("referrer-123");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-456" },
        data: { referredById: "referrer-123" },
      });
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          referrerId: "referrer-123",
          refereeId: "user-456",
          ipAddress: "127.0.0.1",
          status: "PENDING",
        },
      });
      expect(mockCookieStore.delete).toHaveBeenCalledWith("ref_code");
    });

    it("should fail if no referral cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await tracker.linkReferralOnSignup("user-456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No referral code found");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should fail if referral code is invalid", async () => {
      mockCookieStore.get.mockReturnValue({ value: "INVALID" });

      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue(null);

      const result = await tracker.linkReferralOnSignup("user-456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid referral code");
    });

    it("should prevent self-referral", async () => {
      mockCookieStore.get.mockReturnValue({ value: "ABC12345" });

      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue("user-456");

      const result = await tracker.linkReferralOnSignup("user-456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot refer yourself");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockCookieStore.get.mockReturnValue({ value: "ABC12345" });

      const { getUserByReferralCode } = await import("./code-generator");
      vi.mocked(getUserByReferralCode).mockResolvedValue("referrer-123");

      vi.mocked(prisma.user.update).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await tracker.linkReferralOnSignup("user-456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getReferrerId", () => {
    it("should return referrer ID for user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referredById: "referrer-123",
      } as never);

      const referrerId = await tracker.getReferrerId("user-456");

      expect(referrerId).toBe("referrer-123");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-456" },
        select: { referredById: true },
      });
    });

    it("should return null if user has no referrer", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referredById: null,
      } as never);

      const referrerId = await tracker.getReferrerId("user-456");

      expect(referrerId).toBeNull();
    });
  });
});
