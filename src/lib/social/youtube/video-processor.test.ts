import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeClient } from "../clients/youtube";
import { pollVideoProcessingStatus } from "./video-processor";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("pollVideoProcessingStatus", () => {
  let mockClient: YouTubeClient;

  beforeEach(() => {
    mockClient = {
      getAccessTokenOrThrow: vi.fn().mockReturnValue("mock-token"),
    } as unknown as YouTubeClient;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return processed status when API returns processed", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "processed" },
          processingDetails: { processingStatus: "succeeded" },
        }],
      }),
    });

    const result = await pollVideoProcessingStatus(mockClient, "video123", { intervalMs: 100 });

    expect(result.status).toBe("processed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/videos"),
      expect.objectContaining({
        headers: { Authorization: "Bearer mock-token" },
      }),
    );
  });

  it("should poll until processed", async () => {
    // First call: processing
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "uploaded" },
          processingDetails: { processingStatus: "processing" },
        }],
      }),
    });

    // Second call: processed
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "processed" },
          processingDetails: { processingStatus: "succeeded" },
        }],
      }),
    });

    const promise = pollVideoProcessingStatus(mockClient, "video123", { intervalMs: 100 });

    // Fast-forward time
    await vi.advanceTimersByTimeAsync(150);

    const result = await promise;

    expect(result.status).toBe("processed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should return failed if processing fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "uploaded" },
          processingDetails: {
            processingStatus: "failed",
            processingFailureReason: "transcodeFailed",
          },
        }],
      }),
    });

    const result = await pollVideoProcessingStatus(mockClient, "video123");

    expect(result.status).toBe("failed");
    expect(result.processingDetails?.processingFailureReason).toBe("transcodeFailed");
  });

  it("should return timeout if maxAttempts reached", async () => {
    // Always processing
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          status: { uploadStatus: "uploaded" },
          processingDetails: { processingStatus: "processing" },
        }],
      }),
    });

    const promise = pollVideoProcessingStatus(mockClient, "video123", {
      maxAttempts: 2,
      intervalMs: 10,
    });

    // Advance time to trigger retries
    await vi.advanceTimersByTimeAsync(30);

    const result = await promise;

    // We expect it to try twice then timeout
    expect(result.status).toBe("timeout");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
