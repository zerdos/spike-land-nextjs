/**
 * Tests for Voucher Management API Route
 */

import { VoucherStatus, VoucherType } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    voucher: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

describe("Voucher Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Default to allowing admin access - override in specific tests
    vi.mocked(requireAdminByUserId).mockResolvedValue();
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 403 if admin check fails with Forbidden", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return 500 if findMany throws an error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);
      vi.mocked(prisma.voucher.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return vouchers list for admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.findMany).mockResolvedValue([
        {
          id: "v1",
          code: "PROMO2025",
          type: VoucherType.FIXED_TOKENS,
          value: 100,
          maxUses: 10,
          currentUses: 5,
          expiresAt: new Date("2025-12-31"),
          status: VoucherStatus.ACTIVE,
          createdAt: new Date("2025-01-01"),
          redemptions: [{ userId: "u1" }, { userId: "u2" }],
        },
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vouchers).toHaveLength(1);
      expect(data.vouchers[0].code).toBe("PROMO2025");
    });

    it("should handle vouchers with null expiresAt", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.findMany).mockResolvedValue([
        {
          id: "v1",
          code: "PROMO2025",
          type: VoucherType.FIXED_TOKENS,
          value: 100,
          maxUses: null,
          currentUses: 0,
          expiresAt: null,
          status: VoucherStatus.ACTIVE,
          createdAt: new Date("2025-01-01"),
          redemptions: [],
        },
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vouchers[0].expiresAt).toBeUndefined();
    });
  });

  describe("POST", () => {
    it("should create a new voucher", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.voucher.create).mockResolvedValue({
        id: "v1",
        code: "NEWPROMO",
        type: VoucherType.FIXED_TOKENS,
        value: 50,
        maxUses: null,
        expiresAt: null,
        status: VoucherStatus.ACTIVE,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "FIXED_TOKENS",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.voucher.code).toBe("NEWPROMO");
    });

    it("should create a voucher with maxUses and expiresAt", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.voucher.create).mockResolvedValue({
        id: "v1",
        code: "NEWPROMO",
        type: VoucherType.FIXED_TOKENS,
        value: 50,
        maxUses: 10,
        expiresAt: new Date("2025-12-31"),
        status: VoucherStatus.ACTIVE,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "FIXED_TOKENS",
          value: 50,
          maxUses: 10,
          expiresAt: "2025-12-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.voucher.maxUses).toBe(10);
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "FIXED_TOKENS",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "FIXED_TOKENS",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 if JSON parsing fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 400 for missing fields", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({ code: "NEWPROMO" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 for invalid voucher type", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "INVALID_TYPE",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid voucher type");
    });

    it("should return 500 if findUnique throws an error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);
      vi.mocked(prisma.voucher.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "FIXED_TOKENS",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 409 if code already exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.findUnique).mockResolvedValue({
        id: "v1",
        code: "EXISTING",
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "EXISTING",
          type: "FIXED_TOKENS",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already exists");
    });

    it("should return 500 if create throws an error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);
      vi.mocked(prisma.voucher.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.voucher.create).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "POST",
        body: JSON.stringify({
          code: "NEWPROMO",
          type: "FIXED_TOKENS",
          value: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("DELETE", () => {
    it("should delete a voucher", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.delete).mockResolvedValue({} as any);

      const request = new NextRequest(
        "http://localhost/api/admin/vouchers?id=v1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/vouchers?id=v1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const request = new NextRequest(
        "http://localhost/api/admin/vouchers?id=v1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 400 if id is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 500 if delete throws an error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);
      vi.mocked(prisma.voucher.delete).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/vouchers?id=v1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("PATCH", () => {
    it("should update voucher status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.voucher.update).mockResolvedValue({
        id: "v1",
        status: VoucherStatus.INACTIVE,
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "v1",
          status: "INACTIVE",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.voucher.status).toBe("INACTIVE");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "v1",
          status: "INACTIVE",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "v1",
          status: "INACTIVE",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 if JSON parsing fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: "invalid-json",
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 400 for missing fields", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "v1",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 for invalid status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "v1",
          status: "INVALID",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should return 500 if update throws an error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);
      vi.mocked(prisma.voucher.update).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/admin/vouchers", {
        method: "PATCH",
        body: JSON.stringify({
          id: "v1",
          status: "INACTIVE",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
