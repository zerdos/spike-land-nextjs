import { useCallback, useEffect, useState } from "react";

interface TokenBalance {
  balance: number;
  lastRegeneration: string | null;
}

const LOW_BALANCE_THRESHOLD = 5;

export function useTokenBalance(options?: { autoRefreshOnFocus?: boolean; }) {
  const [balance, setBalance] = useState<number>(0);
  const [lastRegeneration, setLastRegeneration] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tokens/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch token balance");
      }
      const data: TokenBalance = await response.json();
      setBalance(data.balance);
      setLastRegeneration(data.lastRegeneration ? new Date(data.lastRegeneration) : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh on window focus
  useEffect(() => {
    if (!options?.autoRefreshOnFocus) return;

    const handleFocus = () => {
      fetchBalance();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [options?.autoRefreshOnFocus, fetchBalance]);

  // Compute if balance is low
  const isLowBalance = balance < LOW_BALANCE_THRESHOLD;

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
    lastRegeneration,
    timeUntilNextRegeneration: getTimeUntilNextRegeneration(),
    refetch: fetchBalance,
  };
}
