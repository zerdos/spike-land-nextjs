import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    appMessage: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { describe, expect, it, vi } from "vitest";

describe("GET /api/my-apps/stats", () => {
  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("should return user stats when authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: new Date().toISOString(),
    } as never);

    // Mock all the count/groupBy queries
    vi.mocked(prisma.app.count).mockResolvedValue(5);
    vi.mocked(prisma.appMessage.count).mockResolvedValue(50);
    vi.mocked(prisma.app.groupBy).mockResolvedValue([
      { status: "LIVE", _count: 3 },
      { status: "BUILDING", _count: 2 },
    ] as never);
    vi.mocked(prisma.app.findMany).mockResolvedValue([
      {
        id: "app-1",
        name: "Test App",
        status: "LIVE",
        codespaceId: "test-123",
        createdAt: new Date(),
        lastAgentActivity: new Date(),
        _count: { messages: 10 },
      },
    ] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("overview");
    expect(data).toHaveProperty("statusBreakdown");
    expect(data).toHaveProperty("recentApps");
    expect(data).toHaveProperty("activityTrend");
    expect(data.overview.totalApps).toBe(5);
  });
});
