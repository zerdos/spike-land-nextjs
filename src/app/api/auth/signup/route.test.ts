import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Use vi.hoisted to define mocks before they are used
const { mockPrisma, mockCheckRateLimit, mockBcrypt, mockCreateStableUserId, mockReferralFunctions, mockBootstrapAdmin } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    album: {
      create: vi.fn(),
    },
  },
  mockCheckRateLimit: vi.fn(),
  mockBcrypt: {
    hash: vi.fn(),
  },
  mockCreateStableUserId: vi.fn(),
  mockReferralFunctions: {
    assignReferralCodeToUser: vi.fn(),
    linkReferralOnSignup: vi.fn(),
    validateReferralAfterVerification: vi.fn(),
    completeReferralAndGrantRewards: vi.fn(),
  },
  mockBootstrapAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("bcryptjs", () => ({
  default: mockBcrypt,
}));

vi.mock("@/auth.config", () => ({
  createStableUserId: mockCreateStableUserId,
}));

vi.mock("@/lib/auth/bootstrap-admin", () => ({
  bootstrapAdminIfNeeded: mockBootstrapAdmin,
}));

vi.mock("@/lib/referral/code-generator", () => ({
  assignReferralCodeToUser: mockReferralFunctions.assignReferralCodeToUser,
}));

vi.mock("@/lib/referral/tracker", () => ({
  linkReferralOnSignup: mockReferralFunctions.linkReferralOnSignup,
}));

vi.mock("@/lib/referral/fraud-detection", () => ({
  validateReferralAfterVerification: mockReferralFunctions.validateReferralAfterVerification,
}));

vi.mock("@/lib/referral/rewards", () => ({
  completeReferralAndGrantRewards: mockReferralFunctions.completeReferralAndGrantRewards,
}));

// Helper to create mock request
function createMockRequest(
  body: object,
  options?: { contentLength?: string; ip?: string },
): NextRequest {
  const headers = new Headers();
  if (options?.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  if (options?.ip) {
    headers.set("x-forwarded-for", options.ip);
  }

  const req = new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers,
  });

  req.json = vi.fn().mockResolvedValue(body);

  return req;
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default rate limit to allow requests
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 4,
      resetAt: Date.now() + 60 * 60 * 1000,
    });
    // Default bcrypt hash
    mockBcrypt.hash.mockResolvedValue("$2a$10$hashedpassword");
    // Default stable ID
    mockCreateStableUserId.mockReturnValue("stable-user-id-123");
    // Default referral functions to resolve
    mockReferralFunctions.assignReferralCodeToUser.mockResolvedValue(undefined);
    mockReferralFunctions.linkReferralOnSignup.mockResolvedValue(undefined);
    mockReferralFunctions.validateReferralAfterVerification.mockResolvedValue(null);
    mockReferralFunctions.completeReferralAndGrantRewards.mockResolvedValue(undefined);
    mockBootstrapAdmin.mockResolvedValue(undefined);
    // Default album creation
    mockPrisma.album.create.mockResolvedValue({ id: "album-1" });
  });

  describe("Rate Limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt: Date.now() + 60 * 60 * 1000,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toBe("Too many signup attempts. Please try again later.");
    });

    it("should include Retry-After header when rate limited", async () => {
      const resetAt = Date.now() + 60 * 60 * 1000;
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should use IP address for rate limiting", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest(
        { email: "test@example.com", password: "password123" },
        { ip: "192.168.1.1" },
      );
      await POST(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "signup:192.168.1.1",
        expect.any(Object),
      );
    });
  });

  describe("Input Validation", () => {
    it("should return 413 when content-length exceeds maximum", async () => {
      const req = createMockRequest(
        { email: "test@example.com", password: "password123" },
        { contentLength: "4096" },
      );
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(413);
      expect(data.error).toBe("Request too large");
    });

    it("should return 400 when email is missing", async () => {
      const req = createMockRequest({ password: "password123" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should return 400 when email is not a string", async () => {
      const req = createMockRequest({ email: 123, password: "password123" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should return 400 when password is missing", async () => {
      const req = createMockRequest({ email: "test@example.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Password is required");
    });

    it("should return 400 when password is not a string", async () => {
      const req = createMockRequest({ email: "test@example.com", password: 12345678 });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Password is required");
    });

    it("should return 400 when password is too short", async () => {
      const req = createMockRequest({ email: "test@example.com", password: "short" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Password must be at least 8 characters");
    });

    it("should return 400 for invalid email format", async () => {
      const req = createMockRequest({ email: "invalid-email", password: "password123" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });
  });

  describe("User Creation", () => {
    it("should create user successfully with valid email and password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Account created successfully");
      expect(data.user.email).toBe("test@example.com");
    });

    it("should return 409 when user already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user-id",
      });

      const req = createMockRequest({
        email: "existing@example.com",
        password: "password123",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe("An account with this email already exists");
    });

    it("should hash password before storing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: "$2a$10$hashedpassword",
          }),
        }),
      );
    });

    it("should normalize email to lowercase", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest({
        email: "TEST@EXAMPLE.COM",
        password: "password123",
      });
      await POST(req);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true },
      });
    });

    it("should trim whitespace from email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest({
        email: "  test@example.com  ",
        password: "password123",
      });
      await POST(req);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true },
      });
    });

    it("should use stable user ID from auth config", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });
      mockCreateStableUserId.mockReturnValue("custom-stable-id");

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockCreateStableUserId).toHaveBeenCalledWith("test@example.com");
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "custom-stable-id",
          }),
        }),
      );
    });
  });

  describe("Post-Signup Tasks", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });
    });

    it("should bootstrap admin if needed", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockBootstrapAdmin).toHaveBeenCalledWith("stable-user-id-123");
    });

    it("should assign referral code to new user", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockReferralFunctions.assignReferralCodeToUser).toHaveBeenCalledWith("stable-user-id-123");
    });

    it("should link referral on signup", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockReferralFunctions.linkReferralOnSignup).toHaveBeenCalledWith("stable-user-id-123");
    });

    it("should create default public album", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockPrisma.album.create).toHaveBeenCalledWith({
        data: {
          userId: "stable-user-id-123",
          name: "Public Gallery",
          privacy: "PUBLIC",
          defaultTier: "TIER_1K",
          description: "My public enhancements",
        },
      });
    });

    it("should process referral rewards if validation passes", async () => {
      mockReferralFunctions.validateReferralAfterVerification.mockResolvedValue({
        shouldGrantRewards: true,
        referralId: "referral-123",
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockReferralFunctions.completeReferralAndGrantRewards).toHaveBeenCalledWith("referral-123");
    });

    it("should not process referral rewards if validation fails", async () => {
      mockReferralFunctions.validateReferralAfterVerification.mockResolvedValue({
        shouldGrantRewards: false,
        referralId: null,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(mockReferralFunctions.completeReferralAndGrantRewards).not.toHaveBeenCalled();
    });

    it("should continue signup even if post-signup tasks fail", async () => {
      mockBootstrapAdmin.mockRejectedValue(new Error("Bootstrap failed"));
      mockReferralFunctions.assignReferralCodeToUser.mockRejectedValue(new Error("Referral failed"));
      mockPrisma.album.create.mockRejectedValue(new Error("Album failed"));

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      const res = await POST(req);
      const data = await res.json();

      // Signup should still succeed
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to create account");
    });

    it("should return 500 when user creation fails", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockRejectedValue(new Error("Create failed"));

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to create account");
    });

    it("should log error when signup fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({
        email: "test@example.com",
        password: "password123",
      });
      await POST(req);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Signup error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Valid Email Formats", () => {
    const validEmails = [
      "simple@example.com",
      "very.common@example.com",
      "user.name+tag@example.com",
      "x@example.com",
      "example@s.example",
    ];

    it.each(validEmails)("should accept valid email: %s", async (email) => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: email.toLowerCase(),
        name: null,
      });

      const req = createMockRequest({ email, password: "password123" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Invalid Email Formats", () => {
    const invalidEmails = [
      "",
      "plainaddress",
      "@missinglocal.com",
      "spaces in@email.com",
    ];

    it.each(invalidEmails)("should reject invalid email: %s", async (email) => {
      const req = createMockRequest({ email, password: "password123" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/email/i);
    });
  });

  describe("Password Validation", () => {
    it("should accept password with exactly 8 characters", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "12345678",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject password with 7 characters", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "1234567",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Password must be at least 8 characters");
    });

    it("should accept long passwords", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "stable-user-id-123",
        email: "test@example.com",
        name: null,
      });

      const req = createMockRequest({
        email: "test@example.com",
        password: "a".repeat(100),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
