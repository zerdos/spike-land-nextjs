import { tryCatch } from "@/lib/try-catch";
import type { EnhancementTier, JobStatus as PrismaJobStatus } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface JobStatus {
  jobId: string;
  tier: EnhancementTier;
  status: PrismaJobStatus;
  enhancedUrl?: string;
  enhancedWidth?: number;
  enhancedHeight?: number;
  error?: string;
}

export interface UseParallelEnhancementOptions {
  imageId: string;
  onAllComplete?: (jobs: JobStatus[]) => void;
  onError?: (jobId: string, error: string) => void;
  onJobUpdate?: (job: JobStatus) => void;
}

export interface UseParallelEnhancementReturn {
  startEnhancement: (tiers: EnhancementTier[]) => Promise<void>;
  jobs: JobStatus[];
  isProcessing: boolean;
  completedCount: number;
  failedCount: number;
  cancelAll: () => void;
}

interface JobStreamData {
  type: "status" | "error" | "connected";
  status?: PrismaJobStatus;
  enhancedUrl?: string | null;
  enhancedWidth?: number | null;
  enhancedHeight?: number | null;
  errorMessage?: string | null;
  message?: string;
}

/**
 * Hook for managing parallel enhancement jobs
 *
 * Handles multiple enhancement tiers simultaneously with real-time SSE updates.
 * Tracks overall progress and provides aggregated status.
 *
 * @example
 * ```tsx
 * const { startEnhancement, jobs, isProcessing } = useParallelEnhancement({
 *   imageId: image.id,
 *   onAllComplete: (jobs) => console.log("All done!", jobs),
 * });
 *
 * // Start enhancements for multiple tiers
 * await startEnhancement(["TIER_1K", "TIER_2K", "TIER_4K"]);
 * ```
 */
export function useParallelEnhancement({
  imageId,
  onAllComplete,
  onError,
  onJobUpdate,
}: UseParallelEnhancementOptions): UseParallelEnhancementReturn {
  const [jobs, setJobs] = useState<Map<string, JobStatus>>(new Map());
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const hasCalledOnAllCompleteRef = useRef(false);
  const isMountedRef = useRef(true);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const maxReconnectAttempts = 5;

  // Convert Map to array for return value
  const jobsArray = Array.from(jobs.values());
  const isProcessing = jobsArray.some(
    (job) => job.status === "PENDING" || job.status === "PROCESSING",
  );
  const completedCount = jobsArray.filter((job) => job.status === "COMPLETED").length;
  const failedCount = jobsArray.filter(
    (job) => job.status === "FAILED" || job.status === "REFUNDED",
  ).length;

  // Update job status
  const updateJob = useCallback(
    (jobId: string, updates: Partial<JobStatus>) => {
      setJobs((prev) => {
        const job = prev.get(jobId);
        if (!job) return prev;

        const updatedJob = { ...job, ...updates };
        const newJobs = new Map(prev);
        newJobs.set(jobId, updatedJob);

        onJobUpdate?.(updatedJob);

        return newJobs;
      });
    },
    [onJobUpdate],
  );

  // Handle SSE message for a specific job
  const handleMessage = useCallback(
    (jobId: string) => async (event: MessageEvent) => {
      const { data, error: parseError } = await tryCatch(
        new Promise<JobStreamData>((resolve, reject) => {
          try {
            resolve(JSON.parse(event.data) as JobStreamData);
          } catch (e) {
            reject(e);
          }
        }),
      );

      if (parseError) {
        console.error("Failed to parse SSE message:", parseError);
        return;
      }

      if (data.type === "connected") {
        return;
      }

      if (data.type === "error") {
        updateJob(jobId, {
          status: "FAILED",
          error: data.message || "Unknown error",
        });
        onError?.(jobId, data.message || "Unknown error");
        return;
      }

      if (data.type === "status" && data.status) {
        updateJob(jobId, {
          status: data.status,
          enhancedUrl: data.enhancedUrl || undefined,
          enhancedWidth: data.enhancedWidth || undefined,
          enhancedHeight: data.enhancedHeight || undefined,
          error: data.errorMessage || undefined,
        });

        if (data.status === "FAILED") {
          onError?.(jobId, data.errorMessage || "Enhancement failed");
        }
      }
    },
    [updateJob, onError],
  );

  // Connect to SSE stream for a specific job
  const connectToJob = useCallback(
    (jobId: string) => {
      // Clean up existing connection
      const existingEventSource = eventSourcesRef.current.get(jobId);
      if (existingEventSource) {
        existingEventSource.close();
      }

      const existingTimeout = reconnectTimeoutsRef.current.get(jobId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        reconnectTimeoutsRef.current.delete(jobId);
      }

      const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

      eventSource.onopen = () => {
        reconnectAttemptsRef.current.set(jobId, 0);
      };

      eventSource.onmessage = handleMessage(jobId);

      eventSource.onerror = () => {
        // Don't reconnect if stream was intentionally closed
        if (eventSource.readyState === EventSource.CLOSED) {
          return;
        }

        // Attempt to reconnect with exponential backoff
        const attempts = reconnectAttemptsRef.current.get(jobId) || 0;
        if (attempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          reconnectAttemptsRef.current.set(jobId, attempts + 1);

          const timeout = setTimeout(() => {
            if (!isMountedRef.current) return; // Don't reconnect after unmount
            eventSource.close();
            eventSourcesRef.current.delete(jobId);
            reconnectTimeoutsRef.current.delete(jobId); // Clean up timeout ref
            connectToJob(jobId);
          }, delay);

          reconnectTimeoutsRef.current.set(jobId, timeout);
        } else {
          const error = "Connection lost. Please refresh the page.";
          updateJob(jobId, {
            status: "FAILED",
            error,
          });
          onError?.(jobId, error);
        }
      };

      eventSourcesRef.current.set(jobId, eventSource);
    },
    [handleMessage, updateJob, onError],
  );

  // Start enhancement for multiple tiers
  const startEnhancement = useCallback(
    async (tiers: EnhancementTier[]) => {
      // Reset completion flag
      hasCalledOnAllCompleteRef.current = false;

      // Call API to start parallel enhancements
      const { data: response, error: fetchError } = await tryCatch(
        fetch("/api/images/parallel-enhance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId,
            tiers,
          }),
        }),
      );

      if (fetchError) {
        console.error("Failed to start enhancement:", fetchError);
        throw fetchError;
      }

      if (!response.ok) {
        const { data: errorData } = await tryCatch(response.json());
        const errorMessage = errorData?.error || "Failed to start enhancement";
        const error = new Error(errorMessage);
        console.error("Failed to start enhancement:", error);
        throw error;
      }

      const { data, error: jsonError } = await tryCatch(response.json());

      if (jsonError) {
        console.error("Failed to start enhancement:", jsonError);
        throw jsonError;
      }

      const newJobs: Map<string, JobStatus> = new Map();

      // Initialize job statuses and connect to SSE streams
      for (const job of data.jobs) {
        const jobStatus: JobStatus = {
          jobId: job.jobId,
          tier: job.tier,
          status: job.status || "PENDING",
        };

        newJobs.set(job.jobId, jobStatus);
        connectToJob(job.jobId);
      }

      setJobs(newJobs);
    },
    [imageId, connectToJob],
  );

  // Cancel all pending/processing jobs
  const cancelAll = useCallback(() => {
    // Close all SSE connections
    eventSourcesRef.current.forEach((eventSource) => {
      eventSource.close();
    });
    eventSourcesRef.current.clear();

    // Clear all reconnect timeouts
    reconnectTimeoutsRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    reconnectTimeoutsRef.current.clear();
    reconnectAttemptsRef.current.clear();

    // Mark all non-terminal jobs as cancelled
    setJobs((prev) => {
      const newJobs = new Map(prev);
      newJobs.forEach((job, jobId) => {
        if (job.status === "PENDING" || job.status === "PROCESSING") {
          newJobs.set(jobId, {
            ...job,
            status: "CANCELLED",
          });
        }
      });
      return newJobs;
    });
  }, []);

  // Check if all jobs are complete and call onAllComplete
  useEffect(() => {
    if (jobs.size === 0 || hasCalledOnAllCompleteRef.current) {
      return;
    }

    const allComplete = jobsArray.every((job) =>
      ["COMPLETED", "FAILED", "REFUNDED", "CANCELLED"].includes(job.status)
    );

    if (allComplete) {
      hasCalledOnAllCompleteRef.current = true;
      onAllComplete?.(jobsArray);

      // Close all SSE connections
      eventSourcesRef.current.forEach((eventSource) => {
        eventSource.close();
      });
      eventSourcesRef.current.clear();

      // Clear all pending reconnect timeouts
      reconnectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      reconnectTimeoutsRef.current.clear();

      // Clear reconnect attempts
      reconnectAttemptsRef.current.clear();
    }
  }, [jobs, jobsArray, onAllComplete]);

  // Cleanup on unmount
  useEffect(() => {
    const eventSources = eventSourcesRef.current;
    const reconnectTimeouts = reconnectTimeoutsRef.current;

    return () => {
      isMountedRef.current = false;

      eventSources.forEach((eventSource) => {
        eventSource.close();
      });
      eventSources.clear();

      reconnectTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
      reconnectTimeouts.clear();
    };
  }, []);

  return {
    startEnhancement,
    jobs: jobsArray,
    isProcessing,
    completedCount,
    failedCount,
    cancelAll,
  };
}
