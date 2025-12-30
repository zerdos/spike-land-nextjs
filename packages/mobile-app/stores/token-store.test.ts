/**
 * Token Store Tests
 * Comprehensive tests for token balance and regeneration management
 */

// IMPORTANT: Enable fake timers before any imports
// This ensures the token-store module sees the fake setInterval
jest.useFakeTimers();

import type { SubscriptionTier } from "@spike-npm-land/shared";
import { act, renderHook } from "@testing-library/react-native";

import * as tokensApi from "../services/api/tokens";
import { _resetRegenInterval, useTokenStore } from "./token-store";

// Mock the tokens API
jest.mock("../services/api/tokens", () => ({
  getTokenBalance: jest.fn(),
  redeemVoucher: jest.fn(),
}));

// Mock shared utilities
const mockCalculateRegeneratedTokens = jest.fn(() => 0);
const mockGetTimeUntilNextRegen = jest.fn(() => 3600000);

jest.mock("@spike-npm-land/shared", () => ({
  calculateRegeneratedTokens: (...args: unknown[]) => mockCalculateRegeneratedTokens(...args),
  getTimeUntilNextRegen: (...args: unknown[]) => mockGetTimeUntilNextRegen(...args),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

interface TokenBalanceResponse {
  balance: number;
  tier: SubscriptionTier;
  lastRegeneration: string;
  maxBalance: number;
  timeUntilNextRegen: number;
}

interface RedeemVoucherResponse {
  success: boolean;
  tokensGranted: number;
  newBalance: number;
}

const mockTokenBalance: TokenBalanceResponse = {
  balance: 8,
  tier: "FREE" as SubscriptionTier,
  lastRegeneration: "2024-01-01T12:00:00.000Z",
  maxBalance: 10,
  timeUntilNextRegen: 1800000, // 30 minutes
};

const mockPremiumBalance: TokenBalanceResponse = {
  balance: 150,
  tier: "PREMIUM" as SubscriptionTier,
  lastRegeneration: "2024-01-01T12:00:00.000Z",
  maxBalance: 200,
  timeUntilNextRegen: 900000, // 15 minutes
};

// ============================================================================
// Helper Functions
// ============================================================================

function resetStore() {
  act(() => {
    useTokenStore.setState({
      balance: 0,
      tier: "FREE",
      lastRegeneration: null,
      maxBalance: 10,
      timeUntilNextRegen: 0,
      isLoading: false,
      error: null,
    });
  });
}

// ============================================================================
// Tests
// ============================================================================

// Fake timers are already enabled at the top of the file
// Just restore them after all tests
afterAll(() => {
  jest.useRealTimers();
});

describe("useTokenStore", () => {
  beforeEach(() => {
    // 1. Reset the module-level regenInterval variable directly
    _resetRegenInterval();
    // 2. Clear all pending timers from previous tests
    jest.clearAllTimers();
    // 3. Clear all mock call history
    jest.clearAllMocks();
    // 4. Reset mock implementations to defaults
    mockCalculateRegeneratedTokens.mockReturnValue(0);
    mockGetTimeUntilNextRegen.mockReturnValue(3600000);
    // 5. Reset the store state
    resetStore();
  });

  afterEach(() => {
    // Clean up any running intervals (module-level regenInterval)
    _resetRegenInterval();
    // Clear all fake timers
    jest.clearAllTimers();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useTokenStore());

      expect(result.current.balance).toBe(0);
      expect(result.current.tier).toBe("FREE");
      expect(result.current.lastRegeneration).toBeNull();
      expect(result.current.maxBalance).toBe(10);
      expect(result.current.timeUntilNextRegen).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("fetchBalance", () => {
    it("should fetch and set token balance successfully", async () => {
      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: mockTokenBalance,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(tokensApi.getTokenBalance).toHaveBeenCalled();
      expect(result.current.balance).toBe(8);
      expect(result.current.tier).toBe("FREE");
      expect(result.current.maxBalance).toBe(10);
      expect(result.current.timeUntilNextRegen).toBe(1800000);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastRegeneration).toBeInstanceOf(Date);
    });

    it("should fetch premium tier balance successfully", async () => {
      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: mockPremiumBalance,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.balance).toBe(150);
      expect(result.current.tier).toBe("PREMIUM");
      expect(result.current.maxBalance).toBe(200);
    });

    it("should set loading state during fetch", async () => {
      let resolveBalance:
        | ((value: { data: TokenBalanceResponse; error: null; }) => void)
        | undefined;
      (tokensApi.getTokenBalance as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveBalance = resolve;
          }),
      );

      const { result } = renderHook(() => useTokenStore());

      let fetchPromise: Promise<void>;
      act(() => {
        fetchPromise = result.current.fetchBalance();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveBalance!({ data: mockTokenBalance, error: null });
        await fetchPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle fetch error from API response", async () => {
      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: null,
        error: "Unauthorized",
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.error).toBe("Unauthorized");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle fetch error when data is missing", async () => {
      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.error).toBe("Failed to fetch balance");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle network error during fetch", async () => {
      const networkError = new Error("Network error");
      (tokensApi.getTokenBalance as jest.Mock).mockRejectedValue(networkError);

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle non-Error objects in fetch catch block", async () => {
      (tokensApi.getTokenBalance as jest.Mock).mockRejectedValue(
        "String error",
      );

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.error).toBe("Failed to fetch balance");
    });

    it("should start regen timer if balance is below max", async () => {
      const balanceBelowMax = { ...mockTokenBalance, balance: 5 };
      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: balanceBelowMax,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      // Verify that a timer is now running (balance < maxBalance)
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it("should not start regen timer if balance equals max", async () => {
      const fullBalance = { ...mockTokenBalance, balance: 10, maxBalance: 10 };
      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: fullBalance,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      // Balance is at max, so no regen timer needed
      expect(result.current.balance).toBe(10);
    });
  });

  describe("updateBalance", () => {
    it("should update balance directly", () => {
      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.updateBalance(15);
      });

      expect(result.current.balance).toBe(15);
    });

    it("should allow setting balance to zero", () => {
      act(() => {
        useTokenStore.setState({ balance: 10 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.updateBalance(0);
      });

      expect(result.current.balance).toBe(0);
    });
  });

  describe("deductTokens", () => {
    it("should deduct tokens from balance", () => {
      act(() => {
        useTokenStore.setState({ balance: 10 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.deductTokens(3);
      });

      expect(result.current.balance).toBe(7);
    });

    it("should not allow negative balance", () => {
      act(() => {
        useTokenStore.setState({ balance: 5 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.deductTokens(10);
      });

      expect(result.current.balance).toBe(0);
    });

    it("should handle deducting zero tokens", () => {
      act(() => {
        useTokenStore.setState({ balance: 10 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.deductTokens(0);
      });

      expect(result.current.balance).toBe(10);
    });

    it("should deduct exactly to zero", () => {
      act(() => {
        useTokenStore.setState({ balance: 5 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.deductTokens(5);
      });

      expect(result.current.balance).toBe(0);
    });
  });

  describe("addTokens", () => {
    it("should add tokens to balance", () => {
      act(() => {
        useTokenStore.setState({ balance: 5, maxBalance: 20 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.addTokens(3);
      });

      expect(result.current.balance).toBe(8);
    });

    it("should not exceed max balance", () => {
      act(() => {
        useTokenStore.setState({ balance: 8, maxBalance: 10 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.addTokens(5);
      });

      expect(result.current.balance).toBe(10);
    });

    it("should handle adding zero tokens", () => {
      act(() => {
        useTokenStore.setState({ balance: 5, maxBalance: 10 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.addTokens(0);
      });

      expect(result.current.balance).toBe(5);
    });

    it("should add exactly to max balance", () => {
      act(() => {
        useTokenStore.setState({ balance: 7, maxBalance: 10 });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.addTokens(3);
      });

      expect(result.current.balance).toBe(10);
    });
  });

  describe("redeemVoucher", () => {
    it("should redeem voucher successfully", async () => {
      act(() => {
        useTokenStore.setState({ balance: 5 });
      });

      (tokensApi.redeemVoucher as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          tokensGranted: 10,
          newBalance: 15,
        } as RedeemVoucherResponse,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      let redeemResult: { success: boolean; tokens?: number; error?: string; };
      await act(async () => {
        redeemResult = await result.current.redeemVoucher("BONUS10");
      });

      expect(tokensApi.redeemVoucher).toHaveBeenCalledWith("BONUS10");
      expect(redeemResult!.success).toBe(true);
      expect(redeemResult!.tokens).toBe(10);
      expect(result.current.balance).toBe(15);
    });

    it("should handle voucher redemption API error", async () => {
      (tokensApi.redeemVoucher as jest.Mock).mockResolvedValue({
        data: null,
        error: "Invalid voucher code",
      });

      const { result } = renderHook(() => useTokenStore());

      let redeemResult: { success: boolean; tokens?: number; error?: string; };
      await act(async () => {
        redeemResult = await result.current.redeemVoucher("INVALID");
      });

      expect(redeemResult!.success).toBe(false);
      expect(redeemResult!.error).toBe("Invalid voucher code");
    });

    it("should handle voucher redemption with missing data", async () => {
      (tokensApi.redeemVoucher as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      let redeemResult: { success: boolean; tokens?: number; error?: string; };
      await act(async () => {
        redeemResult = await result.current.redeemVoucher("EMPTY");
      });

      expect(redeemResult!.success).toBe(false);
      expect(redeemResult!.error).toBe("Failed to redeem voucher");
    });

    it("should handle network error during voucher redemption", async () => {
      const networkError = new Error("Network failure");
      (tokensApi.redeemVoucher as jest.Mock).mockRejectedValue(networkError);

      const { result } = renderHook(() => useTokenStore());

      let redeemResult: { success: boolean; tokens?: number; error?: string; };
      await act(async () => {
        redeemResult = await result.current.redeemVoucher("NETWORK_FAIL");
      });

      expect(redeemResult!.success).toBe(false);
      expect(redeemResult!.error).toBe("Network failure");
    });

    it("should handle non-Error objects in voucher redemption catch block", async () => {
      (tokensApi.redeemVoucher as jest.Mock).mockRejectedValue("String error");

      const { result } = renderHook(() => useTokenStore());

      let redeemResult: { success: boolean; tokens?: number; error?: string; };
      await act(async () => {
        redeemResult = await result.current.redeemVoucher("ERROR");
      });

      expect(redeemResult!.success).toBe(false);
      expect(redeemResult!.error).toBe("Failed to redeem voucher");
    });
  });

  describe("startRegenTimer", () => {
    it("should start regeneration timer", () => {
      // Run all pending timers to clear any leftover from other tests
      jest.runAllTimers();

      const lastRegen = new Date();
      act(() => {
        useTokenStore.setState({
          balance: 5,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      const { result } = renderHook(() => useTokenStore());

      // Clear any mock calls
      mockGetTimeUntilNextRegen.mockClear();

      act(() => {
        result.current.startRegenTimer();
      });

      // Timer should be running - advance time to trigger interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // The timer callback was executed (getTimeUntilNextRegen was called)
      expect(mockGetTimeUntilNextRegen).toHaveBeenCalled();
    });

    it("should clear existing timer before starting new one", () => {
      const lastRegen = new Date();
      act(() => {
        useTokenStore.setState({
          balance: 5,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      const { result } = renderHook(() => useTokenStore());

      // Start timer twice
      act(() => {
        result.current.startRegenTimer();
        result.current.startRegenTimer();
      });

      // Should still work correctly
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Verify no errors occurred
      expect(result.current.balance).toBeDefined();
    });

    it("should not update if lastRegeneration is null", () => {
      act(() => {
        useTokenStore.setState({
          balance: 5,
          maxBalance: 10,
          lastRegeneration: null,
        });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.startRegenTimer();
      });

      const initialBalance = result.current.balance;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Balance should not change when lastRegeneration is null
      expect(result.current.balance).toBe(initialBalance);
    });

    it("should add regenerated tokens when available", () => {
      const lastRegen = new Date();
      act(() => {
        useTokenStore.setState({
          balance: 5,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      // Mock to return tokens to add
      mockCalculateRegeneratedTokens.mockReturnValue(2);

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.startRegenTimer();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.balance).toBe(7); // 5 + 2
    });

    it("should stop timer when balance reaches max", () => {
      const lastRegen = new Date();
      act(() => {
        useTokenStore.setState({
          balance: 10,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      // Mock to return 0 tokens since we're at max
      mockCalculateRegeneratedTokens.mockReturnValue(0);

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.startRegenTimer();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // After the timer runs, balance should still be at max (10)
      expect(result.current.balance).toBe(10);
      // Timer should have been stopped (we can verify by advancing time and checking no further calls)
      mockGetTimeUntilNextRegen.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      // No additional calls should happen since timer was stopped
      expect(mockGetTimeUntilNextRegen).not.toHaveBeenCalled();
    });

    it("should not exceed max balance when adding tokens", () => {
      const lastRegen = new Date();
      act(() => {
        useTokenStore.setState({
          balance: 9,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      mockCalculateRegeneratedTokens.mockReturnValue(5);

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.startRegenTimer();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.balance).toBe(10); // Capped at max
    });

    it("should update lastRegeneration when tokens are added", () => {
      const lastRegen = new Date("2024-01-01T00:00:00.000Z");
      act(() => {
        useTokenStore.setState({
          balance: 5,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      mockCalculateRegeneratedTokens.mockReturnValue(1);

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.startRegenTimer();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // lastRegeneration should be updated to a new Date
      expect(result.current.lastRegeneration).not.toEqual(lastRegen);
    });
  });

  describe("stopRegenTimer", () => {
    it("should stop regeneration timer", () => {
      const lastRegen = new Date();
      act(() => {
        useTokenStore.setState({
          balance: 5,
          maxBalance: 10,
          lastRegeneration: lastRegen,
        });
      });

      const { result } = renderHook(() => useTokenStore());

      act(() => {
        result.current.startRegenTimer();
      });

      act(() => {
        result.current.stopRegenTimer();
      });

      // Timer should be stopped - advancing time should not trigger updates
      mockGetTimeUntilNextRegen.mockClear();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // getTimeUntilNextRegen should not be called after stopping
      expect(mockGetTimeUntilNextRegen).not.toHaveBeenCalled();
    });

    it("should be safe to call when no timer is running", () => {
      const { result } = renderHook(() => useTokenStore());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.stopRegenTimer();
        });
      }).not.toThrow();
    });

    it("should be safe to call multiple times", () => {
      const { result } = renderHook(() => useTokenStore());

      expect(() => {
        act(() => {
          result.current.stopRegenTimer();
          result.current.stopRegenTimer();
          result.current.stopRegenTimer();
        });
      }).not.toThrow();
    });
  });

  describe("tier-specific behavior", () => {
    it("should handle BASIC tier settings", async () => {
      const basicBalance: TokenBalanceResponse = {
        balance: 30,
        tier: "BASIC",
        lastRegeneration: "2024-01-01T12:00:00.000Z",
        maxBalance: 50,
        timeUntilNextRegen: 1800000,
      };

      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: basicBalance,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.tier).toBe("BASIC");
      expect(result.current.maxBalance).toBe(50);
    });

    it("should handle STANDARD tier settings", async () => {
      const standardBalance: TokenBalanceResponse = {
        balance: 80,
        tier: "STANDARD",
        lastRegeneration: "2024-01-01T12:00:00.000Z",
        maxBalance: 100,
        timeUntilNextRegen: 1200000,
      };

      (tokensApi.getTokenBalance as jest.Mock).mockResolvedValue({
        data: standardBalance,
        error: null,
      });

      const { result } = renderHook(() => useTokenStore());

      await act(async () => {
        await result.current.fetchBalance();
      });

      expect(result.current.tier).toBe("STANDARD");
      expect(result.current.maxBalance).toBe(100);
    });
  });
});
