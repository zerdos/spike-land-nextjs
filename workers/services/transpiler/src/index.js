// Transpiler Service - esbuild-wasm powered code transpilation for spike.land
// Ported from packages/js.spike.land to run as a workerd nanoservice.
//
// Uses esbuild-wasm's transform() API for JSX/TypeScript transpilation.
// The esbuild WASM binary is loaded as a module declared in config.capnp.

import { initialize, transform } from "esbuild-wasm";
import wasmModule from "esbuild-wasm-module";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let initialized = false;
let initPromise = null;

async function ensureInitialized() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await initialize({ wasmModule, worker: false });
      initialized = true;
    } catch (err) {
      // esbuild throws if initialize() is called twice
      if (err.message?.includes("already been called")) {
        initialized = true;
      } else {
        initPromise = null;
        throw err;
      }
    }
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Transform options matching the original spike.land transpiler
// ---------------------------------------------------------------------------

const TRANSFORM_OPTIONS = {
  loader: "tsx",
  format: "esm",
  treeShaking: true,
  platform: "browser",
  minify: false,
  charset: "utf8",
  keepNames: true,
  target: "es2024",
  tsconfigRaw: {
    compilerOptions: {
      jsx: "react-jsx",
      jsxFragmentFactory: "Fragment",
      jsxImportSource: "@emotion/react",
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

function jsResponse(code) {
  return new Response(code, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "no-cache",
    },
  });
}

// ---------------------------------------------------------------------------
// Core transpilation
// ---------------------------------------------------------------------------

async function transpileCode(code, options = {}) {
  await ensureInitialized();

  const opts = {
    ...TRANSFORM_OPTIONS,
    ...options,
  };

  const result = await transform(code, opts);
  return {
    code: result.code,
    warnings: result.warnings?.map(w => w.text) || [],
  };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      // GET /index.ts?codeSpace={id}&origin={origin}
      // Fetch code from the collab service and transpile it
      if (pathname === "/index.ts" && request.method === "GET") {
        const codeSpace = url.searchParams.get("codeSpace");
        const origin = url.searchParams.get("origin") || url.origin;

        if (!codeSpace) {
          return errorResponse("Missing codeSpace parameter", 400);
        }

        // Fetch source code from collab service via origin
        try {
          const codeUrl = `${origin}/api-v1/${codeSpace}/code`;
          const codeResp = await fetch(codeUrl);
          if (!codeResp.ok) {
            return errorResponse(`Failed to fetch code for ${codeSpace}: ${codeResp.status}`, 502);
          }
          const code = await codeResp.text();
          const result = await transpileCode(code);
          return jsResponse(result.code);
        } catch (err) {
          return errorResponse(`Failed to fetch/transpile: ${err.message}`, 502);
        }
      }

      // POST /index.ts - transpile raw code from request body
      if (pathname === "/index.ts" && request.method === "POST") {
        const code = await request.text();
        if (!code) {
          return errorResponse("Empty request body", 400);
        }

        const result = await transpileCode(code);
        return jsResponse(result.code);
      }

      // POST /transpile - transpile with options (JSON body)
      if (pathname === "/transpile" && request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "";
        let code, options;

        if (contentType.includes("application/json")) {
          const body = await request.json();
          code = body.code;
          options = {};
          if (body.loader) options.loader = body.loader;
          if (body.minify !== undefined) options.minify = body.minify;
          if (body.format) options.format = body.format;
          if (body.target) options.target = body.target;
        } else {
          code = await request.text();
          options = {};
        }

        if (!code) {
          return errorResponse("No code provided", 400);
        }

        const result = await transpileCode(code, options);
        return jsonResponse({
          code: result.code,
          warnings: result.warnings,
        });
      }

      // Health check
      if (pathname === "/health") {
        await ensureInitialized();
        return jsonResponse({ status: "ok", engine: "esbuild-wasm", initialized });
      }

      return errorResponse("Not found", 404);

    } catch (err) {
      console.error("[transpiler] Error:", err);
      return errorResponse(`Transpilation failed: ${err.message}`, 500);
    }
  },
};
