import { auth } from "@/auth";
import { getReferralStats, getReferredUsers } from "@/lib/referral/rewards";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/referral/rewards", () => ({
  getReferralStats: vi.fn(),
  getReferredUsers: vi.fn(),
}));

describe("GET /api/referral/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return referral stats for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockStats = {
      totalReferrals: 10,
      completedReferrals: 8,
      pendingReferrals: 2,
      tokensEarned: 400,
    };

    const mockReferredUsers = [
      {
        id: "ref-1",
        email: "j***@example.com",
        status: "COMPLETED",
        createdAt: new Date("2024-01-01"),
        tokensGranted: 50,
      },
    ];

    vi.mocked(getReferralStats).mockResolvedValue(mockStats);
    vi.mocked(getReferredUsers).mockResolvedValue(mockReferredUsers);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual(mockStats);
    // Date gets serialized to string in JSON response
    expect(data.referredUsers[0].email).toBe("j***@example.com");
    expect(data.referredUsers[0].status).toBe("COMPLETED");
    expect(data.referredUsers[0].tokensGranted).toBe(50);
    expect(typeof data.referredUsers[0].createdAt).toBe("string");
  });

  it("should return 401 if user not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session has no user ID", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {},
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(getReferralStats).mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to retrieve referral statistics");
  });

  it("should handle partial failures", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(getReferralStats).mockResolvedValue({
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      tokensEarned: 0,
    });

    vi.mocked(getReferredUsers).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.totalReferrals).toBe(0);
    expect(data.referredUsers).toEqual([]);
  });
});
