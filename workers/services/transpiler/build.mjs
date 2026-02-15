// Build script: bundles the transpiler source + esbuild-wasm into a single
// workerd-compatible ES module. The esbuild WASM binary is handled separately
// (embedded as a wasmModule in the Cap'n Proto config).

import { build } from "esbuild";
import { cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bundle the transpiler source into a single ESM file
await build({
  entryPoints: [resolve(__dirname, "src/index.js")],
  outfile: resolve(__dirname, "index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2024",
  minify: false,
  external: ["esbuild-wasm-module"], // Will be provided as a WASM import
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

// Copy the esbuild WASM binary from node_modules to the service directory
const wasmSource = resolve(__dirname, "node_modules/esbuild-wasm/esbuild.wasm");
const wasmDest = resolve(__dirname, "esbuild.wasm");

if (existsSync(wasmSource) && !existsSync(wasmDest)) {
  cpSync(wasmSource, wasmDest);
  console.log("[build] Copied esbuild.wasm to transpiler service directory");
}

console.log("[build] Transpiler bundle complete → index.js");
