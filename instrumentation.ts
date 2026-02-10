/**
 * Next.js Instrumentation
 *
 * Runs once when the Next.js server starts.
 * Used to initialize Sentry, server-side error capture, and the vibe watcher.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    const { initializeServerConsoleCapture, flushServerErrors } = await import(
      "@/lib/errors/console-capture.server"
    );
    initializeServerConsoleCapture();

    // Flush pending errors on shutdown
    const handleShutdown = () => {
      const timeout = setTimeout(() => process.exit(0), 3000);
      if (timeout.unref) timeout.unref();
      flushServerErrors().finally(() => {
        clearTimeout(timeout);
        process.exit(0);
      });
    };
    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);

    // Start vibe watcher in development mode
    if (process.env.NODE_ENV === "development") {
      const { startVibeWatcher } = await import("@/lib/vibe-watcher");
      startVibeWatcher();
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
