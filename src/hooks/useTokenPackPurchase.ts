"use client";

import type { TokenPackageId } from "@/lib/stripe/client";
import { tryCatch } from "@/lib/try-catch";
import { useCallback, useState } from "react";

interface PurchaseResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

interface PurchaseResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Hook for handling token pack purchase checkout flow
 */
export function useTokenPackPurchase() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initiate token pack purchase via Stripe checkout
   * @param packageId - The token package to purchase (starter, basic, pro, power)
   * @returns Object with success status and checkout URL on success
   */
  const purchase = useCallback(
    async (packageId: TokenPackageId): Promise<PurchaseResult> => {
      setIsPurchasing(true);
      setError(null);

      const { data: response, error: fetchError } = await tryCatch(
        fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ packageId, mode: "payment" }),
        }),
      );

      if (fetchError) {
        const err = fetchError instanceof Error
          ? fetchError
          : new Error("Network error");
        setError(err);
        setIsPurchasing(false);
        return { success: false, error: err.message };
      }

      if (!response) {
        const err = new Error("No response from server");
        setError(err);
        setIsPurchasing(false);
        return { success: false, error: err.message };
      }

      const { data, error: jsonError } = await tryCatch(
        response.json() as Promise<PurchaseResponse>,
      );

      if (jsonError) {
        const err = jsonError instanceof Error
          ? jsonError
          : new Error("Failed to parse response");
        setError(err);
        setIsPurchasing(false);
        return { success: false, error: err.message };
      }

      if (!response.ok || !data.success) {
        const errorMessage = data.error || "Failed to initiate purchase";
        setError(new Error(errorMessage));
        setIsPurchasing(false);
        return { success: false, error: errorMessage };
      }

      setIsPurchasing(false);
      return { success: true, url: data.url };
    },
    [],
  );

  /**
   * Initiate purchase and redirect to Stripe checkout
   * @param packageId - The token package to purchase
   */
  const purchaseAndRedirect = useCallback(
    async (packageId: TokenPackageId): Promise<void> => {
      const result = await purchase(packageId);
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    },
    [purchase],
  );

  return {
    isPurchasing,
    error,
    purchase,
    purchaseAndRedirect,
  };
}
