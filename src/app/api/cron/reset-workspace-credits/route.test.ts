/**
 * Unit tests for reset-workspace-credits cron route
 */

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock the subscription service
vi.mock("@/lib/subscription/workspace-subscription", () => ({
  WorkspaceSubscriptionService: {
    findWorkspacesForCreditReset: vi.fn(),
    resetMonthlyCredits: vi.fn(),
  },
}));

import { WorkspaceSubscriptionService } from "@/lib/subscription/workspace-subscription";

const mockFindWorkspaces = WorkspaceSubscriptionService.findWorkspacesForCreditReset as ReturnType<
  typeof vi.fn
>;
const mockResetCredits = WorkspaceSubscriptionService.resetMonthlyCredits as ReturnType<
  typeof vi.fn
>;

function createMockRequest(authHeader?: string): NextRequest {
  return {
    headers: {
      get: (name: string) => (name === "authorization" ? authHeader : null),
    },
  } as unknown as NextRequest;
}

describe("reset-workspace-credits cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment
    delete process.env.CRON_SECRET;
  });

  describe("authentication", () => {
    it("should allow request when no CRON_SECRET is set", async () => {
      mockFindWorkspaces.mockResolvedValue([]);

      const response = await GET(createMockRequest());

      expect(response.status).toBe(200);
    });

    it("should reject request with invalid auth when CRON_SECRET is set", async () => {
      process.env.CRON_SECRET = "secret123";

      const response = await GET(createMockRequest("Bearer wrong"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should allow request with valid auth when CRON_SECRET is set", async () => {
      process.env.CRON_SECRET = "secret123";
      mockFindWorkspaces.mockResolvedValue([]);

      const response = await GET(createMockRequest("Bearer secret123"));

      expect(response.status).toBe(200);
    });
  });

  describe("credit reset", () => {
    it("should return success when no workspaces need reset", async () => {
      mockFindWorkspaces.mockResolvedValue([]);

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.totalFound).toBe(0);
      expect(data.result.successfulResets).toBe(0);
    });

    it("should reset credits for found workspaces", async () => {
      mockFindWorkspaces.mockResolvedValue(["ws-1", "ws-2", "ws-3"]);
      mockResetCredits.mockResolvedValue({ success: true });

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.totalFound).toBe(3);
      expect(data.result.successfulResets).toBe(3);
      expect(data.result.failedResets).toBe(0);
      expect(mockResetCredits).toHaveBeenCalledTimes(3);
      expect(mockResetCredits).toHaveBeenCalledWith("ws-1");
      expect(mockResetCredits).toHaveBeenCalledWith("ws-2");
      expect(mockResetCredits).toHaveBeenCalledWith("ws-3");
    });

    it("should handle partial failures", async () => {
      mockFindWorkspaces.mockResolvedValue(["ws-1", "ws-2", "ws-3"]);
      mockResetCredits
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "DB error" })
        .mockResolvedValueOnce({ success: true });

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false); // Because there was a failure
      expect(data.result.successfulResets).toBe(2);
      expect(data.result.failedResets).toBe(1);
      expect(data.result.errorCount).toBe(1);
    });

    it("should handle thrown errors in reset", async () => {
      mockFindWorkspaces.mockResolvedValue(["ws-1"]);
      mockResetCredits.mockRejectedValue(new Error("Connection failed"));

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.result.failedResets).toBe(1);
    });

    it("should return 500 when findWorkspaces fails", async () => {
      mockFindWorkspaces.mockRejectedValue(new Error("Database connection failed"));

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to find workspaces");
    });

    it("should include timestamp and duration in response", async () => {
      mockFindWorkspaces.mockResolvedValue([]);

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(data.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
