/**
 * Singleton initialization for esbuild-wasm.
 *
 * esbuild-wasm requires `initialize()` to be called once with a wasmURL
 * before `transform()` or `build()` can be used. This module ensures
 * initialization happens exactly once.
 */

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureEsbuildReady(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const esbuild = await import("esbuild-wasm");
    try {
      await esbuild.initialize({
        wasmURL: new URL(
          "esbuild-wasm/esbuild.wasm",
          import.meta.url,
        ).href,
        worker: false,
      });
    } catch (err) {
      // esbuild throws "Cannot call "initialize" more than once' if already init'd
      if (
        err instanceof Error &&
        err.message.includes("initialize")
      ) {
        // Already initialized — safe to continue
      } else {
        initPromise = null;
        throw err;
      }
    }
    initialized = true;
  })();

  return initPromise;
}

/** Reset state — only used for testing. */
export function resetEsbuild(): void {
  initialized = false;
  initPromise = null;
}
