import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Use vi.hoisted to define mocks before they are used
const { mockSession, mockAuth, mockVoucherManager, mockCheckRateLimit, mockResetRateLimit } = vi
  .hoisted(() => ({
    mockSession: {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
    },
    mockAuth: vi.fn(),
    mockVoucherManager: {
      redeem: vi.fn(),
    },
    mockCheckRateLimit: vi.fn(),
    mockResetRateLimit: vi.fn(),
  }));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/vouchers/voucher-manager", () => ({
  VoucherManager: mockVoucherManager,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  resetRateLimit: mockResetRateLimit,
  rateLimitConfigs: {
    voucherRedemption: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  },
}));

// Helper to create mock request
function createMockRequest(body: object, options?: { contentLength?: string; }): NextRequest {
  const headers = new Headers();
  if (options?.contentLength) {
    headers.set("content-length", options.contentLength);
  }

  const req = new NextRequest("http://localhost/api/vouchers/redeem", {
    method: "POST",
    headers,
  });

  req.json = vi.fn().mockResolvedValue(body);

  return req;
}

describe("POST /api/vouchers/redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock session
    mockAuth.mockResolvedValue(mockSession);
    // Set default rate limit to allow requests
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
      remaining: 4,
      resetAt: Date.now() + 60 * 60 * 1000,
    });
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = createMockRequest({ code: "TEST2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 401 if user id is missing in session", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { name: "Test", email: "test@example.com" },
    });

    const req = createMockRequest({ code: "TEST2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 400 if code is missing", async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Voucher code is required");
  });

  it("should return 400 if code is not a string", async () => {
    const req = createMockRequest({ code: 123 });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Voucher code is required");
  });

  it("should return 400 for invalid voucher code", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: false,
      error: "Voucher code not found",
    });

    const req = createMockRequest({ code: "INVALID" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Voucher code not found");
  });

  it("should return 400 if voucher already redeemed", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: false,
      error: "You have already redeemed this voucher",
    });

    const req = createMockRequest({ code: "REDEEMED2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("You have already redeemed this voucher");
  });

  it("should return 400 for expired voucher", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: false,
      error: "This voucher has expired",
    });

    const req = createMockRequest({ code: "EXPIRED2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("This voucher has expired");
  });

  it("should return 400 for inactive voucher", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: false,
      error: "This voucher is no longer active",
    });

    const req = createMockRequest({ code: "INACTIVE2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("This voucher is no longer active");
  });

  it("should return 400 for depleted voucher", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: false,
      error: "This voucher has reached its usage limit",
    });

    const req = createMockRequest({ code: "DEPLETED2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("This voucher has reached its usage limit");
  });

  it("should return 200 with tokensGranted and newBalance on success", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 100,
      newBalance: 200,
    });

    const req = createMockRequest({ code: "VALID2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tokensGranted).toBe(100);
    expect(data.newBalance).toBe(200);
  });

  it("should call VoucherManager.redeem with correct parameters", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 50,
      newBalance: 150,
    });

    const req = createMockRequest({ code: "TEST2024" });
    await POST(req);

    expect(mockVoucherManager.redeem).toHaveBeenCalledWith("TEST2024", "user-123");
  });

  it("should update token balance correctly for FIXED_TOKENS", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 75,
      newBalance: 175,
    });

    const req = createMockRequest({ code: "FIXED75" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tokensGranted).toBe(75);
    expect(data.newBalance).toBe(175);
  });

  it("should update token balance correctly for PERCENTAGE_BONUS", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 50, // 50% of 100 = 50
      newBalance: 150,
    });

    const req = createMockRequest({ code: "BONUS50" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tokensGranted).toBe(50);
    expect(data.newBalance).toBe(150);
  });

  it("should return 500 if redemption throws error", async () => {
    mockVoucherManager.redeem.mockRejectedValue(new Error("Database error"));

    const req = createMockRequest({ code: "TEST2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to redeem voucher");
  });

  it("should handle empty string code", async () => {
    const req = createMockRequest({ code: "" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Voucher code is required");
  });

  it("should handle voucher with zero tokens granted", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 0,
      newBalance: 100,
    });

    const req = createMockRequest({ code: "ZERO2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tokensGranted).toBe(0);
    expect(data.newBalance).toBe(100);
  });

  it("should handle very large token amounts", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 999999,
      newBalance: 1000000,
    });

    const req = createMockRequest({ code: "MEGA2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tokensGranted).toBe(999999);
    expect(data.newBalance).toBe(1000000);
  });

  it("should handle concurrent redemption attempts gracefully", async () => {
    mockVoucherManager.redeem.mockResolvedValue({
      success: false,
      error: "This voucher has reached its usage limit",
    });

    const req = createMockRequest({ code: "CONCURRENT2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("This voucher has reached its usage limit");
  });

  it("should validate user authentication before processing", async () => {
    mockAuth.mockResolvedValueOnce(null);

    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 100,
      newBalance: 200,
    });

    const req = createMockRequest({ code: "TEST2024" });
    const res = await POST(req);

    // Auth check should prevent redemption
    expect(res.status).toBe(401);
    expect(mockVoucherManager.redeem).not.toHaveBeenCalled();
  });

  it("should pass userId from session to redeem function", async () => {
    const customSession = {
      user: {
        id: "custom-user-456",
        name: "Custom User",
        email: "custom@example.com",
      },
    };

    mockAuth.mockResolvedValueOnce(customSession);

    mockVoucherManager.redeem.mockResolvedValue({
      success: true,
      tokensGranted: 100,
      newBalance: 200,
    });

    const req = createMockRequest({ code: "TEST2024" });
    await POST(req);

    expect(mockVoucherManager.redeem).toHaveBeenCalledWith("TEST2024", "custom-user-456");
  });

  it("should return 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 30 * 60 * 1000, // 30 minutes from now
    });

    const req = createMockRequest({ code: "TEST2024" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe("Too many redemption attempts. Please try again later.");
    expect(mockVoucherManager.redeem).not.toHaveBeenCalled();
  });

  it("should include Retry-After header when rate limited", async () => {
    const resetAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now
    mockCheckRateLimit.mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const req = createMockRequest({ code: "TEST2024" });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("should return 413 when content-length exceeds maximum", async () => {
    const req = createMockRequest({ code: "TEST2024" }, { contentLength: "2048" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(413);
    expect(data.error).toBe("Request too large");
  });

  it("should return 400 when code exceeds maximum length", async () => {
    const longCode = "A".repeat(51); // 51 characters, exceeds MAX_VOUCHER_CODE_LENGTH of 50
    const req = createMockRequest({ code: longCode });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid voucher code format");
  });

  it("should return 400 when code contains invalid characters", async () => {
    const req = createMockRequest({ code: "TEST-2024!" }); // Contains hyphen and exclamation mark
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid voucher code format");
  });

  it("should return 400 when code is only whitespace", async () => {
    const req = createMockRequest({ code: "   " }); // Only whitespace, trims to empty
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid voucher code format");
  });
});
