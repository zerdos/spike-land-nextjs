import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { GET } from "./route";

const mockPrisma = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
};
const mockLogger = logger as unknown as {
  error: ReturnType<typeof vi.fn>;
};

function makeRequest(
  options: {
    bearer?: string;
    cronSecret?: string;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (options.bearer) {
    headers.set("authorization", `Bearer ${options.bearer}`);
  }
  if (options.cronSecret) {
    headers.set("x-cron-secret", options.cronSecret);
  }
  return new NextRequest("http://localhost/api/cron/create-agent-alert", {
    method: "GET",
    headers,
  });
}

describe("GET /api/cron/create-agent-alert", () => {
  const CRON_SECRET = "test-cron-secret";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    // Default: healthy metrics
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ total: 10n, successes: 8n }]) // success rate
      .mockResolvedValueOnce([{ p95: 30000 }]) // latency
      .mockResolvedValueOnce([
        // recent attempts
        { success: true },
        { success: true },
        { success: false },
        { success: true },
      ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  // Auth tests
  it("returns 401 when no auth provided", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong Bearer token", async () => {
    const res = await GET(makeRequest({ bearer: "wrong-token" }));
    expect(res.status).toBe(401);
  });

  it("accepts valid Bearer token", async () => {
    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    expect(res.status).toBe(200);
  });

  it("accepts valid x-cron-secret header", async () => {
    const res = await GET(makeRequest({ cronSecret: CRON_SECRET }));
    expect(res.status).toBe(200);
  });

  it("allows in development when no CRON_SECRET configured", async () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "development";
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    process.env.NODE_ENV = "test";
  });

  // Alert condition tests
  it("does not trigger alerts when metrics are healthy", async () => {
    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.alertsTriggered).toBe(0);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("triggers low_success_rate alert when below 50%", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ total: 10n, successes: 3n }]) // 30% success
      .mockResolvedValueOnce([{ p95: 30000 }])
      .mockResolvedValueOnce([{ success: true }]);

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    expect(data.alertsTriggered).toBe(1);
    expect(
      data.checks.find(
        (c: { alertType: string }) => c.alertType === "low_success_rate",
      ).triggered,
    ).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "ALERT",
      expect.objectContaining({
        alertType: "low_success_rate",
      }),
    );
  });

  it("triggers high_latency alert when p95 > 90s", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ total: 10n, successes: 8n }])
      .mockResolvedValueOnce([{ p95: 95000 }]) // 95s > 90s threshold
      .mockResolvedValueOnce([{ success: true }]);

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    const latencyCheck = data.checks.find(
      (c: { alertType: string }) => c.alertType === "high_latency",
    );
    expect(latencyCheck.triggered).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "ALERT",
      expect.objectContaining({
        alertType: "high_latency",
      }),
    );
  });

  it("triggers consecutive_failures alert when 5+ in a row", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ total: 10n, successes: 5n }])
      .mockResolvedValueOnce([{ p95: 30000 }])
      .mockResolvedValueOnce([
        { success: false },
        { success: false },
        { success: false },
        { success: false },
        { success: false },
        { success: true },
      ]);

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    const failureCheck = data.checks.find(
      (c: { alertType: string }) => c.alertType === "consecutive_failures",
    );
    expect(failureCheck.triggered).toBe(true);
    expect(failureCheck.value).toBe(5);
  });

  it("does not trigger consecutive_failures with only 4 in a row", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ total: 10n, successes: 6n }])
      .mockResolvedValueOnce([{ p95: 30000 }])
      .mockResolvedValueOnce([
        { success: false },
        { success: false },
        { success: false },
        { success: false },
        { success: true },
      ]);

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    const failureCheck = data.checks.find(
      (c: { alertType: string }) => c.alertType === "consecutive_failures",
    );
    expect(failureCheck.triggered).toBe(false);
  });

  it("handles no generation attempts gracefully", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ total: 0n, successes: 0n }])
      .mockResolvedValueOnce([{ p95: null }])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.alertsTriggered).toBe(0);
  });

  it("returns 500 when database query fails", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockRejectedValue(new Error("DB connection lost"));

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    expect(res.status).toBe(500);
  });

  it("can trigger multiple alerts simultaneously", async () => {
    mockPrisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ total: 10n, successes: 2n }]) // 20% success
      .mockResolvedValueOnce([{ p95: 100000 }]) // 100s latency
      .mockResolvedValueOnce([
        { success: false },
        { success: false },
        { success: false },
        { success: false },
        { success: false },
      ]);

    const res = await GET(makeRequest({ bearer: CRON_SECRET }));
    const data = await res.json();

    expect(data.alertsTriggered).toBe(3);
    expect(mockLogger.error).toHaveBeenCalledTimes(3);
  });
});
