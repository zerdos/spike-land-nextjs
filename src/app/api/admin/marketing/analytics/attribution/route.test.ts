/**
 * Attribution Analytics API Route Tests
 */

import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock attribution service
vi.mock("@/lib/tracking/attribution", () => ({
  getGlobalAttributionSummary: vi.fn(),
}));

const { auth } = await import("@/auth");
const { getGlobalAttributionSummary } = await import(
  "@/lib/tracking/attribution"
);

describe("GET /api/admin/marketing/analytics/attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-123",
        name: "Admin",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  describe("Authentication and authorization", () => {
    it("should return 401 for unauthenticated request", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 401 for non-admin user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-123",
          role: UserRole.USER,
        } as never,
        expires: new Date().toISOString(),
      });

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("Request validation", () => {
    it("should return 400 for missing startDate", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?endDate=2024-01-31",
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for missing endDate", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?startDate=2024-01-01",
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid dates", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?startDate=invalid&endDate=2024-01-31",
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Success cases", () => {
    it("should return attribution summary", async () => {
      const mockSummary = {
        totalConversions: 10,
        comparison: [
          { model: "FIRST_TOUCH", value: 100, conversionCount: 10 },
        ],
        platformBreakdown: [
          {
            platform: "GOOGLE",
            conversionCount: 5,
            value: 50,
            model: "FIRST_TOUCH",
          },
        ],
      };

      vi.mocked(getGlobalAttributionSummary).mockResolvedValue(
        mockSummary as never,
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSummary);
      expect(getGlobalAttributionSummary).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe("Error handling", () => {
    it("should return 500 on service error", async () => {
      vi.mocked(getGlobalAttributionSummary).mockRejectedValue(
        new Error("Service failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/analytics/attribution?startDate=2024-01-01&endDate=2024-01-31",
      );

      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });
});
