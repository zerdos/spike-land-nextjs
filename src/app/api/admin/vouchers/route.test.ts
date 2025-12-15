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

describe("Voucher Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
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
  });
});
