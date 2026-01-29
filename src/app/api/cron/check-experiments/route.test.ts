/**
 * Tests for Experiment Auto-Winner Cron Route
 * Epic #516
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { processAutoWinnerSelection } from "@/lib/hypothesis-agent/core/auto-winner-processor";

// Mock dependencies
vi.mock("@/lib/hypothesis-agent/core/auto-winner-processor");

describe("GET /api/cron/check-experiments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env var
    process.env.CRON_SECRET = "test-secret";
  });

  it("should reject requests without proper authorization", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/check-experiments");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject requests with invalid authorization", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/check-experiments", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should process experiments with valid authorization", async () => {
    const mockResult = {
      totalChecked: 5,
      winnersSelected: 2,
      stillRunning: 3,
      errors: [],
    };

    vi.mocked(processAutoWinnerSelection).mockResolvedValue(mockResult);

    const request = new NextRequest("http://localhost:3000/api/cron/check-experiments", {
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.totalChecked).toBe(5);
    expect(data.result.winnersSelected).toBe(2);
    expect(data.result.stillRunning).toBe(3);
    expect(data.result.errorCount).toBe(0);
  });

  it("should handle processing errors", async () => {
    vi.mocked(processAutoWinnerSelection).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = new NextRequest("http://localhost:3000/api/cron/check-experiments", {
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Auto-winner processing failed");
  });

  it("should include error details in response", async () => {
    const mockResult = {
      totalChecked: 3,
      winnersSelected: 1,
      stillRunning: 1,
      errors: [
        { experimentId: "exp_123", error: "Invalid variant configuration" },
        { experimentId: "exp_456", error: "Insufficient data" },
      ],
    };

    vi.mocked(processAutoWinnerSelection).mockResolvedValue(mockResult);

    const request = new NextRequest("http://localhost:3000/api/cron/check-experiments", {
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.errorCount).toBe(2);
    expect(data.result.errors).toHaveLength(2);
    expect(data.result.errors[0].experimentId).toBe("exp_123");
  });

  it("should work when CRON_SECRET is not set (development mode)", async () => {
    delete process.env.CRON_SECRET;

    const mockResult = {
      totalChecked: 1,
      winnersSelected: 0,
      stillRunning: 1,
      errors: [],
    };

    vi.mocked(processAutoWinnerSelection).mockResolvedValue(mockResult);

    const request = new NextRequest("http://localhost:3000/api/cron/check-experiments");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
