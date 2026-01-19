import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    app: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    appMessage: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    appStatusHistory: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { describe, expect, it, vi } from "vitest";

describe("GET /api/admin/my-apps/stats", () => {
  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("should return 403 if user is not admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: new Date().toISOString(),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "USER",
    } as never);

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("should return stats for admin user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
      expires: new Date().toISOString(),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "ADMIN",
    } as never);

    // Mock all the count/groupBy queries
    vi.mocked(prisma.app.count).mockResolvedValue(10);
    vi.mocked(prisma.appMessage.count).mockResolvedValue(100);
    vi.mocked(prisma.app.groupBy).mockResolvedValue([
      { status: "LIVE", _count: 5 },
      { status: "BUILDING", _count: 3 },
    ] as never);
    vi.mocked(prisma.appMessage.groupBy).mockResolvedValue([
      { appId: "app-1", _count: 10 },
    ] as never);
    vi.mocked(prisma.appStatusHistory.findMany).mockResolvedValue([]);
    vi.mocked(prisma.appStatusHistory.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("overview");
    expect(data).toHaveProperty("statusBreakdown");
    expect(data).toHaveProperty("recentActivity");
    expect(data).toHaveProperty("topUsers");
    expect(data).toHaveProperty("trends");
  });
});
