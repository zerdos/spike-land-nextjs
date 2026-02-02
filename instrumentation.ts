/**
 * Next.js Instrumentation
 *
 * Runs once when the Next.js server starts.
 * Used to initialize server-side error capture and the vibe watcher.
 *
 * Note: As of Next.js 16.x, instrumentation.ts is supported natively without
 * requiring the experimental.instrumentationHook flag in next.config.ts.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeServerConsoleCapture } = await import(
      "@/lib/errors/console-capture.server"
    );
    initializeServerConsoleCapture();

    // Start vibe watcher in development mode
    if (process.env.NODE_ENV === "development") {
      const { startVibeWatcher } = await import("@/lib/vibe-watcher");
      startVibeWatcher();
    }
  }
}
