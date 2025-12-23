import { describe, expect, it, vi } from "vitest";
import { createRetryWrapper, retryBatch, retryWithBackoff } from "./retry-logic";

describe("retry-logic", () => {
  describe("retryWithBackoff", () => {
    it("should succeed on first attempt", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await retryWithBackoff(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on transient failures", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue("success");

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max attempts", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("network error"));

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("network error");
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("invalid input"));

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        shouldRetry: (error) => error.message.includes("network"),
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should call onRetry callback", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue("success");

      const onRetry = vi.fn();

      await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledOnce();
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("should respect custom shouldRetry logic", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("503"))
        .mockRejectedValueOnce(new Error("404"))
        .mockResolvedValue("success");

      const shouldRetry = vi.fn((error: Error) => error.message === "503");

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        shouldRetry,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should handle non-Error rejections", async () => {
      const operation = vi.fn().mockRejectedValue("string error");

      const result = await retryWithBackoff(operation, {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("string error");
    });

    it("should apply exponential backoff", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue("success");

      const delays: number[] = [];
      const onRetry = vi.fn((_error, _attempt, delay) => {
        delays.push(delay);
      });

      await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        onRetry,
      });

      // First delay should be around 100ms, second around 200ms
      expect(delays[0]).toBeGreaterThan(50);
      expect(delays[0]).toBeLessThan(150);
      expect(delays[1]).toBeGreaterThan(150);
      expect(delays[1]).toBeLessThan(300);
    });

    it("should cap delay at maxDelayMs", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue("success");

      const delays: number[] = [];
      const onRetry = vi.fn((_error, _attempt, delay) => {
        delays.push(delay);
      });

      await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 500,
        backoffMultiplier: 10,
        onRetry,
      });

      // All delays should be capped at maxDelayMs
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(500);
      });
    });
  });

  describe("createRetryWrapper", () => {
    it("should create a wrapped function with retry logic", async () => {
      const originalFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue("success");

      const wrappedFn = createRetryWrapper(originalFn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      const result = await wrappedFn();

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(originalFn).toHaveBeenCalledTimes(2);
    });

    it("should pass arguments to wrapped function", async () => {
      const originalFn = vi
        .fn()
        .mockImplementation((a: number, b: number) => Promise.resolve(a + b));

      const wrappedFn = createRetryWrapper(originalFn);

      const result = await wrappedFn(5, 10);

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
      expect(originalFn).toHaveBeenCalledWith(5, 10);
    });
  });

  describe("retryBatch", () => {
    it("should retry multiple operations in parallel", async () => {
      const op1 = vi
        .fn()
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue("result1");
      const op2 = vi
        .fn()
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue("result2");
      const op3 = vi.fn().mockResolvedValue("result3");

      const results = await retryBatch([op1, op2, op3], {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(results).toHaveLength(3);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.data).toBe("result1");
      expect(results[1]!.success).toBe(true);
      expect(results[1]!.data).toBe("result2");
      expect(results[2]!.success).toBe(true);
      expect(results[2]!.data).toBe("result3");
    });

    it("should handle failures in batch", async () => {
      const op1 = vi.fn().mockResolvedValue("success");
      const op2 = vi.fn().mockRejectedValue(new Error("invalid input"));

      const results = await retryBatch([op1, op2], {
        maxAttempts: 2,
        initialDelayMs: 10,
        shouldRetry: () => false,
      });

      expect(results[0]!.success).toBe(true);
      expect(results[1]!.success).toBe(false);
    });

    it("should work with empty array", async () => {
      const results = await retryBatch([]);
      expect(results).toHaveLength(0);
    });
  });
});
