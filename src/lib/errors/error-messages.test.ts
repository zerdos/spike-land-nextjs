import { describe, expect, it } from "vitest";
import {
  detectErrorCode,
  ERROR_MESSAGES,
  getUserFriendlyError,
  isRetryableError,
  type ErrorCode,
} from "./error-messages";

describe("error-messages", () => {
  describe("ERROR_MESSAGES", () => {
    it("should have messages for all error codes", () => {
      const errorCodes: ErrorCode[] = [
        "NETWORK_ERROR",
        "TIMEOUT",
        "RATE_LIMIT",
        "INSUFFICIENT_TOKENS",
        "UNAUTHORIZED",
        "FORBIDDEN",
        "NOT_FOUND",
        "INVALID_INPUT",
        "FILE_TOO_LARGE",
        "UNSUPPORTED_FILE_TYPE",
        "PROCESSING_FAILED",
        "UPLOAD_FAILED",
        "DOWNLOAD_FAILED",
        "DATABASE_ERROR",
        "EXTERNAL_SERVICE_ERROR",
        "UNKNOWN_ERROR",
      ];

      errorCodes.forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(ERROR_MESSAGES[code].title).toBeTruthy();
        expect(ERROR_MESSAGES[code].message).toBeTruthy();
        expect(typeof ERROR_MESSAGES[code].retryable).toBe("boolean");
      });
    });
  });

  describe("detectErrorCode", () => {
    it("should detect UNAUTHORIZED from status code 401", () => {
      expect(detectErrorCode(new Error("test"), 401)).toBe("UNAUTHORIZED");
    });

    it("should detect FORBIDDEN from status code 403", () => {
      expect(detectErrorCode(new Error("test"), 403)).toBe("FORBIDDEN");
    });

    it("should detect NOT_FOUND from status code 404", () => {
      expect(detectErrorCode(new Error("test"), 404)).toBe("NOT_FOUND");
    });

    it("should detect INSUFFICIENT_TOKENS from status code 402", () => {
      expect(detectErrorCode(new Error("test"), 402)).toBe("INSUFFICIENT_TOKENS");
    });

    it("should detect RATE_LIMIT from status code 429", () => {
      expect(detectErrorCode(new Error("test"), 429)).toBe("RATE_LIMIT");
    });

    it("should detect EXTERNAL_SERVICE_ERROR from 5xx status codes", () => {
      expect(detectErrorCode(new Error("test"), 500)).toBe("EXTERNAL_SERVICE_ERROR");
      expect(detectErrorCode(new Error("test"), 502)).toBe("EXTERNAL_SERVICE_ERROR");
      expect(detectErrorCode(new Error("test"), 503)).toBe("EXTERNAL_SERVICE_ERROR");
    });

    it("should detect NETWORK_ERROR from error message", () => {
      expect(detectErrorCode(new Error("network error"))).toBe("NETWORK_ERROR");
      expect(detectErrorCode(new Error("fetch failed"))).toBe("NETWORK_ERROR");
      expect(detectErrorCode(new Error("ENOTFOUND"))).toBe("NETWORK_ERROR");
      expect(detectErrorCode(new Error("ECONNREFUSED"))).toBe("NETWORK_ERROR");
    });

    it("should detect TIMEOUT from error message", () => {
      expect(detectErrorCode(new Error("timeout"))).toBe("TIMEOUT");
      expect(detectErrorCode(new Error("request timed out"))).toBe("TIMEOUT");
    });

    it("should detect RATE_LIMIT from error message", () => {
      expect(detectErrorCode(new Error("rate limit exceeded"))).toBe("RATE_LIMIT");
      expect(detectErrorCode(new Error("too many requests"))).toBe("RATE_LIMIT");
    });

    it("should detect INSUFFICIENT_TOKENS from error message", () => {
      expect(detectErrorCode(new Error("insufficient tokens"))).toBe("INSUFFICIENT_TOKENS");
      expect(detectErrorCode(new Error("not enough tokens"))).toBe("INSUFFICIENT_TOKENS");
    });

    it("should detect FILE_TOO_LARGE from error message", () => {
      expect(detectErrorCode(new Error("file too large"))).toBe("FILE_TOO_LARGE");
      expect(detectErrorCode(new Error("exceeds maximum size"))).toBe("FILE_TOO_LARGE");
    });

    it("should detect UNSUPPORTED_FILE_TYPE from error message", () => {
      expect(detectErrorCode(new Error("unsupported file type"))).toBe(
        "UNSUPPORTED_FILE_TYPE",
      );
      expect(detectErrorCode(new Error("invalid file type"))).toBe(
        "UNSUPPORTED_FILE_TYPE",
      );
    });

    it("should detect DATABASE_ERROR from error message", () => {
      expect(detectErrorCode(new Error("database connection failed"))).toBe(
        "DATABASE_ERROR",
      );
      expect(detectErrorCode(new Error("prisma error"))).toBe("DATABASE_ERROR");
      expect(detectErrorCode(new Error("transaction failed"))).toBe("DATABASE_ERROR");
    });

    it("should detect PROCESSING_FAILED from error message", () => {
      expect(detectErrorCode(new Error("enhancement failed"))).toBe(
        "PROCESSING_FAILED",
      );
      expect(detectErrorCode(new Error("processing failed"))).toBe(
        "PROCESSING_FAILED",
      );
    });

    it("should return UNKNOWN_ERROR for unrecognized errors", () => {
      expect(detectErrorCode(new Error("something weird happened"))).toBe(
        "UNKNOWN_ERROR",
      );
    });

    it("should handle string errors", () => {
      expect(detectErrorCode("network error")).toBe("NETWORK_ERROR");
      expect(detectErrorCode("timeout")).toBe("TIMEOUT");
    });
  });

  describe("getUserFriendlyError", () => {
    it("should return user-friendly error for NETWORK_ERROR", () => {
      const result = getUserFriendlyError(new Error("fetch failed"));
      expect(result.title).toBe("Connection Problem");
      expect(result.message).toContain("trouble connecting");
      expect(result.suggestion).toBeTruthy();
      expect(result.retryable).toBe(true);
    });

    it("should return user-friendly error for INSUFFICIENT_TOKENS", () => {
      const result = getUserFriendlyError(new Error("insufficient tokens"), 402);
      expect(result.title).toBe("Not Enough Tokens");
      expect(result.message).toContain("don't have enough tokens");
      expect(result.retryable).toBe(false);
    });

    it("should return user-friendly error for UNAUTHORIZED", () => {
      const result = getUserFriendlyError(new Error("unauthorized"), 401);
      expect(result.title).toBe("Authentication Required");
      expect(result.retryable).toBe(false);
    });

    it("should return user-friendly error for RATE_LIMIT", () => {
      const result = getUserFriendlyError(new Error("too many requests"), 429);
      expect(result.title).toBe("Too Many Requests");
      expect(result.retryable).toBe(true);
    });

    it("should handle string errors", () => {
      const result = getUserFriendlyError("network error");
      expect(result.title).toBe("Connection Problem");
    });
  });

  describe("isRetryableError", () => {
    it("should return true for retryable errors", () => {
      expect(isRetryableError(new Error("network error"))).toBe(true);
      expect(isRetryableError(new Error("timeout"))).toBe(true);
      expect(isRetryableError(new Error("rate limit"))).toBe(true);
      expect(isRetryableError(new Error("processing failed"))).toBe(true);
    });

    it("should return false for non-retryable errors", () => {
      expect(isRetryableError(new Error("unauthorized"), 401)).toBe(false);
      expect(isRetryableError(new Error("insufficient tokens"), 402)).toBe(false);
      expect(isRetryableError(new Error("not found"), 404)).toBe(false);
      expect(isRetryableError(new Error("invalid input"), 400)).toBe(false);
    });
  });
});
