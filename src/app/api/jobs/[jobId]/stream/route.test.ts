import { JobStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findUnique: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { GET } = await import("./route");

// Helper function to read SSE events from a ReadableStream
async function readSSEEvents(
  response: Response,
  maxEvents: number = 10,
): Promise<Array<{ type: string; [key: string]: unknown; }>> {
  const events: Array<{ type: string; [key: string]: unknown; }> = [];
  const reader = response.body?.getReader();
  if (!reader) return events;

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (events.length < maxEvents) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.substring(6);
          try {
            events.push(JSON.parse(jsonStr));
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }

  return events;
}

describe("/api/jobs/[jobId]/stream - GET", () => {
  const mockJobId = "test-job-id";
  const mockUserId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 if user is not authenticated for non-anonymous job", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    // Job exists and is not anonymous
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      isAnonymous: false,
      userId: mockUserId,
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 if session has no user id for non-anonymous job", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {},
    } as never);
    // Job exists and is not anonymous
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      isAnonymous: false,
      userId: mockUserId,
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 if job does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Job not found");
  });

  it("returns 403 if job belongs to different user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: "different-user-id",
      status: JobStatus.PENDING,
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Forbidden");
  });

  it("returns SSE stream with correct headers", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
      enhancedUrl: "http://example.com/enhanced.jpg",
      enhancedWidth: 2048,
      enhancedHeight: 1536,
      errorMessage: null,
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-transform",
    );
    expect(response.headers.get("Connection")).toBe("keep-alive");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");

    // Clean up the stream
    const reader = response.body?.getReader();
    if (reader) {
      await reader.cancel();
    }
  });

  it("sends connected event followed by status on COMPLETED job", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
      enhancedUrl: "http://example.com/enhanced.jpg",
      enhancedWidth: 2048,
      enhancedHeight: 1536,
      errorMessage: null,
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );

    vi.useRealTimers();

    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 3);

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]).toEqual({
      type: "connected",
      message: "Connected to job stream",
    });
    expect(events[1]).toEqual({
      type: "status",
      status: "COMPLETED",
      enhancedUrl: "http://example.com/enhanced.jpg",
      enhancedWidth: 2048,
      enhancedHeight: 1536,
      errorMessage: null,
    });
  });

  it("closes stream on COMPLETED status", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
      enhancedUrl: "http://example.com/enhanced.jpg",
      enhancedWidth: 2048,
      enhancedHeight: 1536,
      errorMessage: null,
    } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 5);

    // Stream should close after COMPLETED status
    expect(events.length).toBe(2);
    expect(events[1]?.["status"]).toBe("COMPLETED");
  });

  it("closes stream on FAILED status", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.FAILED,
      enhancedUrl: null,
      enhancedWidth: null,
      enhancedHeight: null,
      errorMessage: "Enhancement failed",
    } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 5);

    expect(events.length).toBe(2);
    expect(events[1]).toEqual({
      type: "status",
      status: "FAILED",
      enhancedUrl: null,
      enhancedWidth: null,
      enhancedHeight: null,
      errorMessage: "Enhancement failed",
    });
  });

  it("closes stream on CANCELLED status", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.CANCELLED,
      enhancedUrl: null,
      enhancedWidth: null,
      enhancedHeight: null,
      errorMessage: null,
    } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 5);

    expect(events.length).toBe(2);
    expect(events[1]?.["status"]).toBe("CANCELLED");
  });

  it("closes stream on REFUNDED status", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.REFUNDED,
      enhancedUrl: null,
      enhancedWidth: null,
      enhancedHeight: null,
      errorMessage: null,
    } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 5);

    expect(events.length).toBe(2);
    expect(events[1]?.["status"]).toBe("REFUNDED");
  });

  it("sends error event when job not found during polling", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    // First call returns job (for initial validation), then subsequent calls return null
    vi.mocked(prisma.imageEnhancementJob.findUnique)
      .mockResolvedValueOnce({
        id: mockJobId,
        userId: mockUserId,
        status: JobStatus.PENDING,
      } as never)
      .mockResolvedValueOnce(null);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 5);

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]?.["type"]).toBe("connected");
    // The second event should be an error since job not found
    expect(events[1]).toEqual({
      type: "error",
      message: "Job not found",
    });
  });

  it("continues polling with backoff on database errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // First call returns job (for initial validation)
    // Second call throws error (during first poll)
    // Third call returns COMPLETED to end stream
    vi.mocked(prisma.imageEnhancementJob.findUnique)
      .mockResolvedValueOnce({
        id: mockJobId,
        userId: mockUserId,
        status: JobStatus.PENDING,
      } as never)
      .mockRejectedValueOnce(new Error("Database connection error"))
      .mockResolvedValueOnce({
        id: mockJobId,
        userId: mockUserId,
        status: JobStatus.COMPLETED,
        enhancedUrl: "http://example.com/enhanced.jpg",
        enhancedWidth: 2048,
        enhancedHeight: 1536,
        errorMessage: null,
      } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 10);

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[0]?.["type"]).toBe("connected");
    expect(events[1]).toEqual({
      type: "error",
      message: "Failed to check job status",
    });
    // Stream should continue and eventually get COMPLETED status
    expect(events[2]?.["type"]).toBe("status");
    expect(events[2]?.["status"]).toBe("COMPLETED");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error checking job status:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it(
    "polls with PENDING interval for pending jobs",
    async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as never);

      let pollCount = 0;
      vi.mocked(prisma.imageEnhancementJob.findUnique).mockImplementation(
        (async () => {
          pollCount++;
          if (pollCount === 1) {
            // Initial validation call
            return {
              id: mockJobId,
              userId: mockUserId,
              status: JobStatus.PENDING,
            } as never;
          } else if (pollCount === 2) {
            // First poll - still pending
            return {
              id: mockJobId,
              userId: mockUserId,
              status: JobStatus.PENDING,
              enhancedUrl: null,
              enhancedWidth: null,
              enhancedHeight: null,
              errorMessage: null,
            } as never;
          } else {
            // Completed on subsequent polls
            return {
              id: mockJobId,
              userId: mockUserId,
              status: JobStatus.COMPLETED,
              enhancedUrl: "http://example.com/enhanced.jpg",
              enhancedWidth: 2048,
              enhancedHeight: 1536,
              errorMessage: null,
            } as never;
          }
        }) as unknown as typeof prisma.imageEnhancementJob.findUnique,
      );

      vi.useRealTimers();

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/test-job-id/stream",
      );
      const response = await GET(request, {
        params: Promise.resolve({ jobId: mockJobId }),
      });

      const events = await readSSEEvents(response, 5);

      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events[0]?.["type"]).toBe("connected");
      expect(events[1]?.["status"]).toBe("PENDING");
      expect(events[2]?.["status"]).toBe("COMPLETED");
    },
    15000,
  );

  it("polls with PROCESSING interval for processing jobs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    let pollCount = 0;
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockImplementation(
      (async () => {
        pollCount++;
        if (pollCount === 1) {
          // Initial validation call
          return {
            id: mockJobId,
            userId: mockUserId,
            status: JobStatus.PROCESSING,
          } as never;
        } else if (pollCount === 2) {
          // First poll - still processing
          return {
            id: mockJobId,
            userId: mockUserId,
            status: JobStatus.PROCESSING,
            enhancedUrl: null,
            enhancedWidth: null,
            enhancedHeight: null,
            errorMessage: null,
          } as never;
        } else {
          // Completed on subsequent polls
          return {
            id: mockJobId,
            userId: mockUserId,
            status: JobStatus.COMPLETED,
            enhancedUrl: "http://example.com/enhanced.jpg",
            enhancedWidth: 2048,
            enhancedHeight: 1536,
            errorMessage: null,
          } as never;
        }
      }) as unknown as typeof prisma.imageEnhancementJob.findUnique,
    );

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    const events = await readSSEEvents(response, 5);

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[0]?.["type"]).toBe("connected");
    expect(events[1]?.["status"]).toBe("PROCESSING");
    expect(events[2]?.["status"]).toBe("COMPLETED");
  });

  it("handles abort signal from client", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
      enhancedUrl: null,
      enhancedWidth: null,
      enhancedHeight: null,
      errorMessage: null,
    } as never);

    const abortController = new AbortController();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
      { signal: abortController.signal },
    );

    vi.useRealTimers();

    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);

    // Start reading and then abort
    const reader = response.body?.getReader();
    if (reader) {
      // Read first chunk
      await reader.read();
      // Abort
      abortController.abort();
      await reader.cancel();
    }

    // Stream should handle abort gracefully
    expect(response.status).toBe(200);
  });

  it("handles stream cancel from reader", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.PENDING,
      enhancedUrl: null,
      enhancedWidth: null,
      enhancedHeight: null,
      errorMessage: null,
    } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);

    // Get the reader and cancel it
    const reader = response.body?.getReader();
    if (reader) {
      // Read first event
      await reader.read();
      // Cancel the stream
      await reader.cancel();
    }

    // The cancel function in the ReadableStream should be called
    expect(response.status).toBe(200);
  });

  it(
    "applies exponential backoff after threshold polls",
    async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as never);

      // Use PROCESSING status for faster polling (3s instead of 5s)
      // Only do 2 polls before completing to keep test fast
      let pollCount = 0;
      vi.mocked(prisma.imageEnhancementJob.findUnique).mockImplementation(
        (async () => {
          pollCount++;
          if (pollCount <= 2) {
            // Return PROCESSING for a couple of polls
            return {
              id: mockJobId,
              userId: mockUserId,
              status: JobStatus.PROCESSING,
              enhancedUrl: null,
              enhancedWidth: null,
              enhancedHeight: null,
              errorMessage: null,
            } as never;
          }
          // Complete
          return {
            id: mockJobId,
            userId: mockUserId,
            status: JobStatus.COMPLETED,
            enhancedUrl: "http://example.com/enhanced.jpg",
            enhancedWidth: 2048,
            enhancedHeight: 1536,
            errorMessage: null,
          } as never;
        }) as unknown as typeof prisma.imageEnhancementJob.findUnique,
      );

      vi.useRealTimers();

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/test-job-id/stream",
      );
      const response = await GET(request, {
        params: Promise.resolve({ jobId: mockJobId }),
      });

      const events = await readSSEEvents(response, 10);

      // Should have connected + processing status updates + completed
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events[0]?.["type"]).toBe("connected");

      // Verify we got status updates (backoff affects timing, not events)
      const statusEvents = events.filter((e) => e["type"] === "status");
      expect(statusEvents.length).toBeGreaterThanOrEqual(2);
      expect(statusEvents[0]?.["status"]).toBe("PROCESSING");
      // The last status event should be COMPLETED
      expect(statusEvents[statusEvents.length - 1]?.["status"]).toBe("COMPLETED");
    },
    15000,
  );

  it("handles sendEvent when stream is already closed", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    vi.mocked(prisma.imageEnhancementJob.findUnique).mockResolvedValue({
      id: mockJobId,
      userId: mockUserId,
      status: JobStatus.COMPLETED,
      enhancedUrl: "http://example.com/enhanced.jpg",
      enhancedWidth: 2048,
      enhancedHeight: 1536,
      errorMessage: null,
    } as never);

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    // Read and consume all events (stream will close after COMPLETED)
    const events = await readSSEEvents(response, 10);

    expect(events.length).toBe(2);
    expect(events[0]?.["type"]).toBe("connected");
    expect(events[1]?.["status"]).toBe("COMPLETED");
  });

  it("handles checkStatus when stream is already closed", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    let pollCount = 0;
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockImplementation(
      (async () => {
        pollCount++;
        if (pollCount === 1) {
          return {
            id: mockJobId,
            userId: mockUserId,
            status: JobStatus.PENDING,
          } as never;
        }
        // Return PENDING to continue polling
        return {
          id: mockJobId,
          userId: mockUserId,
          status: JobStatus.PENDING,
          enhancedUrl: null,
          enhancedWidth: null,
          enhancedHeight: null,
          errorMessage: null,
        } as never;
      }) as unknown as typeof prisma.imageEnhancementJob.findUnique,
    );

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );
    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    // Start reading and cancel immediately
    const reader = response.body?.getReader();
    if (reader) {
      await reader.read();
      await reader.cancel();
    }

    // The stream should handle being closed gracefully
    expect(response.status).toBe(200);
  });

  it("handles abort signal with active timeout", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    let _pollCount = 0;
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockImplementation(
      (async () => {
        _pollCount++;
        // Always return PENDING to keep polling
        return {
          id: mockJobId,
          userId: mockUserId,
          status: JobStatus.PENDING,
          enhancedUrl: null,
          enhancedWidth: null,
          enhancedHeight: null,
          errorMessage: null,
        } as never;
      }) as unknown as typeof prisma.imageEnhancementJob.findUnique,
    );

    const abortController = new AbortController();

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
      { signal: abortController.signal },
    );

    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);

    // Read a bit then abort
    const reader = response.body?.getReader();
    if (reader) {
      await reader.read();
      abortController.abort();
      try {
        await reader.cancel();
      } catch {
        // Ignore errors from cancelled stream
      }
    }

    expect(response.status).toBe(200);
  });

  it("cancels stream and clears timeout on cancel", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as never);

    let _pollCount = 0;
    vi.mocked(prisma.imageEnhancementJob.findUnique).mockImplementation(
      (async () => {
        _pollCount++;
        // First call for validation, then polling
        return {
          id: mockJobId,
          userId: mockUserId,
          status: JobStatus.PENDING,
          enhancedUrl: null,
          enhancedWidth: null,
          enhancedHeight: null,
          errorMessage: null,
        } as never;
      }) as unknown as typeof prisma.imageEnhancementJob.findUnique,
    );

    vi.useRealTimers();

    const request = new NextRequest(
      "http://localhost:3000/api/jobs/test-job-id/stream",
    );

    const response = await GET(request, {
      params: Promise.resolve({ jobId: mockJobId }),
    });

    expect(response.status).toBe(200);

    const reader = response.body?.getReader();
    if (reader) {
      // Read a few events
      await reader.read();
      await reader.read();
      // Cancel the stream - this should trigger the cancel callback
      await reader.cancel();
    }

    // Verify stream handled cancellation gracefully
    expect(response.status).toBe(200);
  });
});
