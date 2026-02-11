/**
 * Spike Land API Client
 *
 * HTTP client for communicating with the Spike Land MCP API.
 * Extends BaseApiClient for authentication and request handling.
 */

import { BaseApiClient } from "./base-client.js";

interface GenerateRequest {
  prompt: string;
  tier?: "TIER_1K" | "TIER_2K" | "TIER_4K";
  negativePrompt?: string;
  aspectRatio?: string;
}

interface ModifyRequest {
  prompt: string;
  image: string; // Base64 encoded
  mimeType: string;
  tier?: "TIER_1K" | "TIER_2K" | "TIER_4K";
}

interface JobResponse {
  success: boolean;
  jobId?: string;
  tokensCost?: number;
  error?: string;
}

interface Job {
  id: string;
  type: "GENERATE" | "MODIFY";
  tier: string;
  tokensCost: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
  prompt: string;
  inputImageUrl?: string | null;
  outputImageUrl?: string | null;
  outputWidth?: number | null;
  outputHeight?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  processingStartedAt?: string | null;
  processingCompletedAt?: string | null;
}

interface JobStatus {
  job: Job;
}

interface BalanceResponse {
  balance: number;
  lastRegeneration: string;
}

export class SpikeLandClient extends BaseApiClient {

  /**
   * Generate a new image from a text prompt
   */
  async generateImage(params: GenerateRequest): Promise<JobResponse> {
    return this.request<JobResponse>("/api/mcp/generate", "POST", {
      prompt: params.prompt,
      tier: params.tier || "TIER_1K",
      negativePrompt: params.negativePrompt,
      aspectRatio: params.aspectRatio,
    });
  }

  /**
   * Modify an existing image with a text prompt
   */
  async modifyImage(params: ModifyRequest): Promise<JobResponse> {
    return this.request<JobResponse>("/api/mcp/modify", "POST", {
      prompt: params.prompt,
      image: params.image,
      mimeType: params.mimeType,
      tier: params.tier || "TIER_1K",
    });
  }

  /**
   * Get the status of a job
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.request<Job>(`/api/mcp/jobs/${jobId}`);
    return { job };
  }

  /**
   * Get the current token balance
   */
  async getBalance(): Promise<BalanceResponse> {
    return this.request<BalanceResponse>("/api/mcp/balance");
  }

  /**
   * Poll for job completion
   */
  async waitForJob(jobId: string, options?: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (status: JobStatus) => void;
  }): Promise<JobStatus> {
    const maxAttempts = options?.maxAttempts || 60; // 2 minutes with 2s interval
    const intervalMs = options?.intervalMs || 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getJobStatus(jobId);

      if (options?.onProgress) {
        options.onProgress(status);
      }

      if (status.job.status === "COMPLETED") {
        return status;
      }

      if (status.job.status === "FAILED" || status.job.status === "REFUNDED") {
        throw new Error(status.job.errorMessage || "Job failed");
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Job timed out");
  }
}
