"use client";

import type { TierType } from "@/components/tiers/TierBadge";
import { tryCatch } from "@/lib/try-catch";
import { useCallback, useEffect, useState } from "react";

// Types matching the API responses
export interface TierInfo {
  tier: TierType;
  displayName: string;
  wellCapacity: number;
  priceGBP: number;
  isCurrent?: boolean;
}

interface TiersResponse {
  tiers: TierInfo[];
  currentTier: string;
  canUpgrade: boolean;
  nextTier: TierInfo | null;
}

interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number;
}

interface UpgradePromptResponse {
  showUpgradePrompt: boolean;
  isPremiumAtZero: boolean;
  currentTier: string;
  nextTier?: TierInfo;
  options?: {
    timeUntilNextRegen: number;
    tokenPacks: TokenPack[];
  };
}

// LocalStorage key for prompt dismissal
const PROMPT_DISMISS_KEY = "tier-upgrade-prompt-dismissed";
const PROMPT_DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if the upgrade prompt has been dismissed recently
 */
function isPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem(PROMPT_DISMISS_KEY);
  if (!stored) return false;

  try {
    const { timestamp } = JSON.parse(stored);
    const elapsed = Date.now() - timestamp;
    return elapsed < PROMPT_DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Hook for managing tier information and upgrade prompts
 */
export function useTier() {
  // Tier data state
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [canUpgrade, setCanUpgrade] = useState(false);
  const [nextTier, setNextTier] = useState<TierInfo | null>(null);

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isPremiumAtZero, setIsPremiumAtZero] = useState(false);
  const [premiumOptions, setPremiumOptions] = useState<
    {
      timeUntilNextRegen: number;
      tokenPacks: TokenPack[];
    } | null
  >(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all tiers and current tier info
   */
  const fetchTiers = useCallback(async () => {
    setIsLoading(true);

    const { data: response, error: fetchError } = await tryCatch(
      fetch("/api/tiers"),
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
      // If unauthorized, don't treat as error - user might not be logged in
      if (response.status === 401) {
        setIsLoading(false);
        return;
      }
      setError(new Error("Failed to fetch tier information"));
      setIsLoading(false);
      return;
    }

    const { data, error: jsonError } = await tryCatch(
      response.json() as Promise<TiersResponse>,
    );

    if (jsonError) {
      setError(
        jsonError instanceof Error ? jsonError : new Error("Unknown error"),
      );
      setIsLoading(false);
      return;
    }

    setTiers(data.tiers);
    setCurrentTier(data.currentTier);
    setCanUpgrade(data.canUpgrade);
    setNextTier(data.nextTier);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Check if the upgrade prompt should be shown
   */
  const checkPromptStatus = useCallback(async () => {
    // Don't check if prompt was dismissed recently
    if (isPromptDismissed()) {
      setShowUpgradePrompt(false);
      return;
    }

    const { data: response, error: fetchError } = await tryCatch(
      fetch("/api/tiers/check-upgrade-prompt"),
    );

    if (fetchError || !response || !response.ok) {
      // Silently fail - don't show prompt on error
      return;
    }

    const { data, error: jsonError } = await tryCatch(
      response.json() as Promise<UpgradePromptResponse>,
    );

    if (jsonError) {
      return;
    }

    setShowUpgradePrompt(data.showUpgradePrompt);
    setIsPremiumAtZero(data.isPremiumAtZero);
    setCurrentTier(data.currentTier);

    if (data.nextTier) {
      setNextTier(data.nextTier);
    }

    if (data.options) {
      setPremiumOptions(data.options);
    }
  }, []);

  /**
   * Dismiss the upgrade prompt (stores in localStorage)
   */
  const dismissPrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        PROMPT_DISMISS_KEY,
        JSON.stringify({ timestamp: Date.now() }),
      );
    }
    setShowUpgradePrompt(false);
  }, []);

  /**
   * Refetch all tier data
   */
  const refetch = useCallback(async () => {
    await Promise.all([fetchTiers(), checkPromptStatus()]);
  }, [fetchTiers, checkPromptStatus]);

  // Initial fetch on mount
  useEffect(() => {
    fetchTiers();
    checkPromptStatus();
  }, [fetchTiers, checkPromptStatus]);

  return {
    // Tier data
    tiers,
    currentTier,
    canUpgrade,
    nextTier,

    // Upgrade prompt state
    showUpgradePrompt,
    isPremiumAtZero,
    premiumOptions,

    // Loading and error states
    isLoading,
    error,

    // Actions
    refetch,
    dismissPrompt,
    checkPromptStatus,
  };
}
