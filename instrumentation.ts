/**
 * Next.js Instrumentation
 *
 * Runs once when the Next.js server starts.
 * Used to initialize server-side error capture.
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
  }
}
