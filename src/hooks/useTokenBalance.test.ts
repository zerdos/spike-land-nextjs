import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateEstimatedEnhancements,
  CRITICAL_BALANCE_THRESHOLD,
  LOW_BALANCE_THRESHOLD,
  useTokenBalance,
} from "./useTokenBalance";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("calculateEstimatedEnhancements", () => {
  it("calculates correct enhancements for balance of 10", () => {
    const result = calculateEstimatedEnhancements(10);
    expect(result.tier1K).toBe(10); // 10 / 1 = 10
    expect(result.tier2K).toBe(5); // 10 / 2 = 5
    expect(result.tier4K).toBe(2); // 10 / 5 = 2
  });

  it("calculates correct enhancements for balance of 0", () => {
    const result = calculateEstimatedEnhancements(0);
    expect(result.tier1K).toBe(0);
    expect(result.tier2K).toBe(0);
    expect(result.tier4K).toBe(0);
  });

  it("calculates correct enhancements for large balance", () => {
    const result = calculateEstimatedEnhancements(100);
    expect(result.tier1K).toBe(100);
    expect(result.tier2K).toBe(50);
    expect(result.tier4K).toBe(20);
  });

  it("returns suggested values based on TIER_1K by default", () => {
    const result = calculateEstimatedEnhancements(10);
    expect(result.suggested).toBe(10);
    expect(result.suggestedTier).toBe("1K");
  });

  it("returns suggested values based on TIER_2K when specified", () => {
    const result = calculateEstimatedEnhancements(10, "TIER_2K");
    expect(result.suggested).toBe(5);
    expect(result.suggestedTier).toBe("2K");
  });

  it("returns suggested values based on TIER_4K when specified", () => {
    const result = calculateEstimatedEnhancements(10, "TIER_4K");
    expect(result.suggested).toBe(2);
    expect(result.suggestedTier).toBe("4K");
  });

  it("handles non-divisible balances correctly", () => {
    const result = calculateEstimatedEnhancements(7);
    expect(result.tier1K).toBe(7);
    expect(result.tier2K).toBe(3); // floor(7/2) = 3
    expect(result.tier4K).toBe(1); // floor(7/5) = 1
  });
});

describe("Threshold constants", () => {
  it("LOW_BALANCE_THRESHOLD is 10", () => {
    expect(LOW_BALANCE_THRESHOLD).toBe(10);
  });

  it("CRITICAL_BALANCE_THRESHOLD is 5", () => {
    expect(CRITICAL_BALANCE_THRESHOLD).toBe(5);
  });
});

describe("useTokenBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure mockFetch is properly set
    global.fetch = mockFetch;
    // Ensure real timers are used
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts with loading state", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useTokenBalance());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.balance).toBe(0);
  });

  it("fetches balance on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 25,
          lastRegeneration: new Date().toISOString(),
          stats: {
            totalSpent: 10,
            totalEarned: 35,
            totalRefunded: 0,
            transactionCount: 5,
          },
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toBe(25);
    expect(result.current.isLowBalance).toBe(false);
    expect(result.current.isCriticalBalance).toBe(false);
    expect(result.current.stats).toEqual({
      totalSpent: 10,
      totalEarned: 35,
      totalRefunded: 0,
      transactionCount: 5,
    });
  });

  it("identifies low balance (< 10)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 8,
          lastRegeneration: new Date().toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLowBalance).toBe(true);
    expect(result.current.isCriticalBalance).toBe(false);
  });

  it("identifies critical balance (< 5)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 3,
          lastRegeneration: new Date().toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLowBalance).toBe(true);
    expect(result.current.isCriticalBalance).toBe(true);
  });

  it("handles fetch error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to fetch token balance");
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("calculates estimated enhancements based on balance", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 20,
          lastRegeneration: new Date().toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.estimatedEnhancements.tier1K).toBe(20);
    expect(result.current.estimatedEnhancements.tier2K).toBe(10);
    expect(result.current.estimatedEnhancements.tier4K).toBe(4);
  });

  it("refetch updates balance", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 10,
            lastRegeneration: new Date().toISOString(),
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 50,
            lastRegeneration: new Date().toISOString(),
          }),
      });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.balance).toBe(10);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.balance).toBe(50);
  });

  it("returns time until next regeneration when available", async () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 12); // 12 hours ago

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 10,
          lastRegeneration: pastDate.toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should show remaining time (around 12 hours)
    expect(result.current.timeUntilNextRegeneration).toMatch(/\d+h \d+m/);
  });

  it("returns 'Available now' when regeneration is due", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2); // 2 days ago

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 10,
          lastRegeneration: pastDate.toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.timeUntilNextRegeneration).toBe("Available now");
  });

  it("returns null for timeUntilNextRegeneration when no lastRegeneration", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 10,
          lastRegeneration: null,
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.timeUntilNextRegeneration).toBe(null);
  });

  it("does not auto-refresh on focus when disabled", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 10,
          lastRegeneration: new Date().toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance({ autoRefreshOnFocus: false }));

    await waitFor(() => {
      expect(result.current.balance).toBe(10);
    });

    // Simulate focus event
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    // Should still be 10, not refetched
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles unknown error type", async () => {
    mockFetch.mockRejectedValueOnce("String error");

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Unknown error");
  });

  it("clears error on successful refetch", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("First error"))
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 10,
            lastRegeneration: new Date().toISOString(),
          }),
      });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.balance).toBe(10);
  });

  it("correctly calculates time in minutes only format", async () => {
    const recentDate = new Date();
    recentDate.setMinutes(recentDate.getMinutes() - 30); // 30 minutes ago (within the same hour window)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 10,
          lastRegeneration: recentDate.toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The next regen is 1 day from lastRegeneration
    // Since it was 30 minutes ago, we have ~23h 30m left
    expect(result.current.timeUntilNextRegeneration).toMatch(/\d+h \d+m/);
  });

  it("returns minutes only when less than 1 hour until regeneration", async () => {
    // Set lastRegeneration to 23 hours and 30 minutes ago
    // This means next regeneration is in ~30 minutes (0 hours, ~30 minutes)
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 23);
    pastDate.setMinutes(pastDate.getMinutes() - 30);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          balance: 10,
          lastRegeneration: pastDate.toISOString(),
        }),
    });

    const { result } = renderHook(() => useTokenBalance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should show only minutes (e.g., "30m") when less than 1 hour remaining
    expect(result.current.timeUntilNextRegeneration).toMatch(/^\d+m$/);
  });
});

// Separate describe block for focus debounce tests that require fake timers
// This isolates the fake timer usage to prevent test pollution
describe("useTokenBalance focus debouncing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("auto-refreshes on focus when enabled after debounce period", async () => {
    vi.setSystemTime(new Date(1000));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 10,
            lastRegeneration: new Date().toISOString(),
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 15,
            lastRegeneration: new Date().toISOString(),
          }),
      });

    const { result } = renderHook(() => useTokenBalance({ autoRefreshOnFocus: true }));

    await waitFor(() => {
      expect(result.current.balance).toBe(10);
    });

    // Advance time past the debounce threshold (5 seconds)
    vi.setSystemTime(new Date(7000));

    // Simulate focus event after debounce period
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(result.current.balance).toBe(15);
    });
  });

  it("debounces focus refreshes within 5 second window", async () => {
    vi.setSystemTime(new Date(1000));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 10,
            lastRegeneration: new Date().toISOString(),
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            balance: 15,
            lastRegeneration: new Date().toISOString(),
          }),
      });

    const { result } = renderHook(() => useTokenBalance({ autoRefreshOnFocus: true }));

    await waitFor(() => {
      expect(result.current.balance).toBe(10);
    });

    // Only advance time 2 seconds (within debounce window)
    vi.setSystemTime(new Date(3000));

    // Simulate focus event - should be debounced
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    // Should still be 10, focus was debounced
    expect(result.current.balance).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
