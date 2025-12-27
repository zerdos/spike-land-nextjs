/**
 * Jobs API Service
 * Handles job status polling and management
 */

import type { ImageEnhancementJob, JobStatus, PipelineStage } from "@spike-land/shared";
import { API_CONFIG } from "@spike-land/shared";
import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

export interface JobStatusResponse {
  job: ImageEnhancementJob;
}

export interface BatchJobStatusResponse {
  jobs: ImageEnhancementJob[];
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Get job status
 */
export async function getJobStatus(
  jobId: string,
): Promise<ApiResponse<JobStatusResponse>> {
  return apiClient.get<JobStatusResponse>(`/api/jobs/${jobId}`);
}

/**
 * Get batch job statuses
 */
export async function getBatchJobStatus(
  jobIds: string[],
): Promise<ApiResponse<BatchJobStatusResponse>> {
  return apiClient.post<BatchJobStatusResponse>("/api/jobs/batch-status", {
    jobIds,
  });
}

/**
 * Cancel a job
 */
export async function cancelJob(
  jobId: string,
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.post<{ success: boolean; }>(`/api/jobs/${jobId}/cancel`);
}

// ============================================================================
// Polling Helper
// ============================================================================

export interface PollJobOptions {
  jobId: string;
  onProgress?: (job: ImageEnhancementJob) => void;
  onComplete?: (job: ImageEnhancementJob) => void;
  onError?: (error: string) => void;
  interval?: number;
  timeout?: number;
}

/**
 * Poll a job until completion
 */
export async function pollJobUntilComplete(
  options: PollJobOptions,
): Promise<ImageEnhancementJob> {
  const {
    jobId,
    onProgress,
    onComplete,
    onError,
    interval = API_CONFIG.JOB_POLL_INTERVAL_MS,
    timeout = 5 * 60 * 1000, // 5 minutes
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (Date.now() - startTime > timeout) {
        const error = "Job polling timed out";
        onError?.(error);
        reject(new Error(error));
        return;
      }

      const response = await getJobStatus(jobId);

      if (response.error) {
        onError?.(response.error);
        reject(new Error(response.error));
        return;
      }

      const job = response.data?.job;
      if (!job) {
        const error = "Job not found";
        onError?.(error);
        reject(new Error(error));
        return;
      }

      onProgress?.(job);

      if (job.status === "COMPLETED") {
        onComplete?.(job);
        resolve(job);
        return;
      }

      if (job.status === "FAILED" || job.status === "CANCELLED") {
        const error = job.errorMessage || `Job ${job.status.toLowerCase()}`;
        onError?.(error);
        reject(new Error(error));
        return;
      }

      // Continue polling
      setTimeout(poll, interval);
    };

    poll();
  });
}

/**
 * Get human-readable stage description
 */
export function getStageDescription(stage: PipelineStage | null): string {
  switch (stage) {
    case "ANALYZING":
      return "Analyzing image...";
    case "CROPPING":
      return "Auto-cropping...";
    case "PROMPTING":
      return "Generating enhancement prompt...";
    case "GENERATING":
      return "Enhancing image...";
    default:
      return "Processing...";
  }
}

/**
 * Get stage progress percentage (approximate)
 */
export function getStageProgress(stage: PipelineStage | null): number {
  switch (stage) {
    case "ANALYZING":
      return 20;
    case "CROPPING":
      return 40;
    case "PROMPTING":
      return 60;
    case "GENERATING":
      return 80;
    default:
      return 10;
  }
}
