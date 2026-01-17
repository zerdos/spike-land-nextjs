import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/apps/bin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return apps in bin with remaining days", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    const now = new Date();
    const deletedAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

    const mockApps = [
      {
        id: "app-1",
        name: "Test App",
        deletedAt: deletedAt,
      },
    ];

    vi.mocked(prisma.app.findMany).mockResolvedValue(mockApps as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apps).toHaveLength(1);
    expect(data.apps[0].daysRemaining).toBe(20); // 30 - 10 = 20
    expect(data.retentionDays).toBe(30);

    expect(prisma.app.findMany).toHaveBeenCalled();
  });

  it("should handle server errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
      expires: "2025-12-31",
    });

    vi.mocked(prisma.app.findMany).mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
