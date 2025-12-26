/**
 * Unified Job Types for Admin Dashboard
 *
 * Normalizes both EnhancementJob and McpGenerationJob into a unified interface
 * for the admin jobs management page.
 */

import { EnhancementTier, JobStatus } from "@prisma/client";

/**
 * Job source type - which table the job comes from
 */
export type JobSource = "enhancement" | "mcp";

/**
 * Unified job interface for admin dashboard
 * Normalizes fields from both EnhancementJob and McpGenerationJob
 */
export interface UnifiedJob {
  id: string;
  source: JobSource;
  status: JobStatus;
  tier: EnhancementTier;
  tokensCost: number;

  // Content
  prompt: string | null;
  inputUrl: string | null;
  outputUrl: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
  outputSizeBytes: number | null;
  errorMessage: string | null;

  // User info
  userId: string;
  userEmail: string;
  userName: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;

  // Source-specific fields (optional)
  // EnhancementJob specific
  imageId?: string;
  imageName?: string;
  retryCount?: number;
  maxRetries?: number;
  geminiModel?: string | null;
  geminiTemp?: number | null;
  workflowRunId?: string | null;

  // McpGenerationJob specific
  mcpJobType?: "GENERATE" | "MODIFY";
  apiKeyId?: string | null;
  apiKeyName?: string | null;
  inputR2Key?: string | null;
  outputR2Key?: string | null;
}

/**
 * API response for unified jobs list
 */
export interface UnifiedJobsResponse {
  jobs: UnifiedJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
  typeCounts: {
    all: number;
    enhancement: number;
    mcp: number;
  };
}

/**
 * Job action result
 */
export interface JobActionResult {
  success: boolean;
  error?: string;
  newJobId?: string;
  tokensRefunded?: number;
}

/**
 * Query params for jobs list API
 */
export interface JobsQueryParams {
  status?: JobStatus | null;
  type?: JobSource | "all";
  page?: number;
  limit?: number;
  search?: string;
}
