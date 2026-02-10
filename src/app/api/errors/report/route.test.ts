import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReportErrorToDatabase = vi.fn();

vi.mock("@/lib/errors/error-reporter.server", () => ({
  reportErrorToDatabase: mockReportErrorToDatabase,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

const { checkRateLimit } = await import("@/lib/rate-limiter");
const { POST } = await import("./route");

function makeRequest(body?: unknown): Request {
  return new NextRequest("http://localhost:3000/api/errors/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("/api/errors/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 19,
      resetAt: Date.now() + 60000,
    });
    mockReportErrorToDatabase.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const response = await POST(makeRequest({ errors: [{ message: "test" }] }));
    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toBe("Rate limit exceeded");
  });

  it("returns 400 for missing errors array", async () => {
    const response = await POST(makeRequest({ notErrors: [] }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("errors array required");
  });

  it("processes valid errors and returns success count", async () => {
    const response = await POST(
      makeRequest({
        errors: [
          { message: "Error 1" },
          { message: "Error 2" },
        ],
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.received).toBe(2);
    expect(json.failed).toBe(0);
    expect(mockReportErrorToDatabase).toHaveBeenCalledTimes(2);
  });

  it("skips errors without message and increments failCount", async () => {
    const response = await POST(
      makeRequest({
        errors: [
          { message: "Valid error" },
          { noMessage: true },
          { message: 123 },
        ],
      }),
    );
    const json = await response.json();
    expect(json.received).toBe(1);
    expect(json.failed).toBe(2);
  });

  it("logs console.warn on first DB failure per batch", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockReportErrorToDatabase
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockRejectedValueOnce(new Error("DB still down"));

    const response = await POST(
      makeRequest({
        errors: [
          { message: "Error 1" },
          { message: "Error 2" },
        ],
      }),
    );

    const json = await response.json();
    expect(json.received).toBe(0);
    expect(json.failed).toBe(2);

    // Should log only once for the first failure
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[ErrorReport API] Database write failed:",
      "DB connection lost",
    );

    warnSpy.mockRestore();
  });

  it("truncates to MAX_ERRORS_PER_REQUEST (20)", async () => {
    const errors = Array.from({ length: 25 }, (_, i) => ({
      message: `Error ${i}`,
    }));

    const response = await POST(makeRequest({ errors }));
    const json = await response.json();
    expect(json.truncated).toBe(true);
    expect(mockReportErrorToDatabase).toHaveBeenCalledTimes(20);
  });

  it("sanitizes error fields to max length", async () => {
    const longMessage = "x".repeat(20000);
    const response = await POST(
      makeRequest({
        errors: [{ message: longMessage }],
      }),
    );
    expect(response.status).toBe(200);

    const callArgs = mockReportErrorToDatabase.mock.calls[0]![0];
    expect(callArgs.message.length).toBe(10000);
  });

  it("defaults environment to FRONTEND", async () => {
    await POST(makeRequest({ errors: [{ message: "test" }] }));
    expect(mockReportErrorToDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "FRONTEND" }),
      "FRONTEND",
    );
  });

  it("passes BACKEND environment when specified", async () => {
    await POST(
      makeRequest({
        errors: [{ message: "test", environment: "BACKEND" }],
      }),
    );
    expect(mockReportErrorToDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "BACKEND" }),
      "BACKEND",
    );
  });

  it("returns 500 on unexpected request parsing error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const badRequest = {
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as unknown as Request;

    const response = await POST(badRequest);
    expect(response.status).toBe(500);

    errorSpy.mockRestore();
  });
});
