import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlbumBatchEnhance } from "./useAlbumBatchEnhance";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("useAlbumBatchEnhance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset(); // Reset mock implementation and queued responses
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId: "album-1",
      })
    );

    expect(result.current.jobs).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.totalCost).toBe(0);
  });

  it("should start batch enhancement successfully", async () => {
    const albumId = "album-1";

    // Mock enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [
          { imageId: "img-1", jobId: "job-1", success: true },
          { imageId: "img-2", jobId: "job-2", success: true },
        ],
        summary: {
          total: 2,
          totalCost: 10,
          newBalance: 90,
        },
      }),
    });

    // Mock in-progress status first
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [
          { id: "job-1", status: "PROCESSING", errorMessage: null },
          { id: "job-2", status: "PROCESSING", errorMessage: null },
        ],
      }),
    });

    // Mock completed status
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [
          { id: "job-1", status: "COMPLETED", errorMessage: null },
          { id: "job-2", status: "COMPLETED", errorMessage: null },
        ],
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K", true);
    });

    expect(result.current.isProcessing).toBe(true);
    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.totalCost).toBe(10);

    // First poll - still processing
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isProcessing).toBe(true);

    // Second poll - completed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.completedCount).toBe(2);
    expect(result.current.progress).toBe(100);
    expect(result.current.isProcessing).toBe(false);
  });

  it("should handle partial failures", async () => {
    const albumId = "album-1";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [
          { imageId: "img-1", jobId: "job-1", success: true },
          {
            imageId: "img-2",
            jobId: "job-2",
            success: false,
            error: "Insufficient tokens",
          },
        ],
        summary: {
          total: 2,
          totalCost: 10,
          newBalance: 90,
        },
      }),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.completedCount).toBe(1);
    expect(result.current.failedCount).toBe(1);
    expect(result.current.progress).toBe(100);

    const jobs = result.current.jobs;
    expect(jobs[0].status).toBe("COMPLETED");
    expect(jobs[1].status).toBe("FAILED");
    expect(jobs[1].error).toBe("Insufficient tokens");
  });

  it("should handle API errors", async () => {
    const albumId = "album-1";
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "Insufficient tokens",
      }),
    });

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onError,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_4K");
    });

    expect(result.current.isProcessing).toBe(false);
    expect(onError).toHaveBeenCalledWith("Insufficient tokens");
  });

  it("should calculate progress correctly", async () => {
    const albumId = "album-1";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [
          { imageId: "img-1", jobId: "job-1", success: true },
          { imageId: "img-2", jobId: "job-2", success: true },
          { imageId: "img-3", jobId: "job-3", success: true },
          { imageId: "img-4", jobId: "job-4", success: true },
        ],
        summary: {
          total: 4,
          totalCost: 20,
          newBalance: 80,
        },
      }),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          { id: "job-1", status: "COMPLETED", errorMessage: null },
          { id: "job-2", status: "PROCESSING", errorMessage: null },
          { id: "job-3", status: "FAILED", errorMessage: "Error" },
          { id: "job-4", status: "PENDING", errorMessage: null },
        ],
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
      await vi.advanceTimersByTimeAsync(2000);
    });

    // 1 completed + 1 failed out of 4 = 50%
    expect(result.current.progress).toBe(50);
    expect(result.current.completedCount).toBe(1);
    expect(result.current.failedCount).toBe(1);
  });

  it("should cancel batch enhancement", async () => {
    const albumId = "album-1";
    const onComplete = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: {
          total: 1,
          totalCost: 5,
          newBalance: 95,
        },
      }),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onComplete,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    expect(result.current.isProcessing).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isProcessing).toBe(false);

    // Advance time to ensure no callbacks fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should pass skipAlreadyEnhanced parameter", async () => {
    const albumId = "album-1";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [],
        summary: {
          total: 0,
          totalCost: 0,
          newBalance: 100,
        },
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K", false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/albums/${albumId}/enhance`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tier: "TIER_2K",
          skipAlreadyEnhanced: false,
        }),
      }),
    );
  });

  it("should cleanup timers on unmount", async () => {
    const albumId = "album-1";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: {
          total: 1,
          totalCost: 5,
          newBalance: 95,
        },
      }),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    const { result, unmount } = renderHook(() => useAlbumBatchEnhance({ albumId }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("should handle empty job list", async () => {
    const albumId = "album-1";
    const onComplete = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [],
        summary: {
          total: 0,
          totalCost: 0,
          newBalance: 100,
        },
      }),
    });

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onComplete,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    expect(result.current.jobs).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(onComplete).toHaveBeenCalledWith([]);
  });

  it("should call onComplete callback when all jobs finish", async () => {
    const albumId = "album-1";
    const onComplete = vi.fn();

    // Mock initial enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: {
          total: 1,
          totalCost: 5,
          newBalance: 95,
        },
      }),
    });

    // Mock batch status - completed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onComplete,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // Advance time to trigger polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.completedCount).toBe(1);
    expect(onComplete).toHaveBeenCalled();
    expect(onComplete.mock.calls[0][0]).toHaveLength(1);
    expect(onComplete.mock.calls[0][0][0]).toMatchObject({
      imageId: "img-1",
      jobId: "job-1",
      status: "COMPLETED",
    });
  });

  it("should respect tier parameter", async () => {
    const albumId = "album-1";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [],
        summary: {
          total: 0,
          totalCost: 0,
          newBalance: 100,
        },
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_4K");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/albums/${albumId}/enhance`,
      expect.objectContaining({
        body: JSON.stringify({
          tier: "TIER_4K",
          skipAlreadyEnhanced: true,
        }),
      }),
    );
  });

  it("should handle rapid startBatchEnhance calls without race conditions", async () => {
    const albumId = "album-1";
    const onComplete = vi.fn();

    // First enhance call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-1",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 95 },
      }),
    });

    // First poll for job-1 (will be in progress)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    // Second enhance call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-2",
        jobs: [{ imageId: "img-2", jobId: "job-2", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 90 },
      }),
    });

    // Status poll for second batch - completed
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-2", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId, onComplete }));

    // Start first batch and await it fully
    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // Verify first batch job is set
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].jobId).toBe("job-1");

    // Let the first poll happen
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // First batch is still processing
    expect(result.current.isProcessing).toBe(true);

    // Start second batch - this should reset state and clear previous polling
    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // Only the second batch's job should be present (first was cleared)
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].jobId).toBe("job-2");

    // Complete polling for second batch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.completedCount).toBe(1);
  });

  it("should properly clear all state when cancel is called", async () => {
    const albumId = "album-1";
    const onComplete = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [
          { imageId: "img-1", jobId: "job-1", success: true },
          { imageId: "img-2", jobId: "job-2", success: true },
        ],
        summary: { total: 2, totalCost: 10, newBalance: 90 },
      }),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          { id: "job-1", status: "PROCESSING", errorMessage: null },
          { id: "job-2", status: "PROCESSING", errorMessage: null },
        ],
      }),
    });

    const { result } = renderHook(() => useAlbumBatchEnhance({ albumId, onComplete }));

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.isProcessing).toBe(true);

    // Cancel the batch
    act(() => {
      result.current.cancel();
    });

    // Verify all state is cleared
    expect(result.current.jobs).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.failedCount).toBe(0);

    // Advance time to ensure no callbacks fire after cancel
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should handle batch status API error during polling", async () => {
    const albumId = "album-1";
    const onError = vi.fn();

    // Mock successful enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 95 },
      }),
    });

    // First poll - succeeds (happens immediately after startBatchEnhance)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    // Second poll - batch-status API failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Internal Server Error" }),
    });

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onError,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    expect(result.current.isProcessing).toBe(true);

    // Advance time to trigger the second poll which will fail
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.isProcessing).toBe(false);
    expect(onError).toHaveBeenCalledWith("Failed to fetch batch status");
  });

  it("should handle network error during polling", async () => {
    const albumId = "album-1";
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock successful enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 95 },
      }),
    });

    // First poll succeeds (called immediately after startBatchEnhance)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    // Second poll - network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onError,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // After startBatchEnhance, first poll has completed, so still processing
    expect(result.current.isProcessing).toBe(true);

    // Advance time to trigger second poll which will throw
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.isProcessing).toBe(false);
    expect(onError).toHaveBeenCalledWith("Network error");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle non-Error instance thrown during polling", async () => {
    const albumId = "album-1";
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock successful enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 95 },
      }),
    });

    // First poll succeeds (called immediately after startBatchEnhance)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    // Second poll - throw a non-Error value
    mockFetch.mockRejectedValueOnce("String error");

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onError,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // After startBatchEnhance, first poll has completed, so still processing
    expect(result.current.isProcessing).toBe(true);

    // Advance time to trigger second poll which will throw non-Error
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.isProcessing).toBe(false);
    expect(onError).toHaveBeenCalledWith("Failed to poll job statuses");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should not call onError during polling when cancelled", async () => {
    const albumId = "album-1";
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock successful enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 95 },
      }),
    });

    // First poll succeeds (called immediately after startBatchEnhance)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    // Second poll would throw error, but should not be called since cancelled
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onError,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // Cancel after first poll but before the second
    act(() => {
      result.current.cancel();
    });

    // Advance time - second poll should not fire onError since cancelled
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // onError should not be called since we cancelled
    expect(onError).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should stop polling when max attempts reached", async () => {
    const albumId = "album-1";
    const onComplete = vi.fn();

    // Mock successful enhance API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        batchId: "batch-123",
        jobs: [{ imageId: "img-1", jobId: "job-1", success: true }],
        summary: { total: 1, totalCost: 5, newBalance: 95 },
      }),
    });

    // Mock 100+ polling responses all showing PROCESSING
    // Use mockResolvedValueOnce to avoid polluting other tests
    for (let i = 0; i < 100; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
        }),
      });
    }

    const { result } = renderHook(() =>
      useAlbumBatchEnhance({
        albumId,
        onComplete,
      })
    );

    await act(async () => {
      await result.current.startBatchEnhance("TIER_2K");
    });

    // First poll already happened during startBatchEnhance, but job is still PROCESSING
    expect(result.current.isProcessing).toBe(true);

    // Simulate many poll cycles - enough to hit max attempts (MAX_POLL_ATTEMPTS = 60)
    // First poll already consumed, so we need 59 more to reach MAX_POLL_ATTEMPTS
    // With exponential backoff, intervals grow: 2000, 3000, 4500, 6750, 10000, 10000...
    // After ~5 polls, interval caps at 10000ms
    // Total time needed: ~5 polls at shorter intervals + 55 polls at 10000ms
    // Using 15000ms per iteration ensures we trigger at least one poll per iteration
    for (let i = 0; i < 65; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });
    }

    // After max attempts, processing should stop and onComplete should be called
    expect(result.current.isProcessing).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });
});
