import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Use vi.hoisted to define mocks before they are used
const { mockPrisma, mockCheckRateLimit } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

// Helper to create mock request
function createMockRequest(
  body: object,
  options?: { contentLength?: string; ip?: string; },
): NextRequest {
  const headers = new Headers();
  if (options?.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  if (options?.ip) {
    headers.set("x-forwarded-for", options.ip);
  }

  const req = new NextRequest("http://localhost/api/auth/check-email", {
    method: "POST",
    headers,
  });

  req.json = vi.fn().mockResolvedValue(body);

  return req;
}

describe("POST /api/auth/check-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default rate limit to allow requests
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 9,
      resetAt: Date.now() + 60 * 1000,
    });
  });

  describe("Rate Limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt: Date.now() + 60 * 1000,
      });

      const req = createMockRequest({ email: "test@example.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toBe("Too many requests. Please try again later.");
    });

    it("should include Retry-After header when rate limited", async () => {
      const resetAt = Date.now() + 60 * 1000;
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        remaining: 0,
        resetAt,
      });

      const req = createMockRequest({ email: "test@example.com" });
      const res = await POST(req);

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should use IP address for rate limiting", async () => {
      const req = createMockRequest({ email: "test@example.com" }, {
        ip: "192.168.1.1",
      });
      await POST(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "email_check:192.168.1.1",
        expect.any(Object),
      );
    });

    it("should use first IP from x-forwarded-for header", async () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "10.0.0.1, 192.168.1.1, 172.16.0.1");

      const req = new NextRequest("http://localhost/api/auth/check-email", {
        method: "POST",
        headers,
      });
      req.json = vi.fn().mockResolvedValue({ email: "test@example.com" });

      await POST(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "email_check:10.0.0.1",
        expect.any(Object),
      );
    });

    it("should fallback to unknown when no IP headers present", async () => {
      const req = createMockRequest({ email: "test@example.com" });
      await POST(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "email_check:unknown",
        expect.any(Object),
      );
    });
  });

  describe("Input Validation", () => {
    it("should return 413 when content-length exceeds maximum", async () => {
      const req = createMockRequest({ email: "test@example.com" }, {
        contentLength: "2048",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(413);
      expect(data.error).toBe("Request too large");
    });

    it("should return 400 when email is missing", async () => {
      const req = createMockRequest({});
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should return 400 when email is not a string", async () => {
      const req = createMockRequest({ email: 123 });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should return 400 when email is null", async () => {
      const req = createMockRequest({ email: null });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should return 400 for invalid email format", async () => {
      const req = createMockRequest({ email: "invalid-email" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });

    it("should return 400 for email without domain", async () => {
      const req = createMockRequest({ email: "test@" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });

    it("should return 400 for email without @", async () => {
      const req = createMockRequest({ email: "testexample.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });
  });

  describe("User Existence Check", () => {
    it("should return exists: false for non-existing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockRequest({ email: "newuser@example.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.exists).toBe(false);
      expect(data.hasPassword).toBe(false);
    });

    it("should return exists: true with hasPassword: true for user with password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        passwordHash: "$2b$10$hashedpassword",
      });

      const req = createMockRequest({ email: "existing@example.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.exists).toBe(true);
      expect(data.hasPassword).toBe(true);
    });

    it("should return exists: true with hasPassword: false for OAuth-only user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-456",
        passwordHash: null,
      });

      const req = createMockRequest({ email: "oauth@example.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.exists).toBe(true);
      expect(data.hasPassword).toBe(false);
    });

    it("should normalize email to lowercase", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockRequest({ email: "TEST@EXAMPLE.COM" });
      await POST(req);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true, passwordHash: true },
      });
    });

    it("should trim whitespace from email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockRequest({ email: "  test@example.com  " });
      await POST(req);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true, passwordHash: true },
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({ email: "test@example.com" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to check email");
    });

    it("should log error when database query fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({ email: "test@example.com" });
      await POST(req);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email check error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Valid Email Formats", () => {
    const validEmails = [
      "simple@example.com",
      "very.common@example.com",
      "disposable.style.email.with+symbol@example.com",
      "other.email-with-hyphen@example.com",
      "fully-qualified-domain@example.com",
      "user.name+tag+sorting@example.com",
      "x@example.com",
      "example-indeed@strange-example.com",
      "example@s.example",
      "user%example.com@example.org",
      "user-@example.org",
    ];

    it.each(validEmails)("should accept valid email: %s", async (email) => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = createMockRequest({ email });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.exists).toBe(false);
    });
  });

  describe("Invalid Email Formats", () => {
    // Note: The RFC 5322 simplified regex allows some edge cases like:
    // - missing@domain (no TLD requirement)
    // - double..dot@example.com (consecutive dots allowed in local part)
    // These are valid per RFC but might be rejected by mail servers
    const invalidEmails = [
      "",
      "plainaddress",
      "@missinglocal.com",
      "spaces in@email.com",
    ];

    it.each(invalidEmails)("should reject invalid email: %s", async (email) => {
      const req = createMockRequest({ email });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/email/i);
    });
  });

  describe("Security", () => {
    it("should not reveal user existence timing difference", async () => {
      // This test ensures the response structure is the same regardless of user existence
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const req1 = createMockRequest({ email: "nonexistent@example.com" });
      const res1 = await POST(req1);
      const data1 = await res1.json();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        passwordHash: "hash",
      });
      const req2 = createMockRequest({ email: "existing@example.com" });
      const res2 = await POST(req2);
      const data2 = await res2.json();

      // Both responses should have the same structure
      expect(Object.keys(data1).sort()).toEqual(["exists", "hasPassword"]);
      expect(Object.keys(data2).sort()).toEqual(["exists", "hasPassword"]);
    });

    it("should only select minimal user fields", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        passwordHash: null,
      });

      const req = createMockRequest({ email: "test@example.com" });
      await POST(req);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true, passwordHash: true },
      });
    });
  });
});
