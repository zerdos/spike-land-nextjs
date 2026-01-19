/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import {
  badRequest,
  conflict,
  ErrorCode,
  errorResponse,
  forbidden,
  getErrorDetails,
  isErrorResponse,
  noContent,
  notFound,
  paymentRequired,
  rateLimited,
  serverError,
  success,
  unauthorized,
  validationError,
} from "./responses";

describe("API Response Utilities", () => {
  describe("badRequest", () => {
    it("returns 400 status with error message", async () => {
      const response = badRequest("Invalid input");
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: "Invalid input",
        code: ErrorCode.BAD_REQUEST,
      });
    });
  });

  describe("validationError", () => {
    it("returns 422 status with field errors", async () => {
      const errors = {
        email: ["Invalid email format"],
        password: ["Password too short", "Password must contain number"],
      };
      const response = validationError(errors);
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body).toEqual({
        error: "Validation failed",
        code: ErrorCode.VALIDATION_ERROR,
        details: errors,
      });
    });

    it("accepts custom message", async () => {
      const response = validationError(
        { field: ["error"] },
        "Custom validation message",
      );
      const body = await response.json();

      expect(body.error).toBe("Custom validation message");
    });
  });

  describe("unauthorized", () => {
    it("returns 401 status with default message", async () => {
      const response = unauthorized();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        error: "Authentication required",
        code: ErrorCode.UNAUTHORIZED,
      });
    });

    it("accepts custom message", async () => {
      const response = unauthorized("Invalid API key");
      const body = await response.json();

      expect(body.error).toBe("Invalid API key");
    });
  });

  describe("forbidden", () => {
    it("returns 403 status with default message", async () => {
      const response = forbidden();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({
        error: "You do not have permission to access this resource",
        code: ErrorCode.FORBIDDEN,
      });
    });

    it("accepts custom message", async () => {
      const response = forbidden("Admin access required");
      const body = await response.json();

      expect(body.error).toBe("Admin access required");
    });
  });

  describe("notFound", () => {
    it("returns 404 status with default resource", async () => {
      const response = notFound();
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({
        error: "Resource not found",
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("accepts custom resource name", async () => {
      const response = notFound("Image");
      const body = await response.json();

      expect(body.error).toBe("Image not found");
    });
  });

  describe("conflict", () => {
    it("returns 409 status with message", async () => {
      const response = conflict("Email already exists");
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body).toEqual({
        error: "Email already exists",
        code: ErrorCode.CONFLICT,
      });
    });
  });

  describe("paymentRequired", () => {
    it("returns 402 status with default message", async () => {
      const response = paymentRequired();
      const body = await response.json();

      expect(response.status).toBe(402);
      expect(body).toEqual({
        error: "Insufficient tokens",
        code: ErrorCode.PAYMENT_REQUIRED,
      });
    });

    it("accepts custom message and details", async () => {
      const response = paymentRequired("Not enough credits", {
        required: 100,
        balance: 50,
      });
      const body = await response.json();

      expect(body).toEqual({
        error: "Not enough credits",
        code: ErrorCode.PAYMENT_REQUIRED,
        details: { required: 100, balance: 50 },
      });
    });
  });

  describe("rateLimited", () => {
    it("returns 429 status with default message", async () => {
      const response = rateLimited();
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body).toEqual({
        error: "Too many requests. Please try again later.",
        code: ErrorCode.RATE_LIMITED,
      });
    });

    it("accepts custom message", async () => {
      const response = rateLimited("Slow down!");
      const body = await response.json();

      expect(body.error).toBe("Slow down!");
    });

    it("sets rate limit headers when options provided", async () => {
      const response = rateLimited("Rate limited", {
        retryAfter: 60,
        limit: 100,
        remaining: 0,
        resetAt: 1640000000,
      });

      expect(response.headers.get("Retry-After")).toBe("60");
      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBe("1640000000");
    });

    it("only sets headers for provided options", async () => {
      const response = rateLimited("Rate limited", {
        retryAfter: 30,
      });

      expect(response.headers.get("Retry-After")).toBe("30");
      expect(response.headers.get("X-RateLimit-Limit")).toBeNull();
    });
  });

  describe("serverError", () => {
    it("returns 500 status with default message", async () => {
      const response = serverError();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        error: "An unexpected error occurred",
        code: ErrorCode.INTERNAL_ERROR,
      });
    });

    it("accepts custom message", async () => {
      const response = serverError("Database connection failed");
      const body = await response.json();

      expect(body.error).toBe("Database connection failed");
    });
  });

  describe("success", () => {
    it("returns 200 status by default", async () => {
      const data = { user: { id: "123", name: "John" } };
      const response = success(data);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
    });

    it("accepts 201 status for created resources", async () => {
      const data = { image: { id: "new-image" } };
      const response = success(data, 201);

      expect(response.status).toBe(201);
    });
  });

  describe("noContent", () => {
    it("returns 204 status with null body", () => {
      const response = noContent();

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });

  describe("errorResponse", () => {
    it("returns custom status code and error code", async () => {
      const response = errorResponse(
        "Service unavailable",
        "SERVICE_UNAVAILABLE",
        503,
      );
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toEqual({
        error: "Service unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    });

    it("includes details when provided", async () => {
      const response = errorResponse("Custom error", "CUSTOM", 418, {
        reason: "I'm a teapot",
      });
      const body = await response.json();

      expect(body.details).toEqual({ reason: "I'm a teapot" });
    });
  });

  describe("isErrorResponse", () => {
    it("returns true for valid error response objects", () => {
      expect(
        isErrorResponse({ error: "test", code: ErrorCode.BAD_REQUEST }),
      ).toBe(true);
    });

    it("returns false for null", () => {
      expect(isErrorResponse(null)).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(isErrorResponse("string")).toBe(false);
      expect(isErrorResponse(123)).toBe(false);
      expect(isErrorResponse(undefined)).toBe(false);
    });

    it("returns false for objects without error property", () => {
      expect(isErrorResponse({ code: ErrorCode.BAD_REQUEST })).toBe(false);
    });

    it("returns false for objects without code property", () => {
      expect(isErrorResponse({ error: "test" })).toBe(false);
    });

    it("returns true for error response with details", () => {
      expect(
        isErrorResponse({
          error: "test",
          code: ErrorCode.VALIDATION_ERROR,
          details: { field: ["error"] },
        }),
      ).toBe(true);
    });
  });

  describe("getErrorDetails", () => {
    it("extracts details from Error instance", () => {
      const error = new Error("Test error");
      const details = getErrorDetails(error);

      expect(details.message).toBe("Test error");
      expect(details.name).toBe("Error");
      expect(details.stack).toBeDefined();
    });

    it("extracts details from TypeError", () => {
      const error = new TypeError("Type error");
      const details = getErrorDetails(error);

      expect(details.message).toBe("Type error");
      expect(details.name).toBe("TypeError");
    });

    it("handles string errors", () => {
      const details = getErrorDetails("String error");

      expect(details.message).toBe("String error");
      expect(details.stack).toBeUndefined();
      expect(details.name).toBeUndefined();
    });

    it("handles number errors", () => {
      const details = getErrorDetails(404);

      expect(details.message).toBe("404");
    });

    it("handles undefined", () => {
      const details = getErrorDetails(undefined);

      expect(details.message).toBe("undefined");
    });

    it("handles null", () => {
      const details = getErrorDetails(null);

      expect(details.message).toBe("null");
    });

    it("handles object errors", () => {
      const details = getErrorDetails({ custom: "error" });

      expect(details.message).toBe("[object Object]");
    });
  });

  describe("ErrorCode constants", () => {
    it("has all expected error codes", () => {
      expect(ErrorCode.BAD_REQUEST).toBe("BAD_REQUEST");
      expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
      expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCode.CONFLICT).toBe("CONFLICT");
      expect(ErrorCode.PAYMENT_REQUIRED).toBe("PAYMENT_REQUIRED");
      expect(ErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
      expect(ErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    });
  });
});
