import { ENHANCEMENT_COSTS } from "@/lib/stripe/client";
import { useCallback, useEffect, useState } from "react";

interface TokenBalanceResponse {
  balance: number;
  lastRegeneration: string | null;
  timeUntilNextRegenMs?: number;
  stats?: {
    totalSpent: number;
    totalEarned: number;
    totalRefunded: number;
    transactionCount: number;
  };
}

export interface TokenStats {
  totalSpent: number;
  totalEarned: number;
  totalRefunded: number;
  transactionCount: number;
}

export const LOW_BALANCE_THRESHOLD = 10;
export const CRITICAL_BALANCE_THRESHOLD = 5;

// Minimum time between focus-triggered refreshes (5 seconds)
const FOCUS_DEBOUNCE_MS = 5000;

/**
 * Calculate estimated enhancements remaining based on balance and average tier usage
 */
export function calculateEstimatedEnhancements(
  balance: number,
  averageTier: "TIER_1K" | "TIER_2K" | "TIER_4K" = "TIER_1K",
): {
  tier1K: number;
  tier2K: number;
  tier4K: number;
  suggested: number;
  suggestedTier: string;
} {
  const tier1K = Math.floor(balance / ENHANCEMENT_COSTS.TIER_1K);
  const tier2K = Math.floor(balance / ENHANCEMENT_COSTS.TIER_2K);
  const tier4K = Math.floor(balance / ENHANCEMENT_COSTS.TIER_4K);

  const suggestedMap = {
    TIER_1K: { count: tier1K, label: "1K" },
    TIER_2K: { count: tier2K, label: "2K" },
    TIER_4K: { count: tier4K, label: "4K" },
  };

  const suggested = suggestedMap[averageTier];

  return {
    tier1K,
    tier2K,
    tier4K,
    suggested: suggested.count,
    suggestedTier: suggested.label,
  };
}

export function useTokenBalance(options?: { autoRefreshOnFocus?: boolean; }) {
  const [balance, setBalance] = useState<number>(0);
  const [lastRegeneration, setLastRegeneration] = useState<Date | null>(null);
  const [nextRegenTime, setNextRegenTime] = useState<Date | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Track last fetch time for debouncing focus refreshes
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tokens/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch token balance");
      }
      const data: TokenBalanceResponse = await response.json();
      setBalance(data.balance);
      setLastRegeneration(data.lastRegeneration ? new Date(data.lastRegeneration) : null);

      // Calculate next regen time based on "timeUntilNextRegenMs" which is relative to "now" on server
      // We'll use client "now" + delay
      if (typeof data.timeUntilNextRegenMs === "number") {
        setNextRegenTime(new Date(Date.now() + data.timeUntilNextRegenMs));
      }

      if (data.stats) {
        setStats(data.stats);
      }
      setError(null);
      setLastFetchTime(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh on window focus with debouncing
  useEffect(() => {
    if (!options?.autoRefreshOnFocus) return;

    const handleFocus = () => {
      // Only fetch if more than FOCUS_DEBOUNCE_MS has passed since last fetch
      const now = Date.now();
      if (now - lastFetchTime >= FOCUS_DEBOUNCE_MS) {
        fetchBalance();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [options?.autoRefreshOnFocus, fetchBalance, lastFetchTime]);

  // Compute if balance is low (< 10) or critical (< 5)
  const isLowBalance = balance < LOW_BALANCE_THRESHOLD;
  const isCriticalBalance = balance < CRITICAL_BALANCE_THRESHOLD;

  // Calculate estimated enhancements
  const estimatedEnhancements = calculateEstimatedEnhancements(balance);

  // Calculate time until next regeneration (assuming daily at midnight UTC)
  const getTimeUntilNextRegeneration = useCallback((): string | null => {
    if (!lastRegeneration) return null;

    const now = new Date();
    const nextRegen = new Date(lastRegeneration);
    nextRegen.setDate(nextRegen.getDate() + 1);

    if (now >= nextRegen) {
      return "Available now";
    }

    const diffMs = nextRegen.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [lastRegeneration]);

  return {
    balance,
    isLoading,
    error,
    isLowBalance,
    isCriticalBalance,
    lastRegeneration,
    timeUntilNextRegeneration: getTimeUntilNextRegeneration(),
    stats,
    estimatedEnhancements,
    refetch: fetchBalance,
  };
}
