/**
 * Social Media API Error Types
 *
 * Standardized error handling for social media platform APIs.
 * Provides categorized errors for authentication, rate limiting, and other failures.
 */

import type { SocialPlatform } from "@prisma/client";

/**
 * Type of social media authentication error
 */
export type SocialAuthErrorType =
  | "expired" // Token has expired
  | "invalid" // Token is invalid or revoked
  | "permissions" // Insufficient permissions/scopes
  | "quota" // API quota exceeded
  | "suspended"; // Account suspended or restricted

/**
 * Custom error class for social media authentication failures
 *
 * This error type helps distinguish different failure modes and whether they're recoverable.
 * Recoverable errors (like expired tokens) can trigger automatic refresh flows.
 */
export class SocialAuthError extends Error {
  /**
   * The social media platform where the error occurred
   */
  public readonly platform: SocialPlatform;

  /**
   * The category of authentication error
   */
  public readonly errorType: SocialAuthErrorType;

  /**
   * Whether this error can be automatically recovered from
   * (e.g., expired token → trigger refresh)
   */
  public readonly recoverable: boolean;

  /**
   * Original error code from the platform API (if available)
   */
  public readonly platformErrorCode?: string;

  /**
   * HTTP status code from the API response (if available)
   */
  public readonly statusCode?: number;

  constructor(
    message: string,
    platform: SocialPlatform,
    errorType: SocialAuthErrorType,
    options?: {
      recoverable?: boolean;
      platformErrorCode?: string;
      statusCode?: number;
    },
  ) {
    super(message);
    this.name = "SocialAuthError";
    this.platform = platform;
    this.errorType = errorType;
    this.recoverable = options?.recoverable ?? (errorType === "expired");
    this.platformErrorCode = options?.platformErrorCode;
    this.statusCode = options?.statusCode;
  }
}

/**
 * Custom error class for rate limit errors
 *
 * Rate limits are temporary and include retry information.
 */
export class SocialRateLimitError extends Error {
  /**
   * The social media platform where rate limit was hit
   */
  public readonly platform: SocialPlatform;

  /**
   * When the rate limit will reset (if known)
   */
  public readonly resetAt?: Date;

  /**
   * Number of seconds to wait before retrying (if provided by API)
   */
  public readonly retryAfter?: number;

  /**
   * Remaining quota (if provided by API)
   */
  public readonly remaining?: number;

  /**
   * Total quota limit (if provided by API)
   */
  public readonly limit?: number;

  constructor(
    message: string,
    platform: SocialPlatform,
    options?: {
      resetAt?: Date;
      retryAfter?: number;
      remaining?: number;
      limit?: number;
    },
  ) {
    super(message);
    this.name = "SocialRateLimitError";
    this.platform = platform;
    this.resetAt = options?.resetAt;
    this.retryAfter = options?.retryAfter;
    this.remaining = options?.remaining;
    this.limit = options?.limit;
  }
}

/**
 * Helper function to detect if an error is a rate limit error from common HTTP responses
 *
 * @param status - HTTP status code
 * @param errorData - Error response body from API
 * @returns true if this appears to be a rate limit error
 */
export function isRateLimitResponse(
  status: number,
  errorData?: Record<string, unknown>,
): boolean {
  // HTTP 429 Too Many Requests
  if (status === 429) return true;

  // Some platforms use 403 with specific error codes
  if (status === 403 && errorData) {
    const code = String(errorData["code"] || errorData["error"] || "").toLowerCase();
    return code.includes("rate") || code.includes("quota") ||
      code.includes("limit");
  }

  return false;
}

/**
 * Helper function to detect if an error is an auth error from common HTTP responses
 *
 * @param status - HTTP status code
 * @param errorData - Error response body from API
 * @returns Auth error type if detected, null otherwise
 */
export function detectAuthErrorType(
  status: number,
  errorData?: Record<string, unknown>,
): SocialAuthErrorType | null {
  // HTTP 401 Unauthorized - usually invalid or expired token
  if (status === 401) {
    const code = String(errorData?.["code"] || errorData?.["error"] || "").toLowerCase();
    if (code.includes("expired")) return "expired";
    return "invalid";
  }

  // HTTP 403 Forbidden - could be permissions or suspension
  if (status === 403) {
    const code = String(errorData?.["code"] || errorData?.["error"] || "").toLowerCase();
    const message = String(
      errorData?.["message"] || errorData?.["error_description"] || "",
    ).toLowerCase();

    if (code.includes("permission") || code.includes("scope")) {
      return "permissions";
    }
    if (
      code.includes("suspend") || code.includes("banned") ||
      message.includes("suspend")
    ) {
      return "suspended";
    }
    return "permissions"; // Default to permissions for 403
  }

  return null;
}

/**
 * Parse retry-after header from rate limit response
 *
 * @param retryAfterHeader - Value of Retry-After header (seconds or HTTP date)
 * @returns Number of seconds to wait, or undefined if header is invalid
 */
export function parseRetryAfter(retryAfterHeader?: string): number | undefined {
  if (!retryAfterHeader) return undefined;

  // Try parsing as integer (seconds)
  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds)) return seconds;

  // Try parsing as HTTP date
  const date = new Date(retryAfterHeader);
  if (!isNaN(date.getTime())) {
    const secondsUntil = Math.max(
      0,
      Math.ceil((date.getTime() - Date.now()) / 1000),
    );
    return secondsUntil;
  }

  return undefined;
}
