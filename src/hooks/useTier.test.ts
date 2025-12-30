import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTier } from "./useTier";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Helper to create URL-based mock implementation
function createFetchMocks(
  tiersResponse: Record<string, unknown>,
  promptResponse: Record<string, unknown>,
) {
  return (url: string) => {
    if (url === "/api/tiers") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(tiersResponse),
      });
    }
    if (url === "/api/tiers/check-upgrade-prompt") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(promptResponse),
      });
    }
    return Promise.reject(new Error(`Unknown URL: ${url}`));
  };
}

describe("useTier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with loading state", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useTier());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tiers).toEqual([]);
    expect(result.current.currentTier).toBeNull();
  });

  it("fetches tiers on mount", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tiers: [
              {
                tier: "FREE",
                displayName: "Free",
                wellCapacity: 100,
                priceGBP: 0,
                isCurrent: true,
              },
              {
                tier: "BASIC",
                displayName: "Basic",
                wellCapacity: 20,
                priceGBP: 5,
                isCurrent: false,
              },
            ],
            currentTier: "FREE",
            canUpgrade: true,
            nextTier: {
              tier: "BASIC",
              displayName: "Basic",
              wellCapacity: 20,
              priceGBP: 5,
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            showUpgradePrompt: false,
            isPremiumAtZero: false,
            currentTier: "FREE",
          }),
      });

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tiers).toHaveLength(2);
    expect(result.current.currentTier).toBe("FREE");
    expect(result.current.canUpgrade).toBe(true);
    expect(result.current.nextTier).toEqual({
      tier: "BASIC",
      displayName: "Basic",
      wellCapacity: 20,
      priceGBP: 5,
    });
  });

  it("handles unauthorized response gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not set error for 401 - user might not be logged in
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(
      "Failed to fetch tier information",
    );
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("handles unknown error type", async () => {
    mockFetch.mockRejectedValueOnce("String error");

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Unknown error");
  });

  it("handles null response", async () => {
    mockFetch.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("No response from server");
  });

  it("handles JSON parse error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const { result } = renderHook(() => useTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Invalid JSON");
  });

  describe("upgrade prompt", () => {
    it("shows upgrade prompt when balance is 0 and not premium", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [{
                tier: "FREE",
                displayName: "Free",
                wellCapacity: 100,
                priceGBP: 0,
              }],
              currentTier: "FREE",
              canUpgrade: true,
              nextTier: {
                tier: "BASIC",
                displayName: "Basic",
                wellCapacity: 20,
                priceGBP: 5,
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: true,
              isPremiumAtZero: false,
              currentTier: "FREE",
              nextTier: {
                tier: "BASIC",
                displayName: "Basic",
                wellCapacity: 20,
                priceGBP: 5,
              },
            }),
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.showUpgradePrompt).toBe(true);
      });

      expect(result.current.isPremiumAtZero).toBe(false);
    });

    it("shows premium options when premium user at 0 balance", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [{
                tier: "PREMIUM",
                displayName: "Premium",
                wellCapacity: 100,
                priceGBP: 20,
              }],
              currentTier: "PREMIUM",
              canUpgrade: false,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: false,
              isPremiumAtZero: true,
              currentTier: "PREMIUM",
              options: {
                timeUntilNextRegen: 600000,
                tokenPacks: [
                  {
                    id: "starter",
                    name: "Starter Pack",
                    tokens: 10,
                    price: 2.99,
                  },
                ],
              },
            }),
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.isPremiumAtZero).toBe(true);
      });

      expect(result.current.showUpgradePrompt).toBe(false);
      expect(result.current.premiumOptions).toEqual({
        timeUntilNextRegen: 600000,
        tokenPacks: [{
          id: "starter",
          name: "Starter Pack",
          tokens: 10,
          price: 2.99,
        }],
      });
    });

    it("does not show prompt when dismissed recently", async () => {
      // Simulate recently dismissed prompt
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ timestamp: Date.now() - 1000 }), // 1 second ago
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [],
              currentTier: "FREE",
              canUpgrade: true,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: true,
              isPremiumAtZero: false,
              currentTier: "FREE",
            }),
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not show prompt because it was dismissed
      expect(result.current.showUpgradePrompt).toBe(false);
    });

    it("shows prompt after 24 hour dismissal period", async () => {
      // Simulate dismissed prompt over 24 hours ago
      const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ timestamp: twentyFiveHoursAgo }),
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [],
              currentTier: "FREE",
              canUpgrade: true,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: true,
              isPremiumAtZero: false,
              currentTier: "FREE",
            }),
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.showUpgradePrompt).toBe(true);
      });
    });
  });

  describe("dismissPrompt", () => {
    it("saves dismissal to localStorage", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [],
              currentTier: "FREE",
              canUpgrade: true,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: true,
              isPremiumAtZero: false,
              currentTier: "FREE",
            }),
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.showUpgradePrompt).toBe(true);
      });

      await act(async () => {
        result.current.dismissPrompt();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "tier-upgrade-prompt-dismissed",
        expect.stringContaining("timestamp"),
      );
      expect(result.current.showUpgradePrompt).toBe(false);
    });
  });

  describe("refetch", () => {
    it("refetches tier data", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [{
                tier: "FREE",
                displayName: "Free",
                wellCapacity: 100,
                priceGBP: 0,
              }],
              currentTier: "FREE",
              canUpgrade: true,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: false,
              isPremiumAtZero: false,
              currentTier: "FREE",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [{
                tier: "BASIC",
                displayName: "Basic",
                wellCapacity: 20,
                priceGBP: 5,
              }],
              currentTier: "BASIC",
              canUpgrade: true,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              showUpgradePrompt: false,
              isPremiumAtZero: false,
              currentTier: "BASIC",
            }),
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.currentTier).toBe("FREE");
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.currentTier).toBe("BASIC");
    });
  });

  describe("checkPromptStatus", () => {
    it("silently handles errors without updating state", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tiers: [],
              currentTier: "FREE",
              canUpgrade: true,
              nextTier: null,
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useTier());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Prompt should remain false on error
      expect(result.current.showUpgradePrompt).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles invalid localStorage JSON by checking API", async () => {
      mockLocalStorage.getItem.mockReturnValue("invalid json");

      mockFetch.mockImplementation(
        createFetchMocks(
          { tiers: [], currentTier: "FREE", canUpgrade: true, nextTier: null },
          {
            showUpgradePrompt: true,
            isPremiumAtZero: false,
            currentTier: "FREE",
          },
        ),
      );

      const { result } = renderHook(() => useTier());

      // Wait for loading to complete first
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Then verify prompt state (invalid localStorage should not block API check)
      await waitFor(() => {
        expect(result.current.showUpgradePrompt).toBe(true);
      });
    });

    it("updates nextTier from prompt response", async () => {
      mockFetch.mockImplementation(
        createFetchMocks(
          { tiers: [], currentTier: "FREE", canUpgrade: true, nextTier: null },
          {
            showUpgradePrompt: true,
            isPremiumAtZero: false,
            currentTier: "FREE",
            nextTier: {
              tier: "BASIC",
              displayName: "Basic",
              wellCapacity: 20,
              priceGBP: 5,
            },
          },
        ),
      );

      const { result } = renderHook(() => useTier());

      // Wait for both fetches to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify nextTier was updated from prompt response
      await waitFor(() => {
        expect(result.current.nextTier?.tier).toBe("BASIC");
      });
    });
  });
});
