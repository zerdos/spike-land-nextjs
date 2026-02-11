import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReportErrorsBatchToDatabase = vi.fn();

vi.mock("@/lib/errors/error-reporter.server", () => ({
  reportErrorsBatchToDatabase: mockReportErrorsBatchToDatabase,
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
    mockReportErrorsBatchToDatabase.mockResolvedValue(undefined);
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

  it("processes valid errors via batch insert and returns success count", async () => {
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
    // Single batch call instead of N individual calls
    expect(mockReportErrorsBatchToDatabase).toHaveBeenCalledTimes(1);
    expect(mockReportErrorsBatchToDatabase).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          error: expect.objectContaining({ message: "Error 1" }),
          environment: "FRONTEND",
        }),
        expect.objectContaining({
          error: expect.objectContaining({ message: "Error 2" }),
          environment: "FRONTEND",
        }),
      ]),
    );
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

  it("logs console.warn on batch DB failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockReportErrorsBatchToDatabase.mockRejectedValueOnce(
      new Error("DB connection lost"),
    );

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
    // Batch function called once with 20 items
    expect(mockReportErrorsBatchToDatabase).toHaveBeenCalledTimes(1);
    const batchArg = mockReportErrorsBatchToDatabase.mock.calls[0]![0];
    expect(batchArg).toHaveLength(20);
  });

  it("sanitizes error fields to max length", async () => {
    const longMessage = "x".repeat(20000);
    const response = await POST(
      makeRequest({
        errors: [{ message: longMessage }],
      }),
    );
    expect(response.status).toBe(200);

    const batchArg = mockReportErrorsBatchToDatabase.mock.calls[0]![0];
    expect(batchArg[0].error.message.length).toBe(10000);
  });

  it("defaults environment to FRONTEND", async () => {
    await POST(makeRequest({ errors: [{ message: "test" }] }));
    const batchArg = mockReportErrorsBatchToDatabase.mock.calls[0]![0];
    expect(batchArg[0].environment).toBe("FRONTEND");
  });

  it("passes BACKEND environment when specified", async () => {
    await POST(
      makeRequest({
        errors: [{ message: "test", environment: "BACKEND" }],
      }),
    );
    const batchArg = mockReportErrorsBatchToDatabase.mock.calls[0]![0];
    expect(batchArg[0].environment).toBe("BACKEND");
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

  it("does not call batch insert when all errors are invalid", async () => {
    const response = await POST(
      makeRequest({
        errors: [
          { noMessage: true },
          { message: 123 },
        ],
      }),
    );
    const json = await response.json();
    expect(json.received).toBe(0);
    expect(json.failed).toBe(2);
    // createMany called with empty array is a no-op
    expect(mockReportErrorsBatchToDatabase).toHaveBeenCalledWith([]);
  });
});
