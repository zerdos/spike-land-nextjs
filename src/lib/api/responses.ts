/**
 * Standardized API Response Utilities
 *
 * This module provides consistent HTTP response helpers for all API endpoints.
 * Use these utilities to ensure uniform error handling and response formats
 * across the spike.land platform.
 *
 * @see docs/best-practices/http-status-codes.md for usage guidelines
 */

import { NextResponse } from "next/server";

/**
 * Error codes for API responses
 */
export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: Record<string, string[]> | Record<string, unknown>;
}

/**
 * Validation error details type
 */
export type ValidationErrors = Record<string, string[]>;

/**
 * 400 Bad Request
 *
 * Use when the request is malformed and cannot be parsed or processed.
 *
 * @example
 * // Missing required field
 * if (!body.email) {
 *   return badRequest("Email is required");
 * }
 *
 * // Wrong data type
 * if (typeof body.amount !== "number") {
 *   return badRequest("Amount must be a number");
 * }
 */
export function badRequest(message: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.BAD_REQUEST,
    },
    { status: 400 },
  );
}

/**
 * 422 Unprocessable Entity
 *
 * Use when the request is well-formed but contains semantic validation errors.
 * Typically used with Zod schema validation failures.
 *
 * @example
 * // Zod validation
 * const result = schema.safeParse(body);
 * if (!result.success) {
 *   return validationError(result.error.flatten().fieldErrors);
 * }
 *
 * // Custom validation
 * if (password.length < 8) {
 *   return validationError({
 *     password: ["Password must be at least 8 characters"]
 *   });
 * }
 */
export function validationError(
  errors: ValidationErrors,
  message = "Validation failed",
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.VALIDATION_ERROR,
      details: errors,
    },
    { status: 422 },
  );
}

/**
 * 401 Unauthorized
 *
 * Use when the request lacks valid authentication credentials.
 *
 * @example
 * const session = await auth();
 * if (!session?.user) {
 *   return unauthorized();
 * }
 *
 * // With custom message
 * if (!isValidApiKey(apiKey)) {
 *   return unauthorized("Invalid API key");
 * }
 */
export function unauthorized(
  message = "Authentication required",
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.UNAUTHORIZED,
    },
    { status: 401 },
  );
}

/**
 * 403 Forbidden
 *
 * Use when the user is authenticated but lacks permission for the action.
 *
 * @example
 * // Not the resource owner
 * if (image.userId !== session.user.id) {
 *   return forbidden("You do not have permission to access this image");
 * }
 *
 * // Not an admin
 * if (session.user.role !== "ADMIN") {
 *   return forbidden("Admin access required");
 * }
 */
export function forbidden(
  message = "You do not have permission to access this resource",
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.FORBIDDEN,
    },
    { status: 403 },
  );
}

/**
 * 404 Not Found
 *
 * Use when the requested resource does not exist.
 *
 * @example
 * const image = await prisma.image.findUnique({ where: { id } });
 * if (!image) {
 *   return notFound("Image");
 * }
 *
 * // With custom message
 * return notFound("User with that email");
 */
export function notFound(resource = "Resource"): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: `${resource} not found`,
      code: ErrorCode.NOT_FOUND,
    },
    { status: 404 },
  );
}

/**
 * 409 Conflict
 *
 * Use when the request conflicts with the current state of the resource.
 *
 * @example
 * // Duplicate resource
 * if (existingUser) {
 *   return conflict("An account with this email already exists");
 * }
 *
 * // State conflict
 * if (order.status === "COMPLETED") {
 *   return conflict("Cannot cancel a completed order");
 * }
 */
export function conflict(message: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.CONFLICT,
    },
    { status: 409 },
  );
}

/**
 * 402 Payment Required
 *
 * Use when the request cannot be processed due to insufficient funds/tokens.
 *
 * @example
 * if (user.tokenBalance < cost) {
 *   return paymentRequired("Insufficient tokens", {
 *     required: cost,
 *     balance: user.tokenBalance
 *   });
 * }
 */
export function paymentRequired(
  message = "Insufficient tokens",
  details?: Record<string, unknown>,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.PAYMENT_REQUIRED,
      ...(details && { details }),
    },
    { status: 402 },
  );
}

/**
 * 429 Too Many Requests
 *
 * Use when the user has exceeded rate limits.
 *
 * @example
 * if (rateLimitResult.isLimited) {
 *   return rateLimited("Too many requests. Please try again later.", {
 *     retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
 *     limit: rateLimitResult.limit,
 *     remaining: rateLimitResult.remaining
 *   });
 * }
 */
export function rateLimited(
  message = "Too many requests. Please try again later.",
  options?: {
    retryAfter?: number;
    limit?: number;
    remaining?: number;
    resetAt?: number;
  },
): NextResponse<ErrorResponse> {
  const headers: Record<string, string> = {};

  if (options?.retryAfter) {
    headers["Retry-After"] = String(options.retryAfter);
  }
  if (options?.limit !== undefined) {
    headers["X-RateLimit-Limit"] = String(options.limit);
  }
  if (options?.remaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(options.remaining);
  }
  if (options?.resetAt !== undefined) {
    headers["X-RateLimit-Reset"] = String(options.resetAt);
  }

  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.RATE_LIMITED,
    },
    { status: 429, headers },
  );
}

/**
 * 500 Internal Server Error
 *
 * Use when an unexpected error occurs on the server.
 * Never expose internal error details to clients.
 *
 * @example
 * try {
 *   // operation
 * } catch (error) {
 *   console.error("Unexpected error:", error);
 *   return serverError();
 * }
 */
export function serverError(
  message = "An unexpected error occurred",
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCode.INTERNAL_ERROR,
    },
    { status: 500 },
  );
}

/**
 * Success response (200, 201, or 204)
 *
 * Use for successful operations that return data.
 *
 * @example
 * // 200 OK with data
 * return success({ user: userData });
 *
 * // 201 Created
 * const newImage = await prisma.image.create({ data });
 * return success({ image: newImage }, 201);
 *
 * // 200 with simple data
 * return success({ message: "Operation completed" });
 */
export function success<T>(data: T, status: 200 | 201 = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * 204 No Content
 *
 * Use when the operation succeeded but there's no content to return.
 *
 * @example
 * await prisma.image.delete({ where: { id } });
 * return noContent();
 */
export function noContent(): NextResponse<null> {
  return new NextResponse(null, { status: 204 });
}

/**
 * Generic error response builder for custom status codes
 *
 * Use when you need a status code not covered by the specific helpers.
 *
 * @example
 * return errorResponse("Service unavailable", "SERVICE_UNAVAILABLE", 503);
 */
export function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>,
): NextResponse<{ error: string; code: string; details?: Record<string, unknown>; }> {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details && { details }),
    },
    { status },
  );
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(
  response: unknown,
): response is ErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    "code" in response
  );
}

/**
 * Helper to extract error details from a caught error
 * Useful for consistent error logging
 */
export function getErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return {
    message: String(error),
  };
}
