// Transpiler Service - code transpilation for spike.land
// Ports the js.spike.land transpiler to a workerd nanoservice.

// TODO: Full esbuild-wasm integration
// esbuild-wasm setup in workerd requires special handling. For now, this uses
// a simplified pass-through transpiler. Replace with esbuild once the wasm
// module loading is configured.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

// Simplified transpiler that wraps code for ESM consumption.
// TODO: Replace with esbuild-wasm for proper JSX/TS transpilation.
async function transpile(code, options = {}) {
  const { origin = "", codeSpace = "" } = options;

  // TODO: Use esbuild with these settings:
  // {
  //   loader: "tsx",
  //   format: "esm",
  //   target: "es2024",
  //   jsxFactory: "React.createElement",
  //   jsxFragment: "React.Fragment",
  //   treeShaking: true,
  //   bundle: false,
  // }

  // For now, do minimal transformation:
  // - Strip TypeScript type annotations (very basic)
  // - Wrap in ESM format
  let result = code;

  // Basic type annotation stripping (handles simple cases only)
  // TODO: Remove this when esbuild is integrated
  result = result
    .replace(/:\s*(string|number|boolean|any|void|never|undefined|null)\b/g, "")
    .replace(/:\s*(string|number|boolean|any|void|never|undefined|null)\[\]/g, "")
    .replace(/<(string|number|boolean|any)>/g, "");

  return {
    code: result,
    warnings: ["Using simplified transpiler - esbuild-wasm not yet configured"],
  };
}

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

        // TODO: Fetch code from collab service via service binding
        // For now, return a placeholder since we do not have the binding in this direction
        return errorResponse("Direct code fetch not yet implemented - POST code instead", 501);
      }

      // POST /index.ts - transpile raw code from body
      if (pathname === "/index.ts" && request.method === "POST") {
        const code = await request.text();
        if (!code) {
          return errorResponse("Empty request body", 400);
        }

        const result = await transpile(code);
        return new Response(result.code, {
          headers: {
            "Content-Type": "application/javascript",
            "X-Transpiler-Warnings": JSON.stringify(result.warnings),
          },
        });
      }

      // POST /transpile - transpile with options
      if (pathname === "/transpile" && request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "";
        let code, origin;

        if (contentType.includes("application/json")) {
          const body = await request.json();
          code = body.code;
          origin = body.origin;
        } else {
          code = await request.text();
        }

        if (!code) {
          return errorResponse("No code provided", 400);
        }

        const result = await transpile(code, { origin });
        return jsonResponse({
          code: result.code,
          warnings: result.warnings,
        });
      }

      // Health check
      if (pathname === "/health") {
        return jsonResponse({ status: "ok", engine: "simplified" });
      }

      return errorResponse("Not found", 404);

    } catch (err) {
      console.error(`[transpiler] Error:`, err);
      return errorResponse(`Transpilation failed: ${err.message}`, 500);
    }
  },
};
