/**
 * Tests for Admin Dashboard API Route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    imageEnhancementJob: {
      count: vi.fn(),
    },
    tokenTransaction: {
      aggregate: vi.fn(),
    },
    voucher: {
      count: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const { default: prisma } = await import("@/lib/prisma");

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user has no id", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: {} } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not admin", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockRejectedValueOnce(
      new Error("Forbidden: Admin access required"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Admin access required");
  });

  it("should return dashboard metrics for admin user", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);

    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(5);

    vi.mocked(prisma.imageEnhancementJob.count)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(480)
      .mockResolvedValueOnce(5);

    vi.mocked(prisma.tokenTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 10000 } } as never)
      .mockResolvedValueOnce({ _sum: { amount: -8000 } } as never);

    vi.mocked(prisma.voucher.count).mockResolvedValueOnce(3);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalUsers).toBe(100);
    expect(data.adminCount).toBe(5);
    expect(data.totalEnhancements).toBe(500);
    expect(data.jobStatus.pending).toBe(10);
    expect(data.jobStatus.processing).toBe(5);
    expect(data.jobStatus.completed).toBe(480);
    expect(data.jobStatus.failed).toBe(5);
    expect(data.jobStatus.active).toBe(15);
    expect(data.totalTokensPurchased).toBe(10000);
    expect(data.totalTokensSpent).toBe(8000);
    expect(data.activeVouchers).toBe(3);
    expect(data.timestamp).toBeDefined();
  });

  it("should handle null token amounts", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);

    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1);

    vi.mocked(prisma.imageEnhancementJob.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    vi.mocked(prisma.tokenTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: null } } as never)
      .mockResolvedValueOnce({ _sum: { amount: null } } as never);

    vi.mocked(prisma.voucher.count).mockResolvedValueOnce(0);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalTokensPurchased).toBe(0);
    expect(data.totalTokensSpent).toBe(0);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "admin123" },
    } as never);
    vi.mocked(requireAdminByUserId).mockResolvedValueOnce(undefined);

    vi.mocked(prisma.user.count).mockRejectedValueOnce(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
