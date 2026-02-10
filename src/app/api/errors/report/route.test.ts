import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/errors/error-reporter.server", () => ({
  reportErrorToDatabase: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ isLimited: false, remaining: 19, resetAt: Date.now() + 60000 }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

import { reportErrorToDatabase } from "@/lib/errors/error-reporter.server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/errors/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/errors/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 19,
      resetAt: Date.now() + 60000,
    });
  });

  it("should process valid error reports", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    const response = await POST(
      makeRequest({
        errors: [
          { message: "Test error", errorType: "Error", timestamp: new Date().toISOString() },
        ],
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.received).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("should reject requests without errors array", async () => {
    const response = await POST(makeRequest({ notErrors: [] }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request body: errors array required");
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const response = await POST(
      makeRequest({ errors: [{ message: "test" }] }),
    );

    expect(response.status).toBe(429);
  });

  it("should skip errors without message", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    const response = await POST(
      makeRequest({
        errors: [
          { notMessage: "missing" },
          { message: "valid error" },
        ],
      }),
    );

    const body = await response.json();
    expect(body.received).toBe(1);
    expect(body.failed).toBe(1);
  });

  it("should truncate batch to MAX_ERRORS_PER_REQUEST", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    const errors = Array.from({ length: 25 }, (_, i) => ({
      message: `Error ${i}`,
    }));
    const response = await POST(makeRequest({ errors }));

    const body = await response.json();
    expect(body.truncated).toBe(true);
    expect(reportErrorToDatabase).toHaveBeenCalledTimes(20);
  });

  it("should warn on first DB write failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(reportErrorToDatabase).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const response = await POST(
      makeRequest({
        errors: [
          { message: "error1" },
          { message: "error2" },
        ],
      }),
    );

    const body = await response.json();
    expect(body.failed).toBe(2);
    // Should only warn once (first failure)
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[ErrorReport] DB write failed:",
      "DB connection failed",
    );

    warnSpy.mockRestore();
  });

  it("should sanitize long message fields", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    const longMessage = "x".repeat(20000);
    await POST(makeRequest({ errors: [{ message: longMessage }] }));

    expect(reportErrorToDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ message: "x".repeat(10000) }),
      "FRONTEND",
    );
  });

  it("should use BACKEND environment when specified", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    await POST(
      makeRequest({
        errors: [{ message: "server error", environment: "BACKEND" }],
      }),
    );

    expect(reportErrorToDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "BACKEND" }),
      "BACKEND",
    );
  });

  it("should default to FRONTEND environment", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    await POST(makeRequest({ errors: [{ message: "client error" }] }));

    expect(reportErrorToDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "FRONTEND" }),
      "FRONTEND",
    );
  });

  it("should return 500 on request processing error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const badRequest = {
      json: () => {
        throw new Error("Invalid JSON");
      },
    } as unknown as Request;

    const response = await POST(badRequest);

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });

  it("should include rate limit header in response", async () => {
    vi.mocked(reportErrorToDatabase).mockResolvedValue(undefined);

    const response = await POST(
      makeRequest({ errors: [{ message: "test" }] }),
    );

    expect(response.headers.get("X-RateLimit-Remaining")).toBe("19");
  });
});
