/**
 * Tests for Admin Marketing Accounts API Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions
const mockAuth = vi.fn();
const mockIsAdminByUserId = vi.fn();
const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  isAdminByUserId: mockIsAdminByUserId,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
    },
  },
}));

// Import route after mocks are set up
const { GET, DELETE } = await import("./route");

describe("Admin Marketing Accounts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockIsAdminByUserId.mockReset();
    mockFindMany.mockReset();
    mockUpdateMany.mockReset();
  });

  describe("GET /api/admin/marketing/accounts", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user has no id", async () => {
      mockAuth.mockResolvedValueOnce({ user: {} });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return marketing accounts for admin user", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);

      const mockAccounts = [
        {
          id: "acc1",
          platform: "FACEBOOK",
          accountId: "123",
          accountName: "Test Account",
          isActive: true,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-02"),
          expiresAt: new Date("2025-12-31"),
        },
        {
          id: "acc2",
          platform: "GOOGLE_ADS",
          accountId: "456",
          accountName: "Google Account",
          isActive: true,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-02"),
          expiresAt: null,
        },
      ];

      mockFindMany.mockResolvedValueOnce(mockAccounts);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(2);
      expect(data.accounts[0].tokenStatus).toBe("valid");
      expect(data.accounts[1].tokenStatus).toBe("valid");
    });

    it("should mark expired tokens correctly", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);

      const mockAccounts = [
        {
          id: "acc1",
          platform: "FACEBOOK",
          accountId: "123",
          accountName: "Test Account",
          isActive: true,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-02"),
          expiresAt: new Date("2020-01-01"), // Expired
        },
      ];

      mockFindMany.mockResolvedValueOnce(mockAccounts);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts[0].tokenStatus).toBe("expired");
    });

    it("should return 500 on database error", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);
      mockFindMany.mockRejectedValueOnce(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch accounts");

      consoleSpy.mockRestore();
    });
  });

  describe("DELETE /api/admin/marketing/accounts", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/accounts",
        {
          method: "DELETE",
          body: JSON.stringify({ accountId: "acc1" }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(false);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/accounts",
        {
          method: "DELETE",
          body: JSON.stringify({ accountId: "acc1" }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when accountId is missing", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/accounts",
        {
          method: "DELETE",
          body: JSON.stringify({}),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Account ID is required");
    });

    it("should return 404 when account not found", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);
      mockUpdateMany.mockResolvedValueOnce({ count: 0 });

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/accounts",
        {
          method: "DELETE",
          body: JSON.stringify({ accountId: "nonexistent" }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found");
    });

    it("should successfully disconnect account", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);
      mockUpdateMany.mockResolvedValueOnce({ count: 1 });

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/accounts",
        {
          method: "DELETE",
          body: JSON.stringify({ accountId: "acc1" }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin123" },
      });
      mockIsAdminByUserId.mockResolvedValueOnce(true);
      mockUpdateMany.mockRejectedValueOnce(new Error("Database error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );

      const request = new NextRequest(
        "http://localhost/api/admin/marketing/accounts",
        {
          method: "DELETE",
          body: JSON.stringify({ accountId: "acc1" }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to disconnect account");

      consoleSpy.mockRestore();
    });
  });
});
