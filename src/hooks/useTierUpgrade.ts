"use client";

import { tryCatch } from "@/lib/try-catch";
import { useCallback, useState } from "react";

// Valid tier IDs for upgrade (matches TierSubscriptionId)
export type UpgradeTierId = "BASIC" | "STANDARD" | "PREMIUM";

interface UpgradeResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

interface UpgradeResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Hook for handling tier upgrade checkout flow
 */
export function useTierUpgrade() {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initiate tier upgrade via Stripe checkout
   * @param targetTier - The tier to upgrade to (BASIC, STANDARD, or PREMIUM)
   * @returns Object with success status and checkout URL on success
   */
  const upgrade = useCallback(
    async (targetTier: UpgradeTierId): Promise<UpgradeResult> => {
      setIsUpgrading(true);
      setError(null);

      const { data: response, error: fetchError } = await tryCatch(
        fetch("/api/tiers/upgrade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetTier }),
        }),
      );

      if (fetchError) {
        const err = fetchError instanceof Error
          ? fetchError
          : new Error("Network error");
        setError(err);
        setIsUpgrading(false);
        return { success: false, error: err.message };
      }

      if (!response) {
        const err = new Error("No response from server");
        setError(err);
        setIsUpgrading(false);
        return { success: false, error: err.message };
      }

      const { data, error: jsonError } = await tryCatch(
        response.json() as Promise<UpgradeResponse>,
      );

      if (jsonError) {
        const err = jsonError instanceof Error
          ? jsonError
          : new Error("Failed to parse response");
        setError(err);
        setIsUpgrading(false);
        return { success: false, error: err.message };
      }

      if (!response.ok || !data.success) {
        const errorMessage = data.error || "Failed to initiate upgrade";
        setError(new Error(errorMessage));
        setIsUpgrading(false);
        return { success: false, error: errorMessage };
      }

      setIsUpgrading(false);
      return { success: true, url: data.url };
    },
    [],
  );

  /**
   * Initiate upgrade and redirect to Stripe checkout
   * @param targetTier - The tier to upgrade to
   */
  const upgradeAndRedirect = useCallback(
    async (targetTier: UpgradeTierId): Promise<void> => {
      const result = await upgrade(targetTier);
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    },
    [upgrade],
  );

  return {
    isUpgrading,
    error,
    upgrade,
    upgradeAndRedirect,
  };
}
