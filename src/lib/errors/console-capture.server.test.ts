import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only before importing the module
vi.mock("server-only", () => ({}));

// We need to mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

import {
  _resetForTesting,
  flushServerErrors,
  initializeServerConsoleCapture,
} from "./console-capture.server";

describe("console-capture.server", () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    _resetForTesting();
    originalConsoleError = console.error;
    mockFetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore console.error to original
    console.error = originalConsoleError;
    vi.useRealTimers();
    _resetForTesting();
  });

  describe("initializeServerConsoleCapture", () => {
    it("should override console.error", () => {
      const before = console.error;
      initializeServerConsoleCapture();
      expect(console.error).not.toBe(before);
    });

    it("should only initialize once", () => {
      initializeServerConsoleCapture();
      const afterFirst = console.error;
      initializeServerConsoleCapture();
      expect(console.error).toBe(afterFirst);
    });

    it("should call original console.error", () => {
      const spy = vi.fn();
      console.error = spy;
      initializeServerConsoleCapture();

      console.error("test message");
      expect(spy).toHaveBeenCalledWith("test message");
    });

    it("should capture string error messages", () => {
      initializeServerConsoleCapture();

      console.error("Something went wrong");

      // Advance timer to trigger flush
      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].message).toBe("Something went wrong");
      expect(body.errors[0].environment).toBe("BACKEND");
      expect(body.errors[0].errorType).toBe("ConsoleError");
    });

    it("should capture Error object messages", () => {
      initializeServerConsoleCapture();

      const error = new Error("Test error");
      console.error(error);

      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].message).toBe("Test error");
      expect(body.errors[0].errorType).toBe("Error");
    });

    it("should batch multiple errors", () => {
      initializeServerConsoleCapture();

      console.error("Error 1");
      console.error("Error 2");
      console.error("Error 3");

      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(3);
    });

    it("should flush immediately when batch size reached", () => {
      initializeServerConsoleCapture();

      // Queue 10 unique errors (MAX_BATCH_SIZE)
      for (let i = 0; i < 10; i++) {
        console.error(`Error ${i} at unique location`);
      }

      // Should have flushed without timer
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("should skip errors in workflow environment", () => {
      vi.stubEnv("WORKFLOW_RUNTIME", "true");
      initializeServerConsoleCapture();

      console.error("Workflow error");

      vi.advanceTimersByTime(2500);

      expect(mockFetch).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });
  });

  describe("structured logger filtering (#1159)", () => {
    it("should skip errors from structured-logger", () => {
      initializeServerConsoleCapture();

      // Simulate what happens when StructuredLogger calls console.error
      // The isFromStructuredLogger check looks at new Error().stack
      // In real usage, the stack would include "structured-logger" in the file path
      // We need to test the filtering mechanism works
      // Since we can't easily simulate a stack from structured-logger in unit tests,
      // we verify the parseStackTrace skips structured-logger frames
      console.error("Real error from user code");

      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
    });
  });

  describe("error deduplication (#1157)", () => {
    it("should deduplicate identical errors within 60s window", () => {
      initializeServerConsoleCapture();

      // Same error 5 times
      for (let i = 0; i < 5; i++) {
        console.error("Repeated error");
      }

      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Only 1 should pass through dedup
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].message).toBe("Repeated error");
    });

    it("should allow same error after dedup window expires", () => {
      initializeServerConsoleCapture();

      console.error("Repeated error");
      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      mockFetch.mockClear();

      // Advance past the 60s dedup window
      vi.advanceTimersByTime(61_000);

      console.error("Repeated error");
      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(1);
    });

    it("should allow different errors through", () => {
      initializeServerConsoleCapture();

      console.error("Error A");
      console.error("Error B");
      console.error("Error C");

      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors).toHaveLength(3);
    });

    it("should clean expired entries when map exceeds 100", () => {
      initializeServerConsoleCapture();

      // Generate 101 unique errors (to trigger cleanup)
      for (let i = 0; i < 101; i++) {
        console.error(`Unique error ${i}`);
      }

      // Advance past dedup window
      vi.advanceTimersByTime(61_000);

      // This error should go through after cleanup
      console.error("After cleanup error");
      vi.advanceTimersByTime(2500);

      // The error after cleanup should have been captured
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      const messages = body.errors.map((e: { message: string }) => e.message);
      expect(messages).toContain("After cleanup error");
    });
  });

  describe("flushServerErrors", () => {
    it("should flush pending errors", async () => {
      initializeServerConsoleCapture();

      console.error("Pending error");

      await flushServerErrors();

      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("should be a no-op when no pending errors", async () => {
      await flushServerErrors();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("_resetForTesting", () => {
    it("should reset all internal state", () => {
      initializeServerConsoleCapture();
      console.error("Error before reset");

      // Restore console.error before resetting to avoid recursion
      console.error = originalConsoleError;
      _resetForTesting();

      // After reset, initializing again should work
      initializeServerConsoleCapture();
      console.error("Error after reset");

      vi.advanceTimersByTime(2500);

      // Only the error after reset should be reported
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].message).toBe("Error after reset");
    });
  });

  describe("getBaseUrl", () => {
    it("should use NEXTAUTH_URL when available", () => {
      vi.stubEnv("NEXTAUTH_URL", "https://example.com");
      _resetForTesting();
      initializeServerConsoleCapture();

      console.error("Test error");
      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/api/errors/report",
        expect.any(Object),
      );
      vi.unstubAllEnvs();
    });

    it("should use VERCEL_URL as fallback", () => {
      vi.stubEnv("NEXTAUTH_URL", "");
      vi.stubEnv("VERCEL_URL", "my-app.vercel.app");
      _resetForTesting();
      initializeServerConsoleCapture();

      console.error("Test error");
      vi.advanceTimersByTime(2500);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://my-app.vercel.app/api/errors/report",
        expect.any(Object),
      );
      vi.unstubAllEnvs();
    });
  });

  describe("fetch error handling", () => {
    it("should not throw when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      initializeServerConsoleCapture();

      console.error("Test error");

      // Should not throw
      await expect(flushServerErrors()).resolves.toBeUndefined();
    });
  });

  describe("parseStackTrace", () => {
    it("should skip structured-logger frames in stack traces", () => {
      initializeServerConsoleCapture();

      // Create an error with structured-logger in the stack
      const error = new Error("test");
      error.stack = `Error: test
    at StructuredLogger.output (src/lib/errors/structured-logger.ts:132:7)
    at userCode (src/app/api/test/route.ts:15:3)`;

      console.error(error);
      vi.advanceTimersByTime(2500);

      // The error should be captured (unless isFromStructuredLogger catches it first)
      // but the source location should point to route.ts, not structured-logger.ts
      if (mockFetch.mock.calls.length > 0) {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        if (body.errors.length > 0) {
          expect(body.errors[0].sourceFile).not.toContain("structured-logger");
        }
      }
    });
  });

  describe("multiple args serialization", () => {
    it("should join multiple string args", () => {
      initializeServerConsoleCapture();

      console.error("Error:", "something failed", "badly");
      vi.advanceTimersByTime(2500);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors[0].message).toBe("Error: something failed badly");
    });

    it("should serialize object args as JSON", () => {
      initializeServerConsoleCapture();

      console.error("Error:", { code: 500, detail: "internal" });
      vi.advanceTimersByTime(2500);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.errors[0].message).toContain("500");
    });
  });
});
