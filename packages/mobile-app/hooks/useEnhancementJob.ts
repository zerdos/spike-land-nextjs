/**
 * useEnhancementJob Hook
 * Polls job status with real-time updates and automatic cleanup
 */

import type { ImageEnhancementJob, JobStatus, PipelineStage } from "@spike-npm-land/shared";
import { API_CONFIG } from "@spike-npm-land/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getJobStatus, getStageDescription, getStageProgress } from "../services/api/jobs";

// ============================================================================
// Types
// ============================================================================

export interface UseEnhancementJobOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Whether to start polling automatically (default: true) */
  autoStart?: boolean;
  /** Callback when job completes successfully */
  onComplete?: (job: ImageEnhancementJob) => void;
  /** Callback when job fails */
  onError?: (error: string) => void;
  /** Callback on each progress update */
  onProgress?: (job: ImageEnhancementJob) => void;
}

export interface UseEnhancementJobReturn {
  /** Current job data */
  job: ImageEnhancementJob | null;
  /** Current job status */
  status: JobStatus | null;
  /** Current pipeline stage */
  stage: PipelineStage | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  statusMessage: string;
  /** Whether the hook is currently polling */
  isPolling: boolean;
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error message if job failed */
  error: string | null;
  /** Enhanced image URL when completed */
  resultUrl: string | null;
  /** Whether the job has completed successfully */
  isComplete: boolean;
  /** Whether the job has failed */
  isFailed: boolean;
  /** Start polling for a job */
  startPolling: (jobId: string) => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Retry fetching job status */
  retry: () => Promise<void>;
  /** Reset the hook state */
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

interface JobState {
  job: ImageEnhancementJob | null;
  status: JobStatus | null;
  stage: PipelineStage | null;
  progress: number;
  statusMessage: string;
  isPolling: boolean;
  isLoading: boolean;
  error: string | null;
  resultUrl: string | null;
}

const initialState: JobState = {
  job: null,
  status: null,
  stage: null,
  progress: 0,
  statusMessage: "",
  isPolling: false,
  isLoading: false,
  error: null,
  resultUrl: null,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEnhancementJob(
  jobId: string | null,
  options: UseEnhancementJobOptions = {},
): UseEnhancementJobReturn {
  const {
    pollInterval = API_CONFIG.JOB_POLL_INTERVAL_MS,
    autoStart = true,
    onComplete,
    onError,
    onProgress,
  } = options;

  const [state, setState] = useState<JobState>(initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<JobState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Fetch job status
   */
  const fetchJobStatus = useCallback(
    async (id: string): Promise<ImageEnhancementJob | null> => {
      const response = await getJobStatus(id);

      if (response.error) {
        updateState({
          error: response.error,
          isLoading: false,
          isPolling: false,
        });
        onError?.(response.error);
        return null;
      }

      const job = response.data?.job;
      if (!job) {
        const errorMsg = "Job not found";
        updateState({
          error: errorMsg,
          isLoading: false,
          isPolling: false,
        });
        onError?.(errorMsg);
        return null;
      }

      return job;
    },
    [updateState, onError],
  );

  /**
   * Process job update
   */
  const processJobUpdate = useCallback(
    (job: ImageEnhancementJob) => {
      const progress = getStageProgress(job.currentStage);
      const statusMessage = getStageDescription(job.currentStage);

      // Handle completed job
      if (job.status === "COMPLETED") {
        updateState({
          job,
          status: job.status,
          stage: job.currentStage,
          progress: 100,
          statusMessage: "Enhancement complete!",
          isPolling: false,
          isLoading: false,
          resultUrl: job.enhancedUrl,
          error: null,
        });
        onComplete?.(job);
        return true; // Signal to stop polling
      }

      // Handle failed or cancelled job
      if (job.status === "FAILED" || job.status === "CANCELLED") {
        const errorMsg = job.errorMessage || `Job ${job.status.toLowerCase()}`;
        updateState({
          job,
          status: job.status,
          stage: job.currentStage,
          progress: 0,
          statusMessage: "",
          isPolling: false,
          isLoading: false,
          error: errorMsg,
          resultUrl: null,
        });
        onError?.(errorMsg);
        return true; // Signal to stop polling
      }

      // Update progress for pending/processing jobs
      updateState({
        job,
        status: job.status,
        stage: job.currentStage,
        progress,
        statusMessage,
        isLoading: false,
        error: null,
      });
      onProgress?.(job);

      return false; // Continue polling
    },
    [updateState, onComplete, onError, onProgress],
  );

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    updateState({ isPolling: false });
  }, [updateState]);

  /**
   * Start polling for a job
   */
  const startPolling = useCallback(
    (id: string) => {
      // Stop any existing polling
      stopPolling();

      currentJobIdRef.current = id;
      updateState({
        ...initialState,
        isPolling: true,
        isLoading: true,
      });

      // Initial fetch
      const poll = async () => {
        if (currentJobIdRef.current !== id) return;

        const job = await fetchJobStatus(id);
        if (!job) {
          stopPolling();
          return;
        }

        const shouldStop = processJobUpdate(job);
        if (shouldStop) {
          stopPolling();
        }
      };

      // Start polling
      poll();
      intervalRef.current = setInterval(poll, pollInterval);
      updateState({ isPolling: true });
    },
    [stopPolling, updateState, fetchJobStatus, processJobUpdate, pollInterval],
  );

  /**
   * Retry fetching job status
   */
  const retry = useCallback(async () => {
    if (!currentJobIdRef.current) return;

    updateState({ isLoading: true, error: null });

    const job = await fetchJobStatus(currentJobIdRef.current);
    if (!job) return;

    const shouldStop = processJobUpdate(job);
    if (!shouldStop && !intervalRef.current) {
      // Restart polling if job is still in progress
      startPolling(currentJobIdRef.current);
    }
  }, [updateState, fetchJobStatus, processJobUpdate, startPolling]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    stopPolling();
    currentJobIdRef.current = null;
    setState(initialState);
  }, [stopPolling]);

  // Auto-start polling when jobId changes
  useEffect(() => {
    if (jobId && autoStart) {
      startPolling(jobId);
    } else if (!jobId) {
      reset();
    }

    return () => {
      stopPolling();
    };
  }, [jobId, autoStart, startPolling, reset, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    job: state.job,
    status: state.status,
    stage: state.stage,
    progress: state.progress,
    statusMessage: state.statusMessage,
    isPolling: state.isPolling,
    isLoading: state.isLoading,
    error: state.error,
    resultUrl: state.resultUrl,
    isComplete: state.status === "COMPLETED",
    isFailed: state.status === "FAILED" || state.status === "CANCELLED",
    startPolling,
    stopPolling,
    retry,
    reset,
  };
}
