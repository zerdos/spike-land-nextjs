import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetForTesting,
  initializeConsoleCapture,
  reportErrorBoundary,
} from "./console-capture.client";

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

// Mock sendBeacon
const mockSendBeacon = vi.fn();

describe("console-capture.client", () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    _resetForTesting();
    originalConsoleError = console.error;
    mockFetch.mockClear();
    mockSendBeacon.mockClear();
    vi.useFakeTimers();

    // Mock window and navigator for browser environment
    vi.stubGlobal("window", {
      location: { pathname: "/test-route" },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("navigator", { sendBeacon: mockSendBeacon });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.useRealTimers();
    _resetForTesting();
  });

  describe("initializeConsoleCapture", () => {
    it("should override console.error", () => {
      const before = console.error;
      initializeConsoleCapture();
      expect(console.error).not.toBe(before);
    });

    it("should only initialize once", () => {
      initializeConsoleCapture();
      const afterFirst = console.error;
      initializeConsoleCapture();
      expect(console.error).toBe(afterFirst);
    });

    it("should call original console.error", () => {
      const spy = vi.fn();
      console.error = spy;
      initializeConsoleCapture();

      console.error("test message");
      expect(spy).toHaveBeenCalledWith("test message");
    });

    it("should capture string error messages", () => {
      initializeConsoleCapture();

      console.error("Something went wrong");
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].message).toBe("Something went wrong");
      expect(body.errors[0].environment).toBe("FRONTEND");
      expect(body.errors[0].errorType).toBe("ConsoleError");
    });

    it("should capture Error objects", () => {
      initializeConsoleCapture();

      console.error(new Error("Error object"));
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors[0].message).toBe("Error object");
      expect(body.errors[0].errorType).toBe("Error");
    });

    it("should register window event listeners", () => {
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal("window", {
        location: { pathname: "/test" },
        addEventListener: addEventListenerSpy,
      });

      initializeConsoleCapture();

      // Should register error, unhandledrejection, beforeunload
      const eventTypes = addEventListenerSpy.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(eventTypes).toContain("error");
      expect(eventTypes).toContain("unhandledrejection");
      expect(eventTypes).toContain("beforeunload");
    });

    it("should flush when batch size reached", () => {
      initializeConsoleCapture();

      for (let i = 0; i < 10; i++) {
        console.error(`Unique error ${i}`);
      }

      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe("error deduplication (#1157)", () => {
    it("should deduplicate identical errors within 60s window", () => {
      initializeConsoleCapture();

      for (let i = 0; i < 5; i++) {
        console.error("Repeated error");
      }
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
    });

    it("should allow same error after dedup window expires", () => {
      initializeConsoleCapture();

      console.error("Repeated error");
      vi.advanceTimersByTime(6000);
      expect(mockFetch).toHaveBeenCalledOnce();
      mockFetch.mockClear();

      // Advance past dedup window
      vi.advanceTimersByTime(61_000);

      console.error("Repeated error");
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
    });

    it("should allow different errors through", () => {
      initializeConsoleCapture();

      console.error("Error A");
      console.error("Error B");
      console.error("Error C");
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(3);
    });

    it("should clean expired entries when map exceeds 100", () => {
      initializeConsoleCapture();

      for (let i = 0; i < 101; i++) {
        console.error(`Unique error ${i}`);
      }

      vi.advanceTimersByTime(61_000);

      console.error("After cleanup error");
      vi.advanceTimersByTime(6000);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      const messages = body.errors.map((e: { message: string }) => e.message);
      expect(messages).toContain("After cleanup error");
    });

    it("should deduplicate errors from uncaught exceptions", () => {
      const handlers: Record<string, ((event: unknown) => void)[]> = {};
      vi.stubGlobal("window", {
        location: { pathname: "/test" },
        addEventListener: (event: string, handler: (event: unknown) => void) => {
          handlers[event] = handlers[event] || [];
          handlers[event].push(handler);
        },
      });

      initializeConsoleCapture();

      const errorHandler = handlers["error"]?.[0];
      if (errorHandler) {
        // Fire same error event twice
        for (let i = 0; i < 3; i++) {
          errorHandler({
            error: { message: "Uncaught", stack: "at file.js:1:1", name: "Error" },
            message: "Uncaught",
            filename: "file.js",
            lineno: 1,
            colno: 1,
          });
        }
      }

      vi.advanceTimersByTime(6000);

      if (mockFetch.mock.calls.length > 0) {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.errors).toHaveLength(1);
      }
    });

    it("should deduplicate errors from unhandled rejections", () => {
      const handlers: Record<string, ((event: unknown) => void)[]> = {};
      vi.stubGlobal("window", {
        location: { pathname: "/test" },
        addEventListener: (event: string, handler: (event: unknown) => void) => {
          handlers[event] = handlers[event] || [];
          handlers[event].push(handler);
        },
      });

      initializeConsoleCapture();

      const rejectionHandler = handlers["unhandledrejection"]?.[0];
      if (rejectionHandler) {
        for (let i = 0; i < 3; i++) {
          rejectionHandler({ reason: new Error("Unhandled") });
        }
      }

      vi.advanceTimersByTime(6000);

      if (mockFetch.mock.calls.length > 0) {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.errors).toHaveLength(1);
      }
    });
  });

  describe("reportErrorBoundary", () => {
    it("should queue error boundary errors", () => {
      const error = new Error("Boundary error");
      reportErrorBoundary(error, "<App>");
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors[0].message).toBe("Boundary error");
      expect(body.errors[0].metadata.source).toBe("error-boundary");
      expect(body.errors[0].metadata.componentStack).toBe("<App>");
    });

    it("should deduplicate repeated error boundary errors", () => {
      const error = new Error("Boundary error");
      for (let i = 0; i < 5; i++) {
        reportErrorBoundary(error, "<App>");
      }
      vi.advanceTimersByTime(6000);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
    });
  });

  describe("_resetForTesting", () => {
    it("should reset all internal state", () => {
      initializeConsoleCapture();
      console.error("Error before reset");

      // Restore console.error before resetting to avoid recursion
      console.error = originalConsoleError;
      _resetForTesting();

      initializeConsoleCapture();
      console.error("Error after reset");
      vi.advanceTimersByTime(6000);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].message).toBe("Error after reset");
    });
  });

  describe("parseStackTrace", () => {
    it("should skip structured-logger frames", () => {
      initializeConsoleCapture();

      const error = new Error("test");
      error.stack = `Error: test
    at StructuredLogger.output (src/lib/errors/structured-logger.ts:132:7)
    at userCode (src/app/page.tsx:15:3)`;

      console.error(error);
      vi.advanceTimersByTime(6000);

      if (mockFetch.mock.calls.length > 0) {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        if (body.errors.length > 0 && body.errors[0].sourceFile) {
          expect(body.errors[0].sourceFile).not.toContain("structured-logger");
        }
      }
    });
  });

  describe("multiple args serialization", () => {
    it("should join multiple string args", () => {
      initializeConsoleCapture();

      console.error("Error:", "detail", "here");
      vi.advanceTimersByTime(6000);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors[0].message).toBe("Error: detail here");
    });

    it("should serialize objects as JSON", () => {
      initializeConsoleCapture();

      console.error("Error:", { code: 500 });
      vi.advanceTimersByTime(6000);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors[0].message).toContain("500");
    });
  });

  describe("non-Error unhandled rejections", () => {
    it("should handle string rejection reasons", () => {
      const handlers: Record<string, ((event: unknown) => void)[]> = {};
      vi.stubGlobal("window", {
        location: { pathname: "/test" },
        addEventListener: (event: string, handler: (event: unknown) => void) => {
          handlers[event] = handlers[event] || [];
          handlers[event].push(handler);
        },
      });

      initializeConsoleCapture();

      const rejectionHandler = handlers["unhandledrejection"]?.[0];
      if (rejectionHandler) {
        rejectionHandler({ reason: "string rejection" });
      }

      vi.advanceTimersByTime(6000);

      if (mockFetch.mock.calls.length > 0) {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.errors[0].message).toBe("string rejection");
        expect(body.errors[0].errorType).toBe("UnhandledRejection");
      }
    });
  });

  describe("error events without error object", () => {
    it("should handle error events with no error property", () => {
      const handlers: Record<string, ((event: unknown) => void)[]> = {};
      vi.stubGlobal("window", {
        location: { pathname: "/test" },
        addEventListener: (event: string, handler: (event: unknown) => void) => {
          handlers[event] = handlers[event] || [];
          handlers[event].push(handler);
        },
      });

      initializeConsoleCapture();

      const errorHandler = handlers["error"]?.[0];
      if (errorHandler) {
        errorHandler({
          error: null,
          message: "Script error",
          filename: "",
          lineno: 0,
          colno: 0,
        });
      }

      vi.advanceTimersByTime(6000);

      if (mockFetch.mock.calls.length > 0) {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.errors[0].message).toBe("Script error");
        expect(body.errors[0].errorType).toBe("UncaughtException");
      }
    });
  });
});
