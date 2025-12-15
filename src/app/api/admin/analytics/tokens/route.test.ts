/**
 * Tests for Token Economics API Route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    tokenTransaction: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    stripePayment: {
      aggregate: vi.fn(),
    },
    userTokenBalance: {
      aggregate: vi.fn(),
    },
    tokensPackage: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("Token Economics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return token analytics data for admin users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    vi.mocked(prisma.tokenTransaction.groupBy).mockResolvedValue([
      { type: "EARN_PURCHASE", _sum: { amount: 1000 } },
      { type: "SPEND_ENHANCEMENT", _sum: { amount: -500 } },
    ] as any);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        date: new Date("2025-01-01"),
        purchased: BigInt(100),
        spent: BigInt(50),
      },
    ]);

    vi.mocked(prisma.stripePayment.aggregate).mockResolvedValue({
      _sum: { amountUSD: 500 },
    } as any);

    vi.mocked(prisma.userTokenBalance.aggregate).mockResolvedValue({
      _avg: { balance: 50 },
      _sum: { balance: 5000 },
    } as any);

    vi.mocked(prisma.tokenTransaction.count).mockResolvedValue(100);

    vi.mocked(prisma.tokensPackage.findMany).mockResolvedValue([
      {
        name: "Basic",
        tokens: 100,
        stripePayments: [{ id: "1" }, { id: "2" }],
      },
    ] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("tokensByType");
    expect(data).toHaveProperty("dailyTokens");
    expect(data).toHaveProperty("revenue");
    expect(data).toHaveProperty("circulation");
    expect(data).toHaveProperty("regenerationCount");
    expect(data).toHaveProperty("packageSales");
  });

  it("should handle errors gracefully and return partial data", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import(
      "@/lib/auth/admin-middleware"
    );
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Simulate partial failures
    vi.mocked(prisma.tokenTransaction.groupBy).mockRejectedValue(
      new Error("GroupBy error"),
    );
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Query error"));
    vi.mocked(prisma.stripePayment.aggregate).mockResolvedValue({
      _sum: { amountUSD: null },
    } as any);
    vi.mocked(prisma.userTokenBalance.aggregate).mockResolvedValue({
      _avg: { balance: null },
      _sum: { balance: null },
    } as any);
    vi.mocked(prisma.tokenTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.tokensPackage.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    // Should still return 200 with empty/default data
    expect(response.status).toBe(200);
    expect(data.tokensByType).toEqual([]);
    expect(data.dailyTokens).toEqual([]);
    expect(data.revenue.total).toBe(0);
    expect(data.circulation.total).toBe(0);
    expect(data.regenerationCount).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch tokens by type:",
      expect.any(Error),
    );
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch daily tokens:",
      expect.any(Error),
    );
  });

  it("should handle individual query failures gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import(
      "@/lib/auth/admin-middleware"
    );
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Success for some queries, failure for others
    vi.mocked(prisma.tokenTransaction.groupBy).mockResolvedValue([
      { type: "EARN_PURCHASE", _sum: { amount: 1000 } },
    ] as any);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        date: new Date("2025-01-01"),
        purchased: BigInt(100),
        spent: BigInt(50),
      },
    ]);
    vi.mocked(prisma.stripePayment.aggregate).mockRejectedValue(
      new Error("Revenue error"),
    );
    vi.mocked(prisma.userTokenBalance.aggregate).mockResolvedValue({
      _avg: { balance: 50 },
      _sum: { balance: 5000 },
    } as any);
    vi.mocked(prisma.tokenTransaction.count).mockRejectedValue(
      new Error("Count error"),
    );
    vi.mocked(prisma.tokensPackage.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokensByType).toHaveLength(1);
    expect(data.dailyTokens).toHaveLength(1);
    expect(data.revenue.total).toBe(0);
    expect(data.circulation.total).toBe(5000);
    expect(data.regenerationCount).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch revenue:",
      expect.any(Error),
    );
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch regeneration count:",
      expect.any(Error),
    );
  });

  it("should handle null values in aggregates", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import(
      "@/lib/auth/admin-middleware"
    );
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(prisma.tokenTransaction.groupBy).mockResolvedValue([
      { type: "EARN_PURCHASE", _sum: { amount: null } },
    ] as any);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.stripePayment.aggregate).mockResolvedValue({
      _sum: { amountUSD: null },
    } as any);
    vi.mocked(prisma.userTokenBalance.aggregate).mockResolvedValue({
      _avg: { balance: null },
      _sum: { balance: null },
    } as any);
    vi.mocked(prisma.tokenTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.tokensPackage.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokensByType[0].total).toBe(0);
    expect(data.revenue.total).toBe(0);
    expect(data.circulation.total).toBe(0);
    expect(data.circulation.average).toBe(0);
  });

  it("should handle non-array responses from database", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import(
      "@/lib/auth/admin-middleware"
    );
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Return non-array values (edge case)
    vi.mocked(prisma.tokenTransaction.groupBy).mockResolvedValue(null as any);
    vi.mocked(prisma.$queryRaw).mockResolvedValue(null as any);
    vi.mocked(prisma.stripePayment.aggregate).mockResolvedValue({
      _sum: { amountUSD: null },
    } as any);
    vi.mocked(prisma.userTokenBalance.aggregate).mockResolvedValue({
      _avg: { balance: null },
      _sum: { balance: null },
    } as any);
    vi.mocked(prisma.tokenTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.tokensPackage.findMany).mockResolvedValue(null as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokensByType).toEqual([]);
    expect(data.dailyTokens).toEqual([]);
    expect(data.packageSales).toEqual([]);
  });
});
