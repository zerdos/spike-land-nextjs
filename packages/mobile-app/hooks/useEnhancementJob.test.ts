/**
 * useEnhancementJob Hook Tests
 */

import type { ImageEnhancementJob } from "@spike-npm-land/shared";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { getJobStatus } from "../services/api/jobs";
import { useEnhancementJob } from "./useEnhancementJob";

// Mock the jobs service
jest.mock("../services/api/jobs", () => ({
  getJobStatus: jest.fn(),
  getStageDescription: jest.fn((stage) => {
    const descriptions: Record<string, string> = {
      ANALYZING: "Analyzing image...",
      CROPPING: "Auto-cropping...",
      PROMPTING: "Generating enhancement prompt...",
      GENERATING: "Enhancing image...",
    };
    return descriptions[stage as string] || "Processing...";
  }),
  getStageProgress: jest.fn((stage) => {
    const progress: Record<string, number> = {
      ANALYZING: 20,
      CROPPING: 40,
      PROMPTING: 60,
      GENERATING: 80,
    };
    return progress[stage as string] || 10;
  }),
}));

const mockedGetJobStatus = getJobStatus as jest.MockedFunction<typeof getJobStatus>;

// ============================================================================
// Test Data
// ============================================================================

const createMockJob = (overrides: Partial<ImageEnhancementJob> = {}): ImageEnhancementJob => ({
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
// Tests
// ============================================================================

describe("useEnhancementJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initial state", () => {
    it("should return initial state when no jobId is provided", () => {
      const { result } = renderHook(() => useEnhancementJob(null));

      expect(result.current.job).toBeNull();
      expect(result.current.status).toBeNull();
      expect(result.current.stage).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.statusMessage).toBe("");
      expect(result.current.isPolling).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.resultUrl).toBeNull();
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isFailed).toBe(false);
    });
  });

  describe("auto polling", () => {
    it("should start polling automatically when jobId is provided", async () => {
      const mockJob = createMockJob({ status: "PROCESSING", currentStage: "ANALYZING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPolling).toBe(true);

      await waitFor(() => {
        expect(result.current.job).toEqual(mockJob);
      });

      expect(result.current.status).toBe("PROCESSING");
      expect(result.current.stage).toBe("ANALYZING");
      expect(result.current.progress).toBe(20);
      expect(result.current.isLoading).toBe(false);
    });

    it("should not start polling when autoStart is false", () => {
      const { result } = renderHook(() => useEnhancementJob("job-123", { autoStart: false }));

      expect(result.current.isPolling).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(mockedGetJobStatus).not.toHaveBeenCalled();
    });

    it("should poll at specified interval", async () => {
      const mockJob = createMockJob({ status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { pollInterval: 1000 }));

      await waitFor(() => {
        expect(result.current.job).toBeTruthy();
      });

      expect(mockedGetJobStatus).toHaveBeenCalledTimes(1);

      // Advance timer
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockedGetJobStatus).toHaveBeenCalledTimes(2);

      // Advance timer again
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockedGetJobStatus).toHaveBeenCalledTimes(3);
    });
  });

  describe("job completion", () => {
    it("should stop polling and call onComplete when job completes", async () => {
      const onComplete = jest.fn();
      const completedJob = createMockJob({
        status: "COMPLETED",
        enhancedUrl: "https://example.com/enhanced.jpg",
      });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: completedJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { onComplete }));

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(result.current.status).toBe("COMPLETED");
      expect(result.current.progress).toBe(100);
      expect(result.current.statusMessage).toBe("Enhancement complete!");
      expect(result.current.resultUrl).toBe("https://example.com/enhanced.jpg");
      expect(result.current.isPolling).toBe(false);
      expect(onComplete).toHaveBeenCalledWith(completedJob);
    });
  });

  describe("job failure", () => {
    it("should stop polling and call onError when job fails", async () => {
      const onError = jest.fn();
      const failedJob = createMockJob({
        status: "FAILED",
        errorMessage: "Enhancement failed",
      });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: failedJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { onError }));

      await waitFor(() => {
        expect(result.current.isFailed).toBe(true);
      });

      expect(result.current.status).toBe("FAILED");
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBe("Enhancement failed");
      expect(result.current.isPolling).toBe(false);
      expect(onError).toHaveBeenCalledWith("Enhancement failed");
    });

    it("should handle cancelled jobs", async () => {
      const onError = jest.fn();
      const cancelledJob = createMockJob({ status: "CANCELLED" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: cancelledJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { onError }));

      await waitFor(() => {
        expect(result.current.isFailed).toBe(true);
      });

      expect(result.current.status).toBe("CANCELLED");
      expect(result.current.error).toBe("Job cancelled");
      expect(onError).toHaveBeenCalledWith("Job cancelled");
    });

    it("should handle API errors", async () => {
      const onError = jest.fn();

      mockedGetJobStatus.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 0,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { onError }));

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.isPolling).toBe(false);
      expect(onError).toHaveBeenCalledWith("Network error");
    });

    it("should handle missing job in response", async () => {
      const onError = jest.fn();

      mockedGetJobStatus.mockResolvedValue({
        data: { job: null as unknown as ImageEnhancementJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { onError }));

      await waitFor(() => {
        expect(result.current.error).toBe("Job not found");
      });

      expect(onError).toHaveBeenCalledWith("Job not found");
    });
  });

  describe("progress updates", () => {
    it("should call onProgress callback during polling", async () => {
      const onProgress = jest.fn();
      const processingJob = createMockJob({
        status: "PROCESSING",
        currentStage: "GENERATING",
      });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: processingJob },
        error: null,
        status: 200,
      });

      renderHook(() => useEnhancementJob("job-123", { onProgress }));

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(processingJob);
      });
    });

    it("should update progress based on stage", async () => {
      const stages = [
        { stage: "ANALYZING", expectedProgress: 20 },
        { stage: "CROPPING", expectedProgress: 40 },
        { stage: "PROMPTING", expectedProgress: 60 },
        { stage: "GENERATING", expectedProgress: 80 },
      ] as const;

      for (const { stage, expectedProgress } of stages) {
        jest.clearAllMocks();

        const mockJob = createMockJob({
          status: "PROCESSING",
          currentStage: stage,
        });

        mockedGetJobStatus.mockResolvedValue({
          data: { job: mockJob },
          error: null,
          status: 200,
        });

        const { result } = renderHook(() => useEnhancementJob("job-123"));

        await waitFor(() => {
          expect(result.current.progress).toBe(expectedProgress);
        });
      }
    });
  });

  describe("manual controls", () => {
    it("should start polling manually with startPolling", async () => {
      const mockJob = createMockJob({ status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob(null, { autoStart: false }));

      expect(result.current.isPolling).toBe(false);

      await act(async () => {
        result.current.startPolling("job-456");
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      expect(mockedGetJobStatus).toHaveBeenCalledWith("job-456");
    });

    it("should stop polling with stopPolling", async () => {
      const mockJob = createMockJob({ status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123", { pollInterval: 1000 }));

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      await act(async () => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      const callCount = mockedGetJobStatus.mock.calls.length;

      // Advance timer - should not poll anymore
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockedGetJobStatus).toHaveBeenCalledTimes(callCount);
    });

    it("should retry fetching with retry", async () => {
      const failedJob = createMockJob({ status: "FAILED", errorMessage: "Error" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: failedJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123"));

      await waitFor(() => {
        expect(result.current.isFailed).toBe(true);
      });

      // Update mock for retry
      const processingJob = createMockJob({ status: "PROCESSING" });
      mockedGetJobStatus.mockResolvedValue({
        data: { job: processingJob },
        error: null,
        status: 200,
      });

      await act(async () => {
        await result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("PROCESSING");
      });

      expect(result.current.error).toBeNull();
    });

    it("should reset state with reset", async () => {
      const mockJob = createMockJob({ status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementJob("job-123"));

      await waitFor(() => {
        expect(result.current.job).toBeTruthy();
      });

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.job).toBeNull();
      expect(result.current.status).toBeNull();
      expect(result.current.isPolling).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  describe("jobId changes", () => {
    it("should reset and start polling new job when jobId changes", async () => {
      const job1 = createMockJob({ id: "job-1", status: "PROCESSING" });
      const job2 = createMockJob({ id: "job-2", status: "COMPLETED", enhancedUrl: "url" });

      mockedGetJobStatus
        .mockResolvedValueOnce({ data: { job: job1 }, error: null, status: 200 })
        .mockResolvedValueOnce({ data: { job: job2 }, error: null, status: 200 });

      const { result, rerender } = renderHook(
        ({ jobId }) => useEnhancementJob(jobId),
        { initialProps: { jobId: "job-1" } },
      );

      await waitFor(() => {
        expect(result.current.job?.id).toBe("job-1");
      });

      rerender({ jobId: "job-2" });

      await waitFor(() => {
        expect(result.current.job?.id).toBe("job-2");
      });

      expect(result.current.isComplete).toBe(true);
    });

    it("should reset when jobId becomes null", async () => {
      const mockJob = createMockJob({ status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result, rerender } = renderHook(
        ({ jobId }) => useEnhancementJob(jobId),
        { initialProps: { jobId: "job-123" as string | null } },
      );

      await waitFor(() => {
        expect(result.current.job).toBeTruthy();
      });

      rerender({ jobId: null });

      await waitFor(() => {
        expect(result.current.job).toBeNull();
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should stop polling on unmount", async () => {
      const mockJob = createMockJob({ status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result, unmount } = renderHook(() =>
        useEnhancementJob("job-123", { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      const callCount = mockedGetJobStatus.mock.calls.length;

      unmount();

      // Advance timer - should not poll after unmount
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockedGetJobStatus).toHaveBeenCalledTimes(callCount);
    });
  });

  describe("retry without current job", () => {
    it("should not do anything when retry is called without a current job", async () => {
      const { result } = renderHook(() => useEnhancementJob(null));

      await act(async () => {
        await result.current.retry();
      });

      expect(mockedGetJobStatus).not.toHaveBeenCalled();
    });
  });
});
