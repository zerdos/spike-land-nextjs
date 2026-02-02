
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollVideoProcessingStatus } from "./video-processor";

describe("pollVideoProcessingStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should return processed status when video is processed", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "processed" },
          processingDetails: { processingStatus: "succeeded" }
        }]
      })
    });

    const promise = pollVideoProcessingStatus("token", "video123", { intervalMs: 100 });

    // Fast-forward timers just in case, though it should resolve immediately
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.status).toBe("processed");
    expect(result.processingDetails?.processingStatus).toBe("succeeded");
  });

  it("should retry until processed", async () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

    // First call: processing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "uploaded" },
          processingDetails: { processingStatus: "processing" }
        }]
      })
    });

    // Second call: processed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "processed" },
          processingDetails: { processingStatus: "succeeded" }
        }]
      })
    });

    const promise = pollVideoProcessingStatus("token", "video123", { intervalMs: 1000 });

    // Should be waiting now
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result.status).toBe("processed");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should return failed status when processing fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "failed" },
          processingDetails: { processingStatus: "failed" }
        }]
      })
    });

    const result = await pollVideoProcessingStatus("token", "video123");
    expect(result.status).toBe("failed");
  });

  it("should timeout if maxAttempts reached", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "uploaded" },
          processingDetails: { processingStatus: "processing" }
        }]
      })
    });

    const promise = pollVideoProcessingStatus("token", "video123", {
      maxAttempts: 3,
      intervalMs: 1000
    });

    await vi.advanceTimersByTimeAsync(3000);

    const result = await promise;
    expect(result.status).toBe("timeout");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("should throw on 401 Access Denied", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized"
    });

    const promise = pollVideoProcessingStatus("token", "video123");

    await expect(promise).rejects.toThrow("Access denied");
  });

  it("should retry on 500 error", async () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

    // First call: 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error"
    });

    // Second call: Success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "processed" }
        }]
      })
    });

    const promise = pollVideoProcessingStatus("token", "video123", { intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result.status).toBe("processed");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
