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
});
