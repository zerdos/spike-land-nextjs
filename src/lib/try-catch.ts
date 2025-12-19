/**
 * tryCatch Utility
 *
 * A functional error handling wrapper that returns { data, error } tuples.
 * Error reporting is ON by default - errors are automatically sent to the
 * error logging system for debugging and monitoring.
 *
 * Usage:
 *   // Default: errors are reported
 *   const { data, error } = await tryCatch(somePromise());
 *
 *   // Disable reporting for specific call
 *   const { data, error } = await tryCatch(somePromise(), { report: false });
 *
 *   // Add context for better debugging
 *   const { data, error } = await tryCatch(somePromise(), {
 *     context: { route: '/api/images', userId: session.user.id },
 *     errorCode: 'IMG_UPLOAD_FAILED',
 *   });
 */

import {
  type CallSite,
  captureCallSite,
  type ErrorReportContext,
  reportError,
} from "@/lib/errors/error-reporter";

// Types for the result object with discriminated union
interface Success<T> {
  data: T;
  error: null;
}

interface Failure<E> {
  data: null;
  error: E;
}

type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Options for tryCatch error reporting
 */
export interface TryCatchOptions {
  /**
   * Enable/disable error reporting. Default: true (ON BY DEFAULT)
   * Set to false to disable reporting for this specific call.
   */
  report?: boolean;

  /**
   * Additional context to include with error reports
   */
  context?: ErrorReportContext;

  /**
   * Custom error code for classification
   */
  errorCode?: string;
}

/**
 * Main wrapper function for async operations
 *
 * @param promise - The promise to wrap
 * @param options - Optional configuration for error reporting
 * @returns Result object with { data, error }
 */
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
  options?: TryCatchOptions,
): Promise<Result<T, E>> {
  // Determine if we should report (ON by default)
  const shouldReport = options?.report !== false;

  // Capture call site BEFORE awaiting (must be in the same call stack)
  let callSite: CallSite | null = null;
  if (shouldReport) {
    callSite = captureCallSite();
  }

  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    // Report error if enabled
    if (shouldReport && callSite && error instanceof Error) {
      reportError(error, callSite, {
        ...options?.context,
        errorCode: options?.errorCode,
      });
    }
    return { data: null, error: error as E };
  }
}

/**
 * Synchronous version for operations that don't return promises
 *
 * @param fn - The function to wrap
 * @param options - Optional configuration for error reporting
 * @returns Result object with { data, error }
 */
export function tryCatchSync<T, E = Error>(
  fn: () => T,
  options?: TryCatchOptions,
): Result<T, E> {
  // Determine if we should report (ON by default)
  const shouldReport = options?.report !== false;

  // Capture call site BEFORE executing (must be in the same call stack)
  let callSite: CallSite | null = null;
  if (shouldReport) {
    callSite = captureCallSite();
  }

  try {
    const data = fn();
    return { data, error: null };
  } catch (error) {
    // Report error if enabled
    if (shouldReport && callSite && error instanceof Error) {
      reportError(error, callSite, {
        ...options?.context,
        errorCode: options?.errorCode,
      });
    }
    return { data: null, error: error as E };
  }
}

// Re-export types for consumers
export type { Failure, Result, Success };
