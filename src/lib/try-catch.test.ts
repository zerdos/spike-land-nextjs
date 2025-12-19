import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the error reporter module
const mockCaptureCallSite = vi.fn(() => ({
  file: "test-file.ts",
  line: 1,
  column: 1,
  caller: "testCaller",
}));
const mockReportError = vi.fn();

vi.mock("@/lib/errors/error-reporter", () => ({
  captureCallSite: mockCaptureCallSite,
  reportError: mockReportError,
}));

// Import after mocking
import { tryCatch, tryCatchSync } from "./try-catch";

describe("try-catch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("tryCatch (async)", () => {
    it("should return data on success", async () => {
      const promise = Promise.resolve("success");

      const result = await tryCatch(promise);

      expect(result.data).toBe("success");
      expect(result.error).toBeNull();
    });

    it("should return error on failure", async () => {
      const error = new Error("test error");
      const promise = Promise.reject(error);

      const result = await tryCatch(promise);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });

    it("should report errors by default", async () => {
      const error = new Error("test error");
      const promise = Promise.reject(error);

      await tryCatch(promise);

      expect(mockReportError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Object));
    });

    it("should not report errors when report is false", async () => {
      vi.clearAllMocks();
      const error = new Error("test error");
      const promise = Promise.reject(error);

      await tryCatch(promise, { report: false });

      expect(mockReportError).not.toHaveBeenCalled();
    });

    it("should include context in error report", async () => {
      const error = new Error("test error");
      const promise = Promise.reject(error);
      const context = {
        route: "/api/test",
        userId: "user-123",
      };

      await tryCatch(promise, { context, errorCode: "TEST_CODE" });

      expect(mockReportError).toHaveBeenCalledWith(
        error,
        expect.any(Object),
        expect.objectContaining({
          route: "/api/test",
          userId: "user-123",
          errorCode: "TEST_CODE",
        }),
      );
    });

    it("should handle non-Error throws", async () => {
      const promise = Promise.reject("string error");

      const result = await tryCatch(promise);

      expect(result.data).toBeNull();
      expect(result.error).toBe("string error");
    });
  });

  describe("tryCatchSync (sync)", () => {
    it("should return data on success", () => {
      const fn = () => "success";

      const result = tryCatchSync(fn);

      expect(result.data).toBe("success");
      expect(result.error).toBeNull();
    });

    it("should return error on failure", () => {
      const error = new Error("test error");
      const fn = () => {
        throw error;
      };

      const result = tryCatchSync(fn);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });

    it("should report errors by default when reporter is loaded", async () => {
      // First load the reporter by calling tryCatch
      await tryCatch(Promise.resolve("preload"));
      vi.clearAllMocks();

      const error = new Error("test error");
      const fn = () => {
        throw error;
      };

      tryCatchSync(fn);

      expect(mockReportError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Object));
    });

    it("should not report errors when report is false", async () => {
      vi.clearAllMocks();
      const error = new Error("test error");
      const fn = () => {
        throw error;
      };

      tryCatchSync(fn, { report: false });

      expect(mockReportError).not.toHaveBeenCalled();
    });
  });

  describe("backward compatibility", () => {
    it("should work without options parameter (async)", async () => {
      const result = await tryCatch(Promise.resolve("value"));

      expect(result.data).toBe("value");
      expect(result.error).toBeNull();
    });

    it("should work without options parameter (sync)", () => {
      const result = tryCatchSync(() => "value");

      expect(result.data).toBe("value");
      expect(result.error).toBeNull();
    });
  });
});
