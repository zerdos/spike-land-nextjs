// API Gateway - main request router for spike.land nanoservices
// Routes incoming requests to the appropriate backend service.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const SECURITY_HEADERS = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const IMPORT_MAP = {
  imports: {
    "react": "https://esm.sh/react@19",
    "react-dom": "https://esm.sh/react-dom@19",
    "react-dom/client": "https://esm.sh/react-dom@19/client",
    "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
    "@emotion/react": "https://esm.sh/@emotion/react@11",
    "@emotion/styled": "https://esm.sh/@emotion/styled@11",
    "@emotion/cache": "https://esm.sh/@emotion/cache@11",
  },
};

function addHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries({ ...CORS_HEADERS, ...SECURITY_HEADERS, ...extra })) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
    },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

function resolveRoute(pathname) {
  // Exact matches
  if (pathname === "/ping") return { handler: "ping" };
  if (pathname === "/importMap.json") return { handler: "importMap" };
  if (pathname === "/websocket") return { service: "COLLAB" };
  if (pathname === "/transpile") return { service: "TRANSPILER" };

  // Prefix matches
  if (pathname.startsWith("/live/")) return { service: "COLLAB" };
  if (pathname.startsWith("/api-v1/")) return { service: "COLLAB" };
  if (pathname.startsWith("/api/room/")) return { service: "COLLAB" };
  if (pathname.startsWith("/auth/")) return { service: "AUTH_WORKER" };
  if (pathname.startsWith("/storage/")) return { service: "STORAGE_PROXY" };

  // MCP gateway
  if (pathname.startsWith("/mcp")) return { service: "MCP_GATEWAY" };

  // AI proxy routes
  if (pathname.startsWith("/openai")) return { service: "AI_PROXY" };
  if (pathname.startsWith("/anthropic")) return { service: "AI_PROXY" };
  if (pathname.startsWith("/whisper")) return { service: "AI_PROXY" };
  if (pathname.startsWith("/replicate")) return { service: "AI_PROXY" };
  if (pathname.startsWith("/summarize")) return { service: "AI_PROXY" };

  // Default: serve live editor UI via collab
  return { service: "COLLAB" };
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const route = resolveRoute(url.pathname);

    try {
      // Direct handlers (no service binding needed)
      if (route.handler === "ping") {
        return addHeaders(new Response("OK", { status: 200 }));
      }

      if (route.handler === "importMap") {
        return addHeaders(new Response(JSON.stringify(IMPORT_MAP, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }

      // Forward to the appropriate service binding
      const service = env[route.service];
      if (!service) {
        return errorResponse(`Service ${route.service} not configured`, 503);
      }

      const response = await service.fetch(request);
      return addHeaders(response);
    } catch (err) {
      console.error(`[api-gateway] Error routing ${url.pathname}:`, err);
      return errorResponse(`Internal gateway error: ${err.message}`, 502);
    }
  },
};
