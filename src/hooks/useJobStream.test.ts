import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJobStream } from "./useJobStream";

// Mock EventSource
class MockEventSource {
  public url: string;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 0;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  private static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  static getInstances() {
    return MockEventSource.instances;
  }

  static clearInstances() {
    MockEventSource.instances = [];
  }

  static getLastInstance() {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static simulateOpen(url: string) {
    const instance = MockEventSource.instances.find((i) => i.url === url);
    if (instance) {
      instance.readyState = MockEventSource.OPEN;
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
const originalEventSource = global.EventSource;
global.EventSource = MockEventSource as unknown as typeof EventSource;

describe("useJobStream", () => {
  const mockJobId = "test-job-123";
  const streamUrl = `/api/jobs/${mockJobId}/stream`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockEventSource.clearInstances();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with null job and not connected", () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: null,
        })
      );

      expect(result.current.job).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionError).toBeNull();
    });

    it("should not create EventSource when jobId is null", () => {
      renderHook(() =>
        useJobStream({
          jobId: null,
        })
      );

      expect(MockEventSource.getInstances()).toHaveLength(0);
    });

    it("should create EventSource when jobId is provided", () => {
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      expect(MockEventSource.getInstances()).toHaveLength(1);
      expect(MockEventSource.getLastInstance()?.url).toBe(streamUrl);
    });

    it("should reset job to null when jobId changes to null", () => {
      const { result, rerender } = renderHook(
        ({ jobId }: { jobId: string | null; }) =>
          useJobStream({
            jobId,
          }),
        { initialProps: { jobId: mockJobId as string | null } },
      );

      // Simulate a connected message followed by status update
      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "connected",
        });
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "PROCESSING",
        });
      });

      expect(result.current.job).not.toBeNull();
      expect(result.current.job?.status).toBe("PROCESSING");

      // Change jobId to null
      act(() => {
        rerender({ jobId: null });
      });

      expect(result.current.job).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("connection handling", () => {
    it("should set isConnected to true on 'connected' message", async () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      expect(result.current.isConnected).toBe(false);

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "connected",
        });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionError).toBeNull();
    });

    it("should reset reconnect attempts on successful open", () => {
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      const instance = MockEventSource.getLastInstance();
      expect(instance).toBeDefined();

      // Simulate open
      act(() => {
        MockEventSource.simulateOpen(streamUrl);
      });

      // Verify instance is in OPEN state
      expect(instance?.readyState).toBe(MockEventSource.OPEN);
    });

    it("should clear connection error on successful connection", async () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      // Simulate an error first
      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "error",
          message: "Test error",
        });
      });

      expect(result.current.connectionError).toBe("Test error");

      // Then simulate a successful connection
      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "connected",
        });
      });

      expect(result.current.connectionError).toBeNull();
    });
  });

  describe("message handling", () => {
    it("should handle 'status' message and update job", () => {
      const onStatusChange = vi.fn();
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onStatusChange,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "PROCESSING",
          enhancedUrl: null,
          enhancedWidth: null,
          enhancedHeight: null,
          errorMessage: null,
        });
      });

      expect(result.current.job).toEqual({
        id: mockJobId,
        status: "PROCESSING",
        enhancedUrl: null,
        enhancedWidth: null,
        enhancedHeight: null,
        errorMessage: null,
        currentStage: null,
      });
      expect(onStatusChange).toHaveBeenCalledWith("PROCESSING");
    });

    it("should handle 'status' message with enhanced data", () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
          enhancedWidth: 2000,
          enhancedHeight: 1500,
          errorMessage: null,
        });
      });

      expect(result.current.job).toEqual({
        id: mockJobId,
        status: "COMPLETED",
        enhancedUrl: "https://example.com/enhanced.jpg",
        enhancedWidth: 2000,
        enhancedHeight: 1500,
        errorMessage: null,
        currentStage: null,
      });
    });

    it("should call onComplete when status is COMPLETED", () => {
      const onComplete = vi.fn();
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onComplete,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
          enhancedWidth: 2000,
          enhancedHeight: 1500,
        });
      });

      expect(onComplete).toHaveBeenCalledWith({
        id: mockJobId,
        status: "COMPLETED",
        enhancedUrl: "https://example.com/enhanced.jpg",
        enhancedWidth: 2000,
        enhancedHeight: 1500,
        errorMessage: null,
        currentStage: null,
      });
    });

    it("should call onError when status is FAILED", () => {
      const onError = vi.fn();
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onError,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "FAILED",
          errorMessage: "Enhancement failed due to timeout",
        });
      });

      expect(onError).toHaveBeenCalledWith("Enhancement failed due to timeout");
    });

    it("should call onError with default message when FAILED without errorMessage", () => {
      const onError = vi.fn();
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onError,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "FAILED",
        });
      });

      expect(onError).toHaveBeenCalledWith("Enhancement failed");
    });

    it("should handle 'error' message type", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onError,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "error",
          message: "Server error occurred",
        });
      });

      expect(result.current.connectionError).toBe("Server error occurred");
      expect(onError).toHaveBeenCalledWith("Server error occurred");
    });

    it("should handle 'error' message with default message", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onError,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "error",
        });
      });

      expect(result.current.connectionError).toBe("Unknown error");
      expect(onError).toHaveBeenCalledWith("Unknown error");
    });

    it("should ignore status message without status field", () => {
      const onStatusChange = vi.fn();
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onStatusChange,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          // missing status field
        });
      });

      expect(result.current.job).toBeNull();
      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it("should handle JSON parse error gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      const instance = MockEventSource.getLastInstance();
      if (instance) {
        const event = new MessageEvent("message", {
          data: "invalid json",
        });
        act(() => {
          instance.onmessage?.(event);
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse SSE message:",
        expect.any(Error),
      );
      expect(result.current.job).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("reconnection behavior", () => {
    it("should set isConnected to false on error", () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      // First connect
      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "connected",
        });
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate error
      const instance = MockEventSource.getLastInstance();
      if (instance) {
        instance.readyState = MockEventSource.OPEN;
      }

      act(() => {
        MockEventSource.simulateError(streamUrl);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it("should not reconnect if stream was intentionally closed", () => {
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      const instance = MockEventSource.getLastInstance();
      const initialInstanceCount = MockEventSource.getInstances().length;

      // Close the stream intentionally
      if (instance) {
        instance.readyState = MockEventSource.CLOSED;
      }

      act(() => {
        MockEventSource.simulateError(streamUrl);
      });

      // Advance timers - no reconnection should happen
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should not create new EventSource instances
      expect(MockEventSource.getInstances().length).toBe(initialInstanceCount);
    });

    it("should attempt reconnection with exponential backoff", () => {
      renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      const instance = MockEventSource.getLastInstance();
      const initialInstanceCount = MockEventSource.getInstances().length;

      // Keep the stream in non-closed state
      if (instance) {
        instance.readyState = MockEventSource.OPEN;
      }

      // First error
      act(() => {
        MockEventSource.simulateError(streamUrl);
      });

      // Should reconnect after 1 second (2^0 * 1000)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(MockEventSource.getInstances().length).toBe(
        initialInstanceCount + 1,
      );
    });

    it("should stop reconnecting after max attempts", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onError,
        })
      );

      // Simulate 5 errors (max reconnect attempts)
      for (let i = 0; i < 5; i++) {
        const instance = MockEventSource.getLastInstance();
        if (instance) {
          instance.readyState = MockEventSource.OPEN;
        }

        act(() => {
          MockEventSource.simulateError(streamUrl);
        });

        // Advance timer with exponential backoff (capped at 10000ms)
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        act(() => {
          vi.advanceTimersByTime(delay);
        });
      }

      // After 5 attempts, should set connection error
      const finalInstance = MockEventSource.getLastInstance();
      if (finalInstance) {
        finalInstance.readyState = MockEventSource.OPEN;
      }

      act(() => {
        MockEventSource.simulateError(streamUrl);
      });

      expect(result.current.connectionError).toBe(
        "Connection lost. Please refresh the page.",
      );
      expect(onError).toHaveBeenCalledWith("Connection lost");
    });
  });

  describe("cleanup", () => {
    it("should close EventSource on unmount", () => {
      const { unmount } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      const instance = MockEventSource.getLastInstance();
      expect(instance?.readyState).toBe(MockEventSource.CONNECTING);

      unmount();

      expect(instance?.readyState).toBe(MockEventSource.CLOSED);
    });

    it("should close EventSource and cleanup on unmount when connected", () => {
      const { unmount } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      const instance = MockEventSource.getLastInstance();

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "connected",
        });
      });

      // Verify connection before unmount
      expect(instance?.readyState).not.toBe(MockEventSource.CLOSED);

      unmount();

      // After unmount, the EventSource should be closed
      expect(instance?.readyState).toBe(MockEventSource.CLOSED);
    });

    it("should clear reconnect timeout on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const { unmount } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      // Trigger a reconnect
      const instance = MockEventSource.getLastInstance();
      if (instance) {
        instance.readyState = MockEventSource.OPEN;
      }

      act(() => {
        MockEventSource.simulateError(streamUrl);
      });

      // Unmount before reconnect timeout fires
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should close EventSource when jobId changes", () => {
      const { rerender } = renderHook(
        ({ jobId }) =>
          useJobStream({
            jobId,
          }),
        { initialProps: { jobId: mockJobId } },
      );

      const firstInstance = MockEventSource.getLastInstance();
      expect(firstInstance?.url).toBe(streamUrl);

      // Change jobId
      rerender({ jobId: "new-job-456" });

      // First instance should be closed
      expect(firstInstance?.readyState).toBe(MockEventSource.CLOSED);

      // New instance should be created
      const newInstance = MockEventSource.getLastInstance();
      expect(newInstance?.url).toBe("/api/jobs/new-job-456/stream");
    });
  });

  describe("callback stability", () => {
    it("should use updated callback when callback changes", () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      const { rerender } = renderHook(
        ({ onComplete }) =>
          useJobStream({
            jobId: mockJobId,
            onComplete,
          }),
        { initialProps: { onComplete: onComplete1 } },
      );

      // Simulate status update
      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "PROCESSING",
        });
      });

      // Change callback - this will create a new EventSource due to handleMessage dependency
      rerender({ onComplete: onComplete2 });

      // Get the latest EventSource instance (new one created after callback change)
      const latestInstance = MockEventSource.getLastInstance();

      // Directly call onmessage on the latest instance to bypass URL matching issue
      // (since old and new instances have same URL)
      act(() => {
        const event = new MessageEvent("message", {
          data: JSON.stringify({
            type: "status",
            status: "COMPLETED",
            enhancedUrl: "https://example.com/enhanced.jpg",
          }),
        });
        latestInstance?.onmessage?.(event);
      });

      // The new callback should be called
      expect(onComplete2).toHaveBeenCalled();
    });

    it("should NOT create new EventSource when callbacks change due to ref optimization", () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      const { rerender } = renderHook(
        ({ onComplete }) =>
          useJobStream({
            jobId: mockJobId,
            onComplete,
          }),
        { initialProps: { onComplete: onComplete1 } },
      );

      const initialInstanceCount = MockEventSource.getInstances().length;

      // Change callback
      rerender({ onComplete: onComplete2 });

      // Due to the ref optimization, changing callbacks will NOT recreate
      // the EventSource - callbacks are stored in refs and updated separately
      expect(MockEventSource.getInstances().length).toBe(initialInstanceCount);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple rapid status updates", () => {
      const onStatusChange = vi.fn();
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
          onStatusChange,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "PENDING",
        });
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "PROCESSING",
        });
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
        });
      });

      expect(result.current.job?.status).toBe("COMPLETED");
      expect(onStatusChange).toHaveBeenCalledTimes(3);
    });

    it("should handle status update with optional fields as undefined", () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "PROCESSING",
          // All optional fields undefined
        });
      });

      expect(result.current.job).toEqual({
        id: mockJobId,
        status: "PROCESSING",
        enhancedUrl: null,
        enhancedWidth: null,
        enhancedHeight: null,
        errorMessage: null,
        currentStage: null,
      });
    });

    it("should work without any callbacks", () => {
      const { result } = renderHook(() =>
        useJobStream({
          jobId: mockJobId,
        })
      );

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "connected",
        });
      });

      act(() => {
        MockEventSource.simulateMessage(streamUrl, {
          type: "status",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
        });
      });

      expect(result.current.job?.status).toBe("COMPLETED");
      expect(result.current.isConnected).toBe(true);
    });
  });
});

// Restore original EventSource after all tests
afterAll(() => {
  global.EventSource = originalEventSource;
});
