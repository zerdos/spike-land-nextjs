/**
 * MCP Error Types and Classes
 *
 * Provides structured error handling for MCP generation jobs.
 * Uses error codes and properties instead of fragile regex message matching.
 *
 * @module mcp/errors
 */

/**
 * Error codes for MCP generation job failures.
 * These codes are used for:
 * - User-friendly error messages
 * - Retry logic decisions
 * - Error tracking and analytics
 */
export enum McpErrorCode {
  /** Request exceeded time limit */
  TIMEOUT = "TIMEOUT",
  /** Content violated safety/policy guidelines */
  CONTENT_POLICY = "CONTENT_POLICY",
  /** Too many requests or quota exceeded */
  RATE_LIMITED = "RATE_LIMITED",
  /** API key invalid or authentication failed */
  AUTH_ERROR = "AUTH_ERROR",
  /** Input image is invalid, corrupt, or unsupported */
  INVALID_IMAGE = "INVALID_IMAGE",
  /** Invalid input parameters */
  INVALID_INPUT = "INVALID_INPUT",
  /** Gemini API returned an error */
  GEMINI_API_ERROR = "GEMINI_API_ERROR",
  /** R2 storage upload failed */
  R2_UPLOAD_ERROR = "R2_UPLOAD_ERROR",
  /** General generation/processing failure */
  GENERATION_ERROR = "GENERATION_ERROR",
  /** Unknown or unclassified error */
  UNKNOWN = "UNKNOWN",
}

/**
 * User-friendly error messages for each error code.
 */
export const MCP_ERROR_MESSAGES: Record<McpErrorCode, string> = {
  [McpErrorCode.TIMEOUT]: "Generation took too long. Try a lower quality tier.",
  [McpErrorCode.CONTENT_POLICY]: "Your prompt may violate content policies. Please revise.",
  [McpErrorCode.RATE_LIMITED]: "Service temporarily unavailable. Please try again later.",
  [McpErrorCode.AUTH_ERROR]: "API configuration error. Please contact support.",
  [McpErrorCode.INVALID_IMAGE]: "Unable to process the image. Please try a different format.",
  [McpErrorCode.INVALID_INPUT]: "Invalid input parameters. Please check your request.",
  [McpErrorCode.GEMINI_API_ERROR]: "AI service error. Please try again in a moment.",
  [McpErrorCode.R2_UPLOAD_ERROR]: "Failed to save image. Please try again.",
  [McpErrorCode.GENERATION_ERROR]: "Generation failed. Please try again.",
  [McpErrorCode.UNKNOWN]: "An unexpected error occurred",
};

/**
 * Retryability configuration for each error code.
 * Indicates whether a job with this error code should be automatically retried.
 */
export const MCP_ERROR_RETRYABLE: Record<McpErrorCode, boolean> = {
  [McpErrorCode.TIMEOUT]: true,
  [McpErrorCode.CONTENT_POLICY]: false, // Same content will fail again
  [McpErrorCode.RATE_LIMITED]: true,
  [McpErrorCode.AUTH_ERROR]: false, // Config issue, won't fix itself
  [McpErrorCode.INVALID_IMAGE]: false, // Same image will fail again
  [McpErrorCode.INVALID_INPUT]: false, // Same input will fail again
  [McpErrorCode.GEMINI_API_ERROR]: true, // Transient API issues
  [McpErrorCode.R2_UPLOAD_ERROR]: true, // Transient storage issues
  [McpErrorCode.GENERATION_ERROR]: true, // May succeed on retry
  [McpErrorCode.UNKNOWN]: true, // Unknown errors may be transient
};

/**
 * Custom error class for MCP operations.
 * Provides structured error information including code, message, and retryability.
 *
 * @example
 * ```typescript
 * throw new McpError(
 *   "API rate limit exceeded",
 *   McpErrorCode.RATE_LIMITED,
 *   true, // retryable
 *   originalError
 * );
 * ```
 */
export class McpError extends Error {
  public readonly code: McpErrorCode;
  public readonly retryable: boolean;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: McpErrorCode,
    retryable?: boolean,
    cause?: Error,
  ) {
    super(message);
    this.name = "McpError";
    this.code = code;
    // Use provided retryable value or look up from config
    this.retryable = retryable ?? MCP_ERROR_RETRYABLE[code];
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, McpError);
    }
  }

  /**
   * Get the user-friendly message for this error.
   */
  getUserMessage(): string {
    return MCP_ERROR_MESSAGES[this.code];
  }

  /**
   * Convert to a plain object for serialization/logging.
   */
  toJSON(): {
    name: string;
    message: string;
    code: McpErrorCode;
    retryable: boolean;
    userMessage: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      userMessage: this.getUserMessage(),
    };
  }
}

/**
 * Result of error classification.
 * Contains the error code and user-friendly message.
 */
export interface ClassifiedError {
  /** The classified error code */
  code: McpErrorCode;
  /** User-friendly error message */
  message: string;
  /** Whether this error is retryable */
  retryable: boolean;
}
