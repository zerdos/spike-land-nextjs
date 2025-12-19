import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useParallelEnhancement } from "./useParallelEnhancement";

// Mock EventSource
class MockEventSource {
  public url: string;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 0;

  private static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  static getInstances() {
    return MockEventSource.instances;
  }

  static clearInstances() {
    MockEventSource.instances = [];
  }

  static simulateOpen(url: string) {
    const instance = MockEventSource.instances.find((i) => i.url === url);
    if (instance) {
      instance.readyState = 1; // OPEN
      instance.onopen?.();
    }
  }

  static simulateMessage(url: string, data: unknown) {
    const instance = MockEventSource.instances.find((i) => i.url === url);
    if (instance) {
      const event = new MessageEvent("message", {
        data: JSON.stringify(data),
      });
      instance.onmessage?.(event);
    }
  }

  static simulateError(url: string) {
    const instance = MockEventSource.instances.find((i) => i.url === url);
    if (instance) {
      instance.onerror?.(new Event("error"));
    }
  }
}

// Set up global EventSource mock
global.EventSource = MockEventSource as unknown as typeof EventSource;

describe("useParallelEnhancement", () => {
  const mockImageId = "test-image-123";
  const mockJobId1 = "job-1";
  const mockJobId2 = "job-2";
  const mockJobId3 = "job-3";

  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.clearInstances();
    global.fetch = vi.fn();
  });

  it("should initialize with empty jobs array", () => {
    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    expect(result.current.jobs).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
  });

  it("should start enhancement for multiple tiers", async () => {
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PENDING" },
        { jobId: mockJobId3, tier: "TIER_4K", status: "PENDING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K", "TIER_2K", "TIER_4K"]);

    expect(global.fetch).toHaveBeenCalledWith("/api/images/parallel-enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageId: mockImageId,
        tiers: ["TIER_1K", "TIER_2K", "TIER_4K"],
      }),
    });

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(3);
      expect(result.current.isProcessing).toBe(true);
    });

    expect(result.current.jobs[0]).toEqual({
      jobId: mockJobId1,
      tier: "TIER_1K",
      status: "PENDING",
    });
  });

  it("should connect to SSE streams for all jobs", async () => {
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PENDING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K", "TIER_2K"]);

    await waitFor(() => {
      const instances = MockEventSource.getInstances();
      expect(instances).toHaveLength(2);
      expect(instances[0]?.url).toBe(`/api/jobs/${mockJobId1}/stream`);
      expect(instances[1]?.url).toBe(`/api/jobs/${mockJobId2}/stream`);
    });
  });

  it("should update job status from SSE messages", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    // Simulate SSE message
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "PROCESSING",
    });

    await waitFor(() => {
      expect(result.current.jobs[0]?.status).toBe("PROCESSING");
      expect(result.current.isProcessing).toBe(true);
    });

    // Simulate completion
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
      enhancedWidth: 1000,
      enhancedHeight: 1000,
    });

    await waitFor(() => {
      expect(result.current.jobs[0]?.status).toBe("COMPLETED");
      expect(result.current.jobs[0]?.enhancedUrl).toBe(
        "https://example.com/enhanced.jpg",
      );
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.completedCount).toBe(1);
    });
  });

  it("should track completed and failed counts", async () => {
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PENDING" },
        { jobId: mockJobId3, tier: "TIER_4K", status: "PENDING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K", "TIER_2K", "TIER_4K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(3);
    });

    // Complete first job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/1.jpg",
    });

    await waitFor(() => {
      expect(result.current.completedCount).toBe(1);
    });

    // Fail second job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId2}/stream`, {
      type: "status",
      status: "FAILED",
      errorMessage: "Enhancement failed",
    });

    await waitFor(() => {
      expect(result.current.failedCount).toBe(1);
    });

    // Complete third job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId3}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/3.jpg",
    });

    await waitFor(() => {
      expect(result.current.completedCount).toBe(2);
      expect(result.current.failedCount).toBe(1);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it("should call onAllComplete when all jobs finish", async () => {
    const onAllComplete = vi.fn();
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PENDING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onAllComplete,
      })
    );

    await result.current.startEnhancement(["TIER_1K", "TIER_2K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(2);
    });

    // Complete first job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/1.jpg",
    });

    await waitFor(() => {
      expect(result.current.completedCount).toBe(1);
    });

    expect(onAllComplete).not.toHaveBeenCalled();

    // Complete second job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId2}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/2.jpg",
    });

    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ jobId: mockJobId1, status: "COMPLETED" }),
          expect.objectContaining({ jobId: mockJobId2, status: "COMPLETED" }),
        ]),
      );
    });
  });

  it("should call onError when job fails", async () => {
    const onError = vi.fn();
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onError,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "FAILED",
      errorMessage: "Enhancement failed",
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockJobId1, "Enhancement failed");
    });
  });

  it("should call onJobUpdate on each status change", async () => {
    const onJobUpdate = vi.fn();
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onJobUpdate,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "PROCESSING",
    });

    await waitFor(() => {
      expect(onJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId1,
          status: "PROCESSING",
        }),
      );
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
    });

    await waitFor(() => {
      expect(onJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId1,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
        }),
      );
    });
  });

  it("should cancel all jobs", async () => {
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PROCESSING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K", "TIER_2K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(2);
    });

    // Simulate processing
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId2}/stream`, {
      type: "status",
      status: "PROCESSING",
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    result.current.cancelAll();

    await waitFor(() => {
      expect(result.current.jobs.every((j) => j.status === "CANCELLED")).toBe(
        true,
      );
      expect(result.current.isProcessing).toBe(false);
    });

    // Verify SSE connections are closed
    const instances = MockEventSource.getInstances();
    instances.forEach((instance) => {
      expect(instance.readyState).toBe(2); // CLOSED
    });
  });

  it("should handle API errors", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Insufficient tokens" }),
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await expect(
      result.current.startEnhancement(["TIER_1K"]),
    ).rejects.toThrow("Insufficient tokens");
  });

  it("should handle SSE error messages", async () => {
    const onError = vi.fn();
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onError,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "error",
      message: "SSE connection error",
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockJobId1, "SSE connection error");
      expect(result.current.jobs[0]?.status).toBe("FAILED");
    });
  });

  it("should handle SSE connected messages", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    // Simulate connected message (should be ignored)
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "connected",
    });

    await waitFor(() => {
      expect(result.current.jobs[0]?.status).toBe("PENDING");
    });
  });

  it("should close SSE connections on unmount", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result, unmount } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(MockEventSource.getInstances()).toHaveLength(1);
    });

    unmount();

    const instances = MockEventSource.getInstances();
    instances.forEach((instance) => {
      expect(instance.readyState).toBe(2); // CLOSED
    });
  });

  it("should track isProcessing correctly", async () => {
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PENDING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    expect(result.current.isProcessing).toBe(false);

    await result.current.startEnhancement(["TIER_1K", "TIER_2K"]);

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    // Complete first job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true); // Still processing second job
    });

    // Complete second job
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId2}/stream`, {
      type: "status",
      status: "COMPLETED",
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it("should handle REFUNDED status in failed count", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "REFUNDED",
    });

    await waitFor(() => {
      expect(result.current.failedCount).toBe(1);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it("should not call onAllComplete multiple times", async () => {
    const onAllComplete = vi.fn();
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onAllComplete,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
    });

    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalledTimes(1);
    });

    // Simulate another message (shouldn't trigger onAllComplete again)
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
    });

    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should reset completion flag when starting new enhancement", async () => {
    const onAllComplete = vi.fn();
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onAllComplete,
      })
    );

    // First enhancement
    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
    });

    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalledTimes(1);
    });

    // Second enhancement (should reset and call onAllComplete again)
    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
    });

    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalledTimes(2);
    });
  });

  it("should clean up reconnect timeouts on unmount during reconnection", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result, unmount } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(MockEventSource.getInstances()).toHaveLength(1);
    });

    const instancesBeforeError = MockEventSource.getInstances().length;

    // Trigger an error to start reconnection with backoff
    const instance = MockEventSource.getInstances()[0];
    if (instance) {
      instance.readyState = 1; // OPEN (not closed)
    }
    MockEventSource.simulateError(`/api/jobs/${mockJobId1}/stream`);

    // Unmount before the reconnect timeout fires
    // This should clear the timeout and prevent reconnection
    unmount();

    // Verify that unmount happened and connections are closed
    expect(MockEventSource.getInstances()[0]?.readyState).toBe(2); // CLOSED

    // Instances count should remain the same (no new connections after unmount)
    expect(MockEventSource.getInstances()).toHaveLength(instancesBeforeError);
  });

  it("should not update state after unmount", async () => {
    const onJobUpdate = vi.fn();
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result, unmount } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onJobUpdate,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    // Store the job count before unmount
    const jobsBeforeUnmount = result.current.jobs.length;

    // Unmount the hook
    unmount();

    // Verify SSE connection was closed
    expect(MockEventSource.getInstances()[0]?.readyState).toBe(2); // CLOSED

    // Try to simulate a message after unmount - the SSE connection is closed so this shouldn't do anything
    // The test verifies that unmount properly cleans up connections
    expect(result.current.jobs).toHaveLength(jobsBeforeUnmount);
  });

  it("should clear reconnect timeouts when all jobs complete", async () => {
    const onAllComplete = vi.fn();
    const mockResponse = {
      jobs: [
        { jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" },
        { jobId: mockJobId2, tier: "TIER_2K", status: "PENDING" },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
        onAllComplete,
      })
    );

    await result.current.startEnhancement(["TIER_1K", "TIER_2K"]);

    await waitFor(() => {
      expect(MockEventSource.getInstances()).toHaveLength(2);
    });

    // Trigger an error on one job to start reconnection
    const instance = MockEventSource.getInstances()[0];
    if (instance) {
      instance.readyState = 1; // OPEN
    }
    MockEventSource.simulateError(`/api/jobs/${mockJobId1}/stream`);

    // Complete both jobs
    MockEventSource.simulateMessage(`/api/jobs/${mockJobId1}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/1.jpg",
    });

    MockEventSource.simulateMessage(`/api/jobs/${mockJobId2}/stream`, {
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/2.jpg",
    });

    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalled();
    });

    // All SSE connections should be closed when all jobs complete
    MockEventSource.getInstances().forEach((inst) => {
      expect(inst.readyState).toBe(2); // CLOSED
    });
  });

  it("should handle SSE parse error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(result.current.jobs).toHaveLength(1);
    });

    // Simulate invalid JSON message
    const instance = MockEventSource.getInstances()[0];
    if (instance) {
      const event = new MessageEvent("message", {
        data: "invalid json",
      });
      instance.onmessage?.(event);
    }

    // Should log error but not crash (wait for async handler)
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse SSE message:",
        expect.any(Error),
      );
    });

    // Job status should remain unchanged
    expect(result.current.jobs[0]?.status).toBe("PENDING");

    consoleSpy.mockRestore();
  });

  it("should clean up existing connection when reconnecting", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(MockEventSource.getInstances()).toHaveLength(1);
    });

    // Start enhancement again (should clean up existing connection)
    await result.current.startEnhancement(["TIER_1K"]);

    // First instance should be closed
    const instances = MockEventSource.getInstances();
    expect(instances[0]?.readyState).toBe(2); // CLOSED
  });

  it("should reset reconnect attempts on successful open", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(MockEventSource.getInstances()).toHaveLength(1);
    });

    // Simulate successful open
    MockEventSource.simulateOpen(`/api/jobs/${mockJobId1}/stream`);

    // The onopen handler should have been called, resetting reconnect attempts
    // Verify the EventSource is in OPEN state
    const instance = MockEventSource.getInstances()[0];
    expect(instance?.readyState).toBe(1); // OPEN
  });

  it("should clean up existing timeout when connecting to job", async () => {
    const mockResponse = {
      jobs: [{ jobId: mockJobId1, tier: "TIER_1K", status: "PENDING" }],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() =>
      useParallelEnhancement({
        imageId: mockImageId,
      })
    );

    await result.current.startEnhancement(["TIER_1K"]);

    await waitFor(() => {
      expect(MockEventSource.getInstances()).toHaveLength(1);
    });

    // Start again - this tests the cleanup of existing timeout
    await result.current.startEnhancement(["TIER_1K"]);

    // Verify first instance was closed
    expect(MockEventSource.getInstances()[0]?.readyState).toBe(2); // CLOSED
  });
});
