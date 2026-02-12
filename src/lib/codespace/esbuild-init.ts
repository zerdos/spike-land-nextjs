/**
 * Singleton esbuild-wasm initializer.
 *
 * esbuild-wasm requires `initialize()` to be called exactly once before
 * any `transform()` or `build()` calls. This module ensures that happens
 * and caches the promise so concurrent callers share the same init.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";

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

  // Locate the WASM binary relative to the esbuild-wasm package.
  // require.resolve finds the package entry, then we navigate to esbuild.wasm.
  let wasmPath: string;
  try {
    const esbuildEntry = require.resolve("esbuild-wasm");
    wasmPath = join(dirname(esbuildEntry), "esbuild.wasm");
  } catch {
    // Fallback: try relative to cwd (works locally and most Vercel setups)
    wasmPath = join(process.cwd(), "node_modules/esbuild-wasm/esbuild.wasm");
  }

  const wasmBinary = readFileSync(wasmPath);
  const wasmModule = await WebAssembly.compile(wasmBinary);

  await initialize({ wasmModule, worker: false });
}
