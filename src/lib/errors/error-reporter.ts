/**
 * Error Reporter Service
 *
 * Handles error reporting from both frontend and backend.
 * - Frontend: batches and sends to /api/errors/report
 * - Backend: writes directly to database
 */

import type { ErrorEnvironment } from "@prisma/client";

export interface CallSite {
  file?: string;
  line?: number;
  column?: number;
  caller?: string;
}

export interface ErrorReportContext {
  route?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  errorCode?: string;
}

interface PendingError {
  message: string;
  stack?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  callerName?: string;
  errorType?: string;
  errorCode?: string;
  route?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// Detect environment
const isServer = typeof window === "undefined";

// Pending errors for batching (frontend only)
let pendingErrors: PendingError[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const BATCH_DELAY_MS = 5000; // 5 second debounce
const MAX_BATCH_SIZE = 10;

/**
 * Capture call site from stack trace
 * Returns the location where tryCatch was called
 */
export function captureCallSite(): CallSite {
  const stack = new Error().stack;
  if (!stack) return {};

  // Parse stack to find the caller of tryCatch
  // Stack format: "Error\n    at captureCallSite (...)\n    at tryCatch (...)\n    at ACTUAL_CALLER (...)"
  const lines = stack.split("\n");

  // Find the first line that's NOT from try-catch.ts or error-reporter.ts
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (
      !line.includes("try-catch.ts") &&
      !line.includes("try-catch.js") &&
      !line.includes("error-reporter.ts") &&
      !line.includes("error-reporter.js") &&
      !line.includes("captureCallSite")
    ) {
      // Parse: "    at functionName (file:line:column)" or "    at file:line:column"
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
      if (match) {
        return {
          caller: match[1] || undefined,
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
        };
      }
    }
  }
  return {};
}

/**
 * Queue error for batched sending (frontend)
 */
function queueError(error: PendingError): void {
  pendingErrors.push(error);

  // Flush immediately if batch is full
  if (pendingErrors.length >= MAX_BATCH_SIZE) {
    void flushErrors();
    return;
  }

  // Otherwise, debounce
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  flushTimeout = setTimeout(() => void flushErrors(), BATCH_DELAY_MS);
}

/**
 * Flush pending errors to the server (frontend)
 */
async function flushErrors(): Promise<void> {
  if (pendingErrors.length === 0) return;

  const errorsToSend = [...pendingErrors];
  pendingErrors = [];

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    await fetch("/api/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errors: errorsToSend }),
    });
  } catch (e) {
    // Silently fail - don't cause more errors
    // eslint-disable-next-line no-console
    console.error("[ErrorReporter] Failed to send errors:", e);
  }
}

/**
 * Report error directly to database (backend)
 */
async function reportErrorBackend(
  error: PendingError,
  environment: ErrorEnvironment,
): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const prisma = (await import("@/lib/prisma")).default;

    await prisma.errorLog.create({
      data: {
        message: error.message,
        stack: error.stack,
        sourceFile: error.sourceFile,
        sourceLine: error.sourceLine,
        sourceColumn: error.sourceColumn,
        callerName: error.callerName,
        errorType: error.errorType,
        errorCode: error.errorCode,
        route: error.route,
        userId: error.userId,
        environment,
        metadata: error.metadata
          ? JSON.parse(JSON.stringify(error.metadata))
          : null,
      },
    });
  } catch (e) {
    // Silently fail - don't cause more errors
    // eslint-disable-next-line no-console
    console.error("[ErrorReporter] Failed to save error to database:", e);
  }
}

/**
 * Main error reporting function
 * Call this from tryCatch when an error occurs
 */
export function reportError(
  error: Error,
  callSite: CallSite,
  context?: ErrorReportContext,
): void {
  const pendingError: PendingError = {
    message: error.message,
    stack: error.stack,
    sourceFile: callSite.file,
    sourceLine: callSite.line,
    sourceColumn: callSite.column,
    callerName: callSite.caller,
    errorType: error.name,
    errorCode: context?.errorCode,
    route: context?.route,
    userId: context?.userId,
    metadata: context?.metadata,
    timestamp: new Date().toISOString(),
  };

  if (isServer) {
    // Backend: report directly (fire-and-forget)
    void reportErrorBackend(pendingError, "BACKEND");
  } else {
    // Frontend: queue for batching
    queueError(pendingError);
  }
}

/**
 * Report error from API endpoint (for frontend errors received via POST)
 */
export async function reportErrorFromApi(
  error: PendingError,
): Promise<void> {
  try {
    const prisma = (await import("@/lib/prisma")).default;

    await prisma.errorLog.create({
      data: {
        message: error.message,
        stack: error.stack,
        sourceFile: error.sourceFile,
        sourceLine: error.sourceLine,
        sourceColumn: error.sourceColumn,
        callerName: error.callerName,
        errorType: error.errorType,
        errorCode: error.errorCode,
        route: error.route,
        userId: error.userId,
        environment: "FRONTEND",
        metadata: error.metadata
          ? JSON.parse(JSON.stringify(error.metadata))
          : null,
        timestamp: error.timestamp ? new Date(error.timestamp) : new Date(),
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ErrorReporter] Failed to save frontend error:", e);
    throw e; // Re-throw so the API can return an error response
  }
}

// Flush on page unload (frontend only)
if (!isServer && typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (pendingErrors.length > 0) {
      // Use sendBeacon for reliable delivery
      navigator.sendBeacon(
        "/api/errors/report",
        JSON.stringify({ errors: pendingErrors }),
      );
    }
  });
}
