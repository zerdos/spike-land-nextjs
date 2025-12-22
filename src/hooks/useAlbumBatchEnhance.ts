import { EnhancementTier } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

import { tryCatch } from "@/lib/try-catch";

interface BatchJobStatus {
  imageId: string;
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  enhancedUrl?: string;
  error?: string;
}

interface UseAlbumBatchEnhanceOptions {
  albumId: string;
  onComplete?: (results: BatchJobStatus[]) => void;
  onError?: (error: string) => void;
}

interface UseAlbumBatchEnhanceReturn {
  startBatchEnhance: (
    tier: EnhancementTier,
    skipAlreadyEnhanced?: boolean,
  ) => Promise<void>;
  jobs: BatchJobStatus[];
  isProcessing: boolean;
  progress: number;
  completedCount: number;
  failedCount: number;
  totalCost: number;
  cancel: () => void;
}

interface BatchEnhanceResponse {
  success: boolean;
  batchId: string;
  jobs: Array<{
    imageId: string;
    jobId: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    totalCost: number;
    newBalance: number;
  };
}

interface BatchStatusResponse {
  jobs: Array<{
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    errorMessage: string | null;
  }>;
}

// Exponential backoff configuration
const INITIAL_POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_INTERVAL = 10000; // 10 seconds
const BACKOFF_MULTIPLIER = 1.5; // 50% increase each time
const MAX_POLL_ATTEMPTS = 60; // Stop after 60 attempts (~5 minutes with backoff)

export function useAlbumBatchEnhance({
  albumId,
  onComplete,
  onError,
}: UseAlbumBatchEnhanceOptions): UseAlbumBatchEnhanceReturn {
  const [jobs, setJobs] = useState<BatchJobStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  // Refs for polling control
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);
  const pollAttemptsRef = useRef(0);
  const currentIntervalRef = useRef(INITIAL_POLL_INTERVAL);
  const jobsRef = useRef<BatchJobStatus[]>([]);

  /**
   * Cancel any ongoing batch enhancement
   */
  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    jobsRef.current = []; // Clear jobs ref to prevent stale data
    setJobs([]);
    setIsProcessing(false);
  }, []);

  /**
   * Poll for batch job statuses
   */
  const pollJobStatuses = useCallback(
    async (jobIds: string[]) => {
      if (isCancelledRef.current || jobIds.length === 0) {
        return;
      }

      pollAttemptsRef.current++;

      // Use batch status endpoint to reduce API calls
      const { data: response, error: fetchError } = await tryCatch(
        fetch("/api/jobs/batch-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobIds }),
        }),
      );

      if (fetchError) {
        console.error("Error polling job statuses:", fetchError);
        setIsProcessing(false);

        if (onError && !isCancelledRef.current) {
          onError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to poll job statuses",
          );
        }
        return;
      }

      if (!response.ok) {
        const error = new Error("Failed to fetch batch status");
        console.error("Error polling job statuses:", error);
        setIsProcessing(false);

        if (onError && !isCancelledRef.current) {
          onError(error.message);
        }
        return;
      }

      const { data, error: jsonError } = await tryCatch<BatchStatusResponse>(
        response.json(),
      );

      if (jsonError) {
        console.error("Error polling job statuses:", jsonError);
        setIsProcessing(false);

        if (onError && !isCancelledRef.current) {
          onError(
            jsonError instanceof Error
              ? jsonError.message
              : "Failed to poll job statuses",
          );
        }
        return;
      }

      // Build a map of status updates for efficient lookup
      const statusMap = new Map(
        data.jobs.map((
          j,
        ) => [j.id, { status: j.status, error: j.errorMessage }]),
      );

      // Compute updated jobs from ref to avoid race conditions with state batching
      const updatedJobs: BatchJobStatus[] = jobsRef.current.map((job) => {
        const statusUpdate = statusMap.get(job.jobId);
        if (statusUpdate) {
          return {
            ...job,
            status: statusUpdate.status,
            error: statusUpdate.error || undefined,
          };
        }
        return job;
      });

      // Update both ref and state atomically
      jobsRef.current = updatedJobs;
      setJobs(updatedJobs);

      // Check if all jobs are complete
      const allComplete = data.jobs.every(
        (j) => j.status === "COMPLETED" || j.status === "FAILED",
      );

      if (allComplete || pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setIsProcessing(false);

        // Use the captured updatedJobs which has the latest status
        if (onComplete && !isCancelledRef.current) {
          onComplete(updatedJobs);
        }
      } else if (!isCancelledRef.current) {
        // Apply exponential backoff with cap
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * BACKOFF_MULTIPLIER,
          MAX_POLL_INTERVAL,
        );

        // Clear any existing timeout before scheduling new one to prevent phantom timeouts
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
        }
        // Schedule next poll
        pollTimeoutRef.current = setTimeout(() => {
          pollJobStatuses(jobIds);
        }, currentIntervalRef.current);
      }
    },
    [onComplete, onError],
  );

  /**
   * Start batch enhancement for the album
   */
  const startBatchEnhance = useCallback(
    async (tier: EnhancementTier, skipAlreadyEnhanced = true) => {
      // Reset state
      isCancelledRef.current = false;
      pollAttemptsRef.current = 0;
      currentIntervalRef.current = INITIAL_POLL_INTERVAL;
      jobsRef.current = [];
      setJobs([]);
      setIsProcessing(true);

      // Call album batch enhance API
      const { data: response, error: fetchError } = await tryCatch(
        fetch(`/api/albums/${albumId}/enhance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tier,
            skipAlreadyEnhanced,
          }),
        }),
      );

      if (fetchError) {
        console.error("Error starting batch enhancement:", fetchError);
        setIsProcessing(false);

        if (onError && !isCancelledRef.current) {
          onError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to start batch enhancement",
          );
        }
        return;
      }

      if (!response.ok) {
        const { data: errorData } = await tryCatch<{ error?: string; }>(
          response.json(),
        );
        const errorMessage = errorData?.error || "Batch enhancement failed";
        console.error(
          "Error starting batch enhancement:",
          new Error(errorMessage),
        );
        setIsProcessing(false);

        if (onError && !isCancelledRef.current) {
          onError(errorMessage);
        }
        return;
      }

      const { data, error: jsonError } = await tryCatch<BatchEnhanceResponse>(
        response.json(),
      );

      if (jsonError) {
        console.error("Error starting batch enhancement:", jsonError);
        setIsProcessing(false);

        if (onError && !isCancelledRef.current) {
          onError(
            jsonError instanceof Error
              ? jsonError.message
              : "Failed to start batch enhancement",
          );
        }
        return;
      }

      // Initialize job statuses
      const initialJobs: BatchJobStatus[] = data.jobs.map((job) => ({
        imageId: job.imageId,
        jobId: job.jobId,
        status: job.success ? "PENDING" : "FAILED",
        error: job.error,
      }));

      jobsRef.current = initialJobs;
      setJobs(initialJobs);
      setTotalCost(data.summary.totalCost);

      // Get successful job IDs for polling
      const successfulJobIds = data.jobs
        .filter((job) => job.success)
        .map((job) => job.jobId);

      if (successfulJobIds.length > 0 && !isCancelledRef.current) {
        // Start polling for completion
        pollJobStatuses(successfulJobIds);
      } else {
        // All jobs failed or were skipped
        setIsProcessing(false);

        if (onComplete && !isCancelledRef.current) {
          onComplete(initialJobs);
        }
      }
    },
    [albumId, onComplete, onError, pollJobStatuses],
  );

  /**
   * Calculate progress metrics
   */
  const completedCount = jobs.filter((job) => job.status === "COMPLETED").length;
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;
  const progress = jobs.length > 0
    ? ((completedCount + failedCount) / jobs.length) * 100
    : 0;

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  return {
    startBatchEnhance,
    jobs,
    isProcessing,
    progress,
    completedCount,
    failedCount,
    totalCost,
    cancel,
  };
}
