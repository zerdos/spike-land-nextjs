/**
 * Error Reporter Service
 *
 * Handles error reporting from both frontend and backend.
 * - Frontend: batches and sends to /api/errors/report
 * - Backend: logs to console (actual DB write happens via server-only module)
 *
 * This module is frontend-safe (no Prisma imports).
 * For server-side DB writes, use error-reporter.server.ts
 */

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

/**
 * Detect if running in Vercel Workflow environment
 * Workflows have limited Node.js APIs and no HTTP server context
 */
function isWorkflowEnvironment(): boolean {
  if (typeof window !== "undefined") return false;
  return !!process.env.WORKFLOW_RUNTIME;
}

/**
 * Get base URL for server-side HTTP requests
 * Browser can use relative URLs, but server needs absolute URLs
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") return ""; // Browser can use relative URLs
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
}

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
    if (!line) continue;
    if (
      !line.includes("try-catch.ts") &&
      !line.includes("try-catch.js") &&
      !line.includes("error-reporter.ts") &&
      !line.includes("error-reporter.js") &&
      !line.includes("captureCallSite")
    ) {
      // Parse: "    at functionName (file:line:column)" or "    at file:line:column"
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
      if (match && match[2] && match[3] && match[4]) {
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
    console.error("[ErrorReporter] Failed to send errors:", e);
  }
}

/**
 * Report error on backend (console log only)
 * Actual DB write should be done via server-only module in API routes
 */
function reportErrorBackend(
  error: PendingError,
  environment: "FRONTEND" | "BACKEND",
): void {
  // Log to console for visibility
  console.error(
    `[ErrorReporter] ${environment} error:`,
    error.message,
    error.sourceFile ? `at ${error.sourceFile}:${error.sourceLine}` : "",
  );

  // For backend errors, we need to write to DB
  // But we can't import Prisma here (breaks client bundling)
  // So we send to our own API endpoint
  if (environment === "BACKEND") {
    // Skip HTTP calls in workflow environments (no server context, relative URLs fail)
    if (isWorkflowEnvironment()) {
      return;
    }

    // Fire-and-forget POST to our error API
    void fetch(`${getBaseUrl()}/api/errors/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errors: [{ ...error, environment: "BACKEND" }],
      }),
    }).catch((e) => {
      console.error("[ErrorReporter] Failed to report backend error:", e);
    });
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
    // Backend: log and report via API (fire-and-forget)
    reportErrorBackend(pendingError, "BACKEND");
  } else {
    // Frontend: queue for batching
    queueError(pendingError);
  }
}

// Flush on page unload (frontend only)
// Guard against test environments where window exists but lacks addEventListener
if (
  !isServer &&
  typeof window !== "undefined" &&
  typeof window.addEventListener === "function"
) {
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
