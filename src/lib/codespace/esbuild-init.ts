/**
 * Singleton esbuild-wasm initializer.
 *
 * esbuild-wasm requires `initialize()` to be called exactly once before
 * any `transform()` or `build()` calls. This module ensures that happens
 * and caches the promise so concurrent callers share the same init.
 */

let initPromise: Promise<void> | null = null;

/**
 * Ensures esbuild-wasm is initialized. Safe to call multiple times —
 * only the first call triggers initialization; subsequent calls return
 * the cached promise. Resets on failure so the next call retries.
 */
export async function ensureEsbuildInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit().catch((err) => {
      // Reset so the next call retries instead of returning a stale rejection
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function doInit(): Promise<void> {
  const { initialize } = await import("esbuild-wasm");

  // In Node.js, esbuild-wasm auto-locates esbuild.wasm via __dirname.
  // We only need worker: false to avoid spawning a Worker thread
  // (which fails in serverless environments like Vercel).
  await initialize({ worker: false });
}
