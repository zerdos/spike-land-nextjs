/**
 * useEnhancement Hook
 * Handles the complete enhancement flow: upload, enhance, and poll for results
 */

import type { EnhancedImage, EnhancementTier, ImageEnhancementJob } from "@spike-npm-land/shared";
import { ENHANCEMENT_COSTS } from "@spike-npm-land/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EnhanceImageParams } from "../services/api/images";
import { enhanceImage, uploadImage } from "../services/api/images";
import { getStageDescription, getStageProgress, pollJobUntilComplete } from "../services/api/jobs";
import { useTokenStore } from "../stores/token-store";
import type { SelectedImage } from "./useImagePicker";

// ============================================================================
// Types
// ============================================================================

export type EnhancementStatus =
  | "idle"
  | "uploading"
  | "selecting_tier"
  | "enhancing"
  | "polling"
  | "completed"
  | "failed";

export interface EnhancementState {
  status: EnhancementStatus;
  sourceImage: SelectedImage | null;
  uploadedImage: EnhancedImage | null;
  currentJob: ImageEnhancementJob | null;
  selectedTier: EnhancementTier | null;
  progress: number;
  progressMessage: string;
  error: string | null;
  enhancedImageUrl: string | null;
}

export interface UseEnhancementReturn extends EnhancementState {
  // Actions
  startUpload: (image: SelectedImage) => Promise<boolean>;
  selectTier: (tier: EnhancementTier) => void;
  startEnhancement: () => Promise<boolean>;
  cancelEnhancement: () => void;
  reset: () => void;
  // Computed
  canAffordTier: (tier: EnhancementTier) => boolean;
  getTierCost: (tier: EnhancementTier) => number;
  estimatedEnhancements: {
    tier1K: number;
    tier2K: number;
    tier4K: number;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: EnhancementState = {
  status: "idle",
  sourceImage: null,
  uploadedImage: null,
  currentJob: null,
  selectedTier: null,
  progress: 0,
  progressMessage: "",
  error: null,
  enhancedImageUrl: null,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEnhancement(): UseEnhancementReturn {
  const [state, setState] = useState<EnhancementState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<boolean>(false);

  const { balance, deductTokens, fetchBalance } = useTokenStore();

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<EnhancementState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Get the cost for a specific tier
   */
  const getTierCost = useCallback((tier: EnhancementTier): number => {
    return ENHANCEMENT_COSTS[tier] || 0;
  }, []);

  /**
   * Check if user can afford a tier
   */
  const canAffordTier = useCallback(
    (tier: EnhancementTier): boolean => {
      const cost = getTierCost(tier);
      return balance >= cost;
    },
    [balance, getTierCost],
  );

  /**
   * Calculate estimated enhancements per tier
   */
  const estimatedEnhancements = {
    tier1K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_1K),
    tier2K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_2K),
    tier4K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_4K),
  };

  /**
   * Upload an image to the server
   */
  const startUpload = useCallback(
    async (image: SelectedImage): Promise<boolean> => {
      updateState({
        status: "uploading",
        sourceImage: image,
        error: null,
        progress: 0,
        progressMessage: "Uploading image...",
      });

      try {
        const response = await uploadImage({
          uri: image.uri,
          name: image.fileName,
          type: image.mimeType,
        });

        if (response.error || !response.data) {
          updateState({
            status: "failed",
            error: response.error || "Upload failed",
            progress: 0,
            progressMessage: "",
          });
          return false;
        }

        updateState({
          status: "selecting_tier",
          uploadedImage: response.data.image,
          progress: 100,
          progressMessage: "Upload complete",
        });

        return true;
      } catch (err) {
        updateState({
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
          progress: 0,
          progressMessage: "",
        });
        return false;
      }
    },
    [updateState],
  );

  /**
   * Select enhancement tier
   */
  const selectTier = useCallback(
    (tier: EnhancementTier) => {
      if (!canAffordTier(tier)) {
        updateState({
          error: `Insufficient tokens. ${tier} requires ${getTierCost(tier)} tokens.`,
        });
        return;
      }

      updateState({
        selectedTier: tier,
        error: null,
      });
    },
    [canAffordTier, getTierCost, updateState],
  );

  /**
   * Start the enhancement process
   */
  const startEnhancement = useCallback(async (): Promise<boolean> => {
    const { uploadedImage, selectedTier } = state;

    if (!uploadedImage || !selectedTier) {
      updateState({
        error: "Please upload an image and select a tier first",
      });
      return false;
    }

    if (!canAffordTier(selectedTier)) {
      updateState({
        error: "Insufficient tokens for this tier",
      });
      return false;
    }

    updateState({
      status: "enhancing",
      error: null,
      progress: 0,
      progressMessage: "Starting enhancement...",
    });

    try {
      // Optimistically deduct tokens
      const cost = getTierCost(selectedTier);
      deductTokens(cost);

      // Request enhancement
      const enhanceParams: EnhanceImageParams = {
        imageId: uploadedImage.id,
        tier: selectedTier,
      };

      const response = await enhanceImage(enhanceParams);

      if (response.error || !response.data?.job) {
        // Refund tokens on failure
        fetchBalance();
        updateState({
          status: "failed",
          error: response.error || "Enhancement failed to start",
          progress: 0,
          progressMessage: "",
        });
        return false;
      }

      const job = response.data.job;

      updateState({
        status: "polling",
        currentJob: job,
        progress: 10,
        progressMessage: "Enhancement in progress...",
      });

      // Start polling for job completion
      pollingRef.current = true;
      abortControllerRef.current = new AbortController();

      try {
        const completedJob = await pollJobUntilComplete({
          jobId: job.id,
          onProgress: (progressJob) => {
            if (!pollingRef.current) return;

            const progress = getStageProgress(progressJob.currentStage);
            const message = getStageDescription(progressJob.currentStage);

            updateState({
              currentJob: progressJob,
              progress,
              progressMessage: message,
            });
          },
          onComplete: (completedJob) => {
            updateState({
              status: "completed",
              currentJob: completedJob,
              enhancedImageUrl: completedJob.enhancedUrl,
              progress: 100,
              progressMessage: "Enhancement complete!",
            });
          },
          onError: (error) => {
            // Refund tokens on job failure
            fetchBalance();
            updateState({
              status: "failed",
              error,
              progress: 0,
              progressMessage: "",
            });
          },
        });

        pollingRef.current = false;
        return completedJob.status === "COMPLETED";
      } catch (pollError) {
        pollingRef.current = false;
        fetchBalance();
        updateState({
          status: "failed",
          error: pollError instanceof Error
            ? pollError.message
            : "Enhancement failed",
          progress: 0,
          progressMessage: "",
        });
        return false;
      }
    } catch (err) {
      fetchBalance();
      updateState({
        status: "failed",
        error: err instanceof Error ? err.message : "Enhancement failed",
        progress: 0,
        progressMessage: "",
      });
      return false;
    }
  }, [
    state,
    canAffordTier,
    getTierCost,
    deductTokens,
    fetchBalance,
    updateState,
  ]);

  /**
   * Cancel the current enhancement
   */
  const cancelEnhancement = useCallback(() => {
    pollingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Refund tokens if enhancement was in progress
    if (state.status === "polling" || state.status === "enhancing") {
      fetchBalance();
    }

    updateState({
      status: "idle",
      currentJob: null,
      progress: 0,
      progressMessage: "",
      error: null,
    });
  }, [state.status, fetchBalance, updateState]);

  /**
   * Reset the entire enhancement flow
   */
  const reset = useCallback(() => {
    pollingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startUpload,
    selectTier,
    startEnhancement,
    cancelEnhancement,
    reset,
    canAffordTier,
    getTierCost,
    estimatedEnhancements,
  };
}
