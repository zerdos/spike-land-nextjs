import { ENHANCEMENT_COSTS } from "@/lib/stripe/client";
import { tryCatch } from "@/lib/try-catch";
import { useCallback, useEffect, useState } from "react";

interface TokenBalanceResponse {
  balance: number;
  lastRegeneration: string | null;
  timeUntilNextRegenMs?: number;
  tier?: string;
  maxBalance?: number;
  stats?: {
    totalSpent: number;
    totalEarned: number;
    totalRefunded: number;
    transactionCount: number;
  };
}

interface TokenStats {
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
  const [tier, setTier] = useState<string | null>(null);
  const [maxBalance, setMaxBalance] = useState<number | null>(null);
  const [lastRegeneration, setLastRegeneration] = useState<Date | null>(null);
  const [_nextRegenTime, setNextRegenTime] = useState<Date | null>(null);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Track last fetch time for debouncing focus refreshes
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);

    const { data: response, error: fetchError } = await tryCatch(
      fetch("/api/tokens/balance"),
    );

    if (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError : new Error("Unknown error"),
      );
      setIsLoading(false);
      return;
    }

    if (!response) {
      setError(new Error("No response from server"));
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      setError(new Error("Failed to fetch token balance"));
      setIsLoading(false);
      return;
    }

    const { data, error: jsonError } = await tryCatch(
      response.json() as Promise<TokenBalanceResponse>,
    );

    if (jsonError) {
      setError(
        jsonError instanceof Error ? jsonError : new Error("Unknown error"),
      );
      setIsLoading(false);
      return;
    }

    setBalance(data.balance);
    setTier(data.tier ?? null);
    setMaxBalance(data.maxBalance ?? null);
    setLastRegeneration(
      data.lastRegeneration ? new Date(data.lastRegeneration) : null,
    );

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
    setIsLoading(false);
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
    tier,
    maxBalance,
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
