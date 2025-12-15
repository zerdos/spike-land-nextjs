/**
 * Tests for User Analytics API Route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    account: {
      groupBy: vi.fn(),
    },
    session: {
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

describe("User Analytics API", () => {
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

  it("should return analytics data for admin users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { date: new Date("2025-01-01"), count: BigInt(5) },
      { date: new Date("2025-01-02"), count: BigInt(3) },
    ]);

    vi.mocked(prisma.account.groupBy).mockResolvedValue([
      { provider: "github", _count: { userId: 10 } },
      { provider: "google", _count: { userId: 5 } },
    ] as any);

    vi.mocked(prisma.session.findMany)
      .mockResolvedValueOnce(Array(50).fill({ userId: "user" }))
      .mockResolvedValueOnce(Array(100).fill({ userId: "user" }));
    vi.mocked(prisma.user.count).mockResolvedValueOnce(150)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(30);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("dailyRegistrations");
    expect(data).toHaveProperty("authProviders");
    expect(data).toHaveProperty("activeUsers");
    expect(data).toHaveProperty("totalUsers");
    expect(data).toHaveProperty("growth");
    expect(data.dailyRegistrations).toHaveLength(2);
    expect(data.authProviders).toHaveLength(2);
  });

  it("should return 403 if user is not admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_123" },
    } as any);

    const { requireAdminByUserId } = await import(
      "@/lib/auth/admin-middleware"
    );
    vi.mocked(requireAdminByUserId).mockRejectedValue(
      new Error("Forbidden: Admin access required"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should handle database errors gracefully and return partial data", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import(
      "@/lib/auth/admin-middleware"
    );
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Simulate partial failures
    vi.mocked(prisma.$queryRaw).mockRejectedValue(
      new Error("Daily registrations DB error"),
    );
    vi.mocked(prisma.account.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const response = await GET();
    const data = await response.json();

    // Should still return 200 with empty/default data
    expect(response.status).toBe(200);
    expect(data.dailyRegistrations).toEqual([]);
    expect(data.authProviders).toEqual([]);
    expect(data.activeUsers.last7Days).toBe(0);
    expect(data.activeUsers.last30Days).toBe(0);
    expect(data.totalUsers).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch daily registrations:",
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
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { date: new Date("2025-01-01"), count: BigInt(5) },
    ]);
    vi.mocked(prisma.account.groupBy).mockRejectedValue(
      new Error("GroupBy error"),
    );
    vi.mocked(prisma.session.findMany).mockRejectedValue(
      new Error("Session error"),
    );
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(100) // totalUsers succeeds
      .mockRejectedValueOnce(new Error("Count error")) // usersLast7Days fails
      .mockResolvedValueOnce(20); // usersLast30Days succeeds

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dailyRegistrations).toHaveLength(1);
    expect(data.authProviders).toEqual([]);
    expect(data.activeUsers.last7Days).toBe(0);
    expect(data.activeUsers.last30Days).toBe(0);
    expect(data.totalUsers).toBe(100);
    expect(data.growth.last7Days).toBe(0);
    expect(data.growth.last30Days).toBe(20);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch auth providers:",
      expect.any(Error),
    );
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch active users (7 days):",
      expect.any(Error),
    );
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
    vi.mocked(prisma.$queryRaw).mockResolvedValue(null as any);
    vi.mocked(prisma.account.groupBy).mockResolvedValue(null as any);
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dailyRegistrations).toEqual([]);
    expect(data.authProviders).toEqual([]);
  });
});
