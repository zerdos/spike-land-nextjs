/**
 * Jobs API Service Tests
 * Tests for job status polling and management
 */

import type { ImageEnhancementJob, PipelineStage } from "@spike-npm-land/shared";
import { apiClient } from "../api-client";
import type { BatchJobStatusResponse, JobStatusResponse, PollJobOptions } from "./jobs";
import {
  cancelJob,
  getBatchJobStatus,
  getJobStatus,
  getStageDescription,
  getStageProgress,
  pollJobUntilComplete,
} from "./jobs";

// Mock the apiClient
jest.mock("../api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock timers for polling tests
jest.useFakeTimers();

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// ============================================================================
// Test Data
// ============================================================================

const createMockJob = (
  overrides: Partial<ImageEnhancementJob> = {},
): ImageEnhancementJob => ({
  id: "job-123",
  imageId: "image-456",
  userId: "user-789",
  tier: "TIER_2K",
  tokensCost: 5,
  status: "PENDING",
  currentStage: null,
  enhancedUrl: null,
  enhancedWidth: null,
  enhancedHeight: null,
  enhancedSizeBytes: null,
  errorMessage: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  processingStartedAt: null,
  processingCompletedAt: null,
  isBlend: false,
  isAnonymous: false,
  ...overrides,
});

// ============================================================================
// getJobStatus Tests
// ============================================================================

describe("getJobStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch job status successfully", async () => {
    const mockJob = createMockJob();
    const mockResponse: JobStatusResponse = { job: mockJob };

    mockedApiClient.get.mockResolvedValue({
      data: mockResponse,
      error: null,
      status: 200,
    });

    const result = await getJobStatus("job-123");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/jobs/job-123");
    expect(result.data?.job).toEqual(mockJob);
    expect(result.error).toBeNull();
  });

  it("should handle API errors", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: null,
      error: "Job not found",
      status: 404,
    });

    const result = await getJobStatus("invalid-job");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Job not found");
    expect(result.status).toBe(404);
  });
});

// ============================================================================
// getBatchJobStatus Tests
// ============================================================================

describe("getBatchJobStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch batch job statuses successfully", async () => {
    const mockJobs = [
      createMockJob({ id: "job-1" }),
      createMockJob({ id: "job-2" }),
    ];
    const mockResponse: BatchJobStatusResponse = { jobs: mockJobs };

    mockedApiClient.post.mockResolvedValue({
      data: mockResponse,
      error: null,
      status: 200,
    });

    const result = await getBatchJobStatus(["job-1", "job-2"]);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/jobs/batch-status",
      {
        jobIds: ["job-1", "job-2"],
      },
    );
    expect(result.data?.jobs).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it("should handle empty job IDs array", async () => {
    const mockResponse: BatchJobStatusResponse = { jobs: [] };

    mockedApiClient.post.mockResolvedValue({
      data: mockResponse,
      error: null,
      status: 200,
    });

    const result = await getBatchJobStatus([]);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/jobs/batch-status",
      {
        jobIds: [],
      },
    );
    expect(result.data?.jobs).toHaveLength(0);
  });
});

// ============================================================================
// cancelJob Tests
// ============================================================================

describe("cancelJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should cancel a job successfully", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { success: true },
      error: null,
      status: 200,
    });

    const result = await cancelJob("job-123");

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/api/jobs/job-123/cancel",
    );
    expect(result.data?.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should handle cancel failure", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: null,
      error: "Cannot cancel completed job",
      status: 400,
    });

    const result = await cancelJob("completed-job");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Cannot cancel completed job");
  });
});

// ============================================================================
// pollJobUntilComplete Tests
// ============================================================================

describe("pollJobUntilComplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it("should poll until job is completed", async () => {
    const onProgress = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    const pendingJob = createMockJob({ status: "PENDING" });
    const processingJob = createMockJob({
      status: "PROCESSING",
      currentStage: "ANALYZING",
    });
    const completedJob = createMockJob({
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
    });

    mockedApiClient.get
      .mockResolvedValueOnce({
        data: { job: pendingJob },
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { job: processingJob },
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { job: completedJob },
        error: null,
        status: 200,
      });

    const options: PollJobOptions = {
      jobId: "job-123",
      onProgress,
      onComplete,
      onError,
      interval: 1000,
    };

    const pollPromise = pollJobUntilComplete(options);

    // Run all pending timers and promises to completion
    await jest.runAllTimersAsync();

    const result = await pollPromise;

    expect(onProgress).toHaveBeenCalledWith(pendingJob);
    expect(onProgress).toHaveBeenCalledWith(processingJob);
    expect(onProgress).toHaveBeenCalledWith(completedJob);
    expect(result).toEqual(completedJob);
    expect(onComplete).toHaveBeenCalledWith(completedJob);
    expect(onError).not.toHaveBeenCalled();
  });

  it("should call onError when job fails", async () => {
    const onProgress = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();

    const failedJob = createMockJob({
      status: "FAILED",
      errorMessage: "Enhancement failed",
    });

    mockedApiClient.get.mockResolvedValue({
      data: { job: failedJob },
      error: null,
      status: 200,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
      onProgress,
      onComplete,
      onError,
      interval: 1000,
    };

    await expect(pollJobUntilComplete(options)).rejects.toThrow(
      "Enhancement failed",
    );

    expect(onProgress).toHaveBeenCalledWith(failedJob);
    expect(onError).toHaveBeenCalledWith("Enhancement failed");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should handle cancelled jobs", async () => {
    const onError = jest.fn();

    const cancelledJob = createMockJob({ status: "CANCELLED" });

    mockedApiClient.get.mockResolvedValue({
      data: { job: cancelledJob },
      error: null,
      status: 200,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
      onError,
      interval: 1000,
    };

    await expect(pollJobUntilComplete(options)).rejects.toThrow(
      "Job cancelled",
    );

    expect(onError).toHaveBeenCalledWith("Job cancelled");
  });

  it("should handle API errors during polling", async () => {
    const onError = jest.fn();

    mockedApiClient.get.mockResolvedValue({
      data: null,
      error: "Network error",
      status: 0,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
      onError,
      interval: 1000,
    };

    await expect(pollJobUntilComplete(options)).rejects.toThrow(
      "Network error",
    );

    expect(onError).toHaveBeenCalledWith("Network error");
  });

  it("should handle missing job in response", async () => {
    const onError = jest.fn();

    mockedApiClient.get.mockResolvedValue({
      data: { job: null },
      error: null,
      status: 200,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
      onError,
      interval: 1000,
    };

    await expect(pollJobUntilComplete(options)).rejects.toThrow(
      "Job not found",
    );

    expect(onError).toHaveBeenCalledWith("Job not found");
  });

  it("should timeout after specified duration", async () => {
    // Re-enable fake timers with Date.now() mocking
    jest.useFakeTimers();

    const onError = jest.fn();

    const pendingJob = createMockJob({ status: "PENDING" });

    mockedApiClient.get.mockResolvedValue({
      data: { job: pendingJob },
      error: null,
      status: 200,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
      onError,
      interval: 1000,
      timeout: 3000,
    };

    // Run all timers to trigger timeout and wait for promise to reject
    let rejectedError: Error | undefined;
    const pollPromise = pollJobUntilComplete(options).catch((err) => {
      rejectedError = err;
    });

    // Advance past timeout - jest fake timers will advance Date.now() too
    await jest.runAllTimersAsync();

    await pollPromise;

    expect(rejectedError).toBeDefined();
    expect(rejectedError?.message).toBe("Job polling timed out");
    expect(onError).toHaveBeenCalledWith("Job polling timed out");
  });

  it("should use default interval and timeout", async () => {
    const completedJob = createMockJob({ status: "COMPLETED" });

    mockedApiClient.get.mockResolvedValue({
      data: { job: completedJob },
      error: null,
      status: 200,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
    };

    const result = await pollJobUntilComplete(options);

    expect(result).toEqual(completedJob);
    // Verify default interval was used (from API_CONFIG.JOB_POLL_INTERVAL_MS)
    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/jobs/job-123");
  });

  it("should work without callback functions", async () => {
    const completedJob = createMockJob({ status: "COMPLETED" });

    mockedApiClient.get.mockResolvedValue({
      data: { job: completedJob },
      error: null,
      status: 200,
    });

    const options: PollJobOptions = {
      jobId: "job-123",
      interval: 1000,
    };

    const result = await pollJobUntilComplete(options);

    expect(result).toEqual(completedJob);
  });
});

// ============================================================================
// getStageDescription Tests
// ============================================================================

describe("getStageDescription", () => {
  it("should return correct description for ANALYZING stage", () => {
    expect(getStageDescription("ANALYZING")).toBe("Analyzing image...");
  });

  it("should return correct description for CROPPING stage", () => {
    expect(getStageDescription("CROPPING")).toBe("Auto-cropping...");
  });

  it("should return correct description for PROMPTING stage", () => {
    expect(getStageDescription("PROMPTING")).toBe(
      "Generating enhancement prompt...",
    );
  });

  it("should return correct description for GENERATING stage", () => {
    expect(getStageDescription("GENERATING")).toBe("Enhancing image...");
  });

  it("should return default description for null stage", () => {
    expect(getStageDescription(null)).toBe("Processing...");
  });

  it("should return default description for unknown stage", () => {
    expect(getStageDescription("UNKNOWN" as PipelineStage)).toBe(
      "Processing...",
    );
  });
});

// ============================================================================
// getStageProgress Tests
// ============================================================================

describe("getStageProgress", () => {
  it("should return 20% for ANALYZING stage", () => {
    expect(getStageProgress("ANALYZING")).toBe(20);
  });

  it("should return 40% for CROPPING stage", () => {
    expect(getStageProgress("CROPPING")).toBe(40);
  });

  it("should return 60% for PROMPTING stage", () => {
    expect(getStageProgress("PROMPTING")).toBe(60);
  });

  it("should return 80% for GENERATING stage", () => {
    expect(getStageProgress("GENERATING")).toBe(80);
  });

  it("should return 10% for null stage", () => {
    expect(getStageProgress(null)).toBe(10);
  });

  it("should return 10% for unknown stage", () => {
    expect(getStageProgress("UNKNOWN" as PipelineStage)).toBe(10);
  });
});
