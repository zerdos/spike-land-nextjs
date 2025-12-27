import { auth } from "@/auth";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { getTimeUntilNextRegeneration, processUserRegeneration } from "@/lib/tokens/regeneration";
import { createMinimalSession, createMockSession } from "@/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    getBalance: vi.fn(),
    getConsumptionStats: vi.fn(),
  },
}));

vi.mock("@/lib/tokens/regeneration", () => ({
  processUserRegeneration: vi.fn(),
  getTimeUntilNextRegeneration: vi.fn(),
}));

describe("GET /api/tokens/balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return token balance and stats for authenticated user", async () => {
    const mockDate = new Date("2024-01-15T12:00:00.000Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockResolvedValue(5);

    vi.mocked(TokenBalanceManager.getBalance).mockResolvedValue({
      balance: 50,
      lastRegeneration: mockDate,
      tier: "FREE" as const,
      maxBalance: 100,
    });

    vi.mocked(getTimeUntilNextRegeneration).mockResolvedValue(600000); // 10 minutes in ms

    vi.mocked(TokenBalanceManager.getConsumptionStats).mockResolvedValue({
      totalSpent: 100,
      totalEarned: 200,
      totalRefunded: 10,
      transactionCount: 25,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance).toBe(50);
    expect(data.lastRegeneration).toBe(mockDate.toISOString());
    expect(data.timeUntilNextRegenMs).toBe(600000);
    expect(data.tokensAddedThisRequest).toBe(5);
    expect(data.stats).toEqual({
      totalSpent: 100,
      totalEarned: 200,
      totalRefunded: 10,
      transactionCount: 25,
    });

    expect(processUserRegeneration).toHaveBeenCalledWith("user-123");
    expect(TokenBalanceManager.getBalance).toHaveBeenCalledWith("user-123");
    expect(getTimeUntilNextRegeneration).toHaveBeenCalledWith("user-123");
    expect(TokenBalanceManager.getConsumptionStats).toHaveBeenCalledWith(
      "user-123",
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session has no user", async () => {
    vi.mocked(auth).mockResolvedValue({} as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session user has no ID", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {},
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session user ID is undefined", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: undefined },
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle errors gracefully and return 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch token balance");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching token balance:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should handle getBalance failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockResolvedValue(0);
    vi.mocked(TokenBalanceManager.getBalance).mockRejectedValue(
      new Error("Balance lookup failed"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch token balance");

    consoleSpy.mockRestore();
  });

  it("should handle getTimeUntilNextRegeneration failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockDate = new Date("2024-01-15T12:00:00.000Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockResolvedValue(0);
    vi.mocked(TokenBalanceManager.getBalance).mockResolvedValue({
      balance: 50,
      lastRegeneration: mockDate,
      tier: "FREE" as const,
      maxBalance: 100,
    });
    vi.mocked(getTimeUntilNextRegeneration).mockRejectedValue(
      new Error("Regeneration time error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch token balance");

    consoleSpy.mockRestore();
  });

  it("should handle getConsumptionStats failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockDate = new Date("2024-01-15T12:00:00.000Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockResolvedValue(0);
    vi.mocked(TokenBalanceManager.getBalance).mockResolvedValue({
      balance: 50,
      lastRegeneration: mockDate,
      tier: "FREE" as const,
      maxBalance: 100,
    });
    vi.mocked(getTimeUntilNextRegeneration).mockResolvedValue(600000);
    vi.mocked(TokenBalanceManager.getConsumptionStats).mockRejectedValue(
      new Error("Stats error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch token balance");

    consoleSpy.mockRestore();
  });

  it("should return zero tokens added when no regeneration occurs", async () => {
    const mockDate = new Date("2024-01-15T12:00:00.000Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockResolvedValue(0);

    vi.mocked(TokenBalanceManager.getBalance).mockResolvedValue({
      balance: 100,
      lastRegeneration: mockDate,
      tier: "FREE" as const,
      maxBalance: 100,
    });

    vi.mocked(getTimeUntilNextRegeneration).mockResolvedValue(0);

    vi.mocked(TokenBalanceManager.getConsumptionStats).mockResolvedValue({
      totalSpent: 0,
      totalEarned: 100,
      totalRefunded: 0,
      transactionCount: 1,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokensAddedThisRequest).toBe(0);
    expect(data.timeUntilNextRegenMs).toBe(0);
  });

  it("should return JSON response with correct content-type", async () => {
    const mockDate = new Date("2024-01-15T12:00:00.000Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(processUserRegeneration).mockResolvedValue(0);
    vi.mocked(TokenBalanceManager.getBalance).mockResolvedValue({
      balance: 50,
      lastRegeneration: mockDate,
      tier: "FREE" as const,
      maxBalance: 100,
    });
    vi.mocked(getTimeUntilNextRegeneration).mockResolvedValue(600000);
    vi.mocked(TokenBalanceManager.getConsumptionStats).mockResolvedValue({
      totalSpent: 0,
      totalEarned: 0,
      totalRefunded: 0,
      transactionCount: 0,
    });

    const response = await GET();

    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
