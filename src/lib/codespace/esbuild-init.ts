/**
 * Singleton initialization for esbuild-wasm.
 *
 * esbuild-wasm requires `initialize()` to be called once before
 * `transform()` or `build()` can be used. This module ensures
 * initialization happens exactly once.
 *
 * In the browser, we must pass `wasmURL` so esbuild can fetch the WASM
 * binary over HTTP. In Node.js, esbuild-wasm locates the binary via
 * the filesystem automatically, and passing `wasmURL` causes an error.
 */

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureEsbuildReady(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const esbuild = await import("esbuild-wasm");
    try {
      const isBrowser = typeof window !== "undefined";
      await esbuild.initialize({
        ...(isBrowser && {
          wasmURL: new URL("esbuild-wasm/esbuild.wasm", import.meta.url).href,
        }),
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
