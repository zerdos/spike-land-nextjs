/**
 * useTokenBalance Hook
 * Real-time token balance with regeneration countdown
 */

import { ENHANCEMENT_COSTS, formatDuration } from "@spike-npm-land/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTokenStore } from "../stores";

// ============================================================================
// Types
// ============================================================================

interface TokenBalanceStats {
  totalSpent: number;
  totalEarned: number;
  transactionCount: number;
}

interface EstimatedEnhancements {
  tier1K: number;
  tier2K: number;
  tier4K: number;
}

interface UseTokenBalanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTokenBalanceReturn {
  balance: number;
  maxBalance: number;
  tier: string;
  isLoading: boolean;
  error: string | null;
  timeUntilNextRegen: number;
  formattedTimeUntilRegen: string | null;
  estimatedEnhancements: EstimatedEnhancements;
  stats: TokenBalanceStats | null;
  refetch: () => Promise<void>;
  deductTokens: (amount: number) => void;
  addTokens: (amount: number) => void;
  hasEnoughTokens: (amount: number) => boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useTokenBalance(
  options: UseTokenBalanceOptions = {},
): UseTokenBalanceReturn {
  const { autoRefresh = true, refreshInterval = 60000 } = options;

  const {
    balance,
    maxBalance,
    tier,
    isLoading,
    error,
    timeUntilNextRegen,
    fetchBalance,
    deductTokens,
    addTokens,
    startRegenTimer,
    stopRegenTimer,
  } = useTokenStore();

  const [stats, _setStats] = useState<TokenBalanceStats | null>(null);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();

    // Start regeneration timer
    if (autoRefresh) {
      startRegenTimer();
    }

    return () => {
      stopRegenTimer();
    };
  }, [fetchBalance, autoRefresh, startRegenTimer, stopRegenTimer]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchBalance]);

  // Format time until next regeneration
  const formattedTimeUntilRegen = useMemo(() => {
    if (timeUntilNextRegen <= 0 || balance >= maxBalance) {
      return null;
    }
    return formatDuration(timeUntilNextRegen);
  }, [timeUntilNextRegen, balance, maxBalance]);

  // Calculate estimated enhancements
  const estimatedEnhancements = useMemo<EstimatedEnhancements>(() => {
    return {
      tier1K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_1K),
      tier2K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_2K),
      tier4K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_4K),
    };
  }, [balance]);

  // Check if user has enough tokens
  const hasEnoughTokens = useCallback(
    (amount: number) => {
      return balance >= amount;
    },
    [balance],
  );

  // Refetch balance
  const refetch = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    maxBalance,
    tier,
    isLoading,
    error,
    timeUntilNextRegen,
    formattedTimeUntilRegen,
    estimatedEnhancements,
    stats,
    refetch,
    deductTokens,
    addTokens,
    hasEnoughTokens,
  };
}

export default useTokenBalance;
