// AI Proxy Service - forwards requests to OpenAI, Anthropic, Replicate
// Adds API keys from environment, handles CORS, and logs request metadata.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

// Strip hop-by-hop headers that should not be forwarded
const HOP_HEADERS = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade",
]);

function forwardHeaders(request, extra = {}) {
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    if (!HOP_HEADERS.has(k.toLowerCase())) {
      headers.set(k, v);
    }
  }
  // Remove origin/host headers to avoid CORS issues with upstream
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  for (const [k, v] of Object.entries(extra)) {
    headers.set(k, v);
  }
  return headers;
}

function logRequest(pathname, upstream, startTime) {
  const duration = Date.now() - startTime;
  console.log(`[ai-proxy] ${pathname} -> ${upstream} (${duration}ms)`);
}

// ---------------------------------------------------------------------------
// Proxy helpers
// ---------------------------------------------------------------------------

async function proxyToOpenAI(request, subpath, env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return errorResponse("OPENAI_API_KEY not configured", 503);

  const upstream = `https://api.openai.com${subpath}`;
  const headers = forwardHeaders(request, {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": request.headers.get("Content-Type") || "application/json",
  });

  const startTime = Date.now();
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method !== "GET" ? request.body : undefined,
  });
  logRequest("/openai" + subpath, upstream, startTime);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

async function proxyToAnthropic(request, subpath, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return errorResponse("ANTHROPIC_API_KEY not configured", 503);

  const upstream = `https://api.anthropic.com${subpath}`;
  const headers = forwardHeaders(request, {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": request.headers.get("Content-Type") || "application/json",
  });

  const startTime = Date.now();
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method !== "GET" ? request.body : undefined,
  });
  logRequest("/anthropic" + subpath, upstream, startTime);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

async function proxyToReplicate(request, subpath, env) {
  const token = env.REPLICATE_API_TOKEN;
  if (!token) return errorResponse("REPLICATE_API_TOKEN not configured", 503);

  const upstream = `https://api.replicate.com${subpath}`;
  const headers = forwardHeaders(request, {
    "Authorization": `Token ${token}`,
    "Content-Type": request.headers.get("Content-Type") || "application/json",
  });

  const startTime = Date.now();
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method !== "GET" ? request.body : undefined,
  });
  logRequest("/replicate" + subpath, upstream, startTime);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

async function handleWhisper(request, env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return errorResponse("OPENAI_API_KEY not configured", 503);

  const upstream = "https://api.openai.com/v1/audio/transcriptions";
  const headers = forwardHeaders(request, {
    "Authorization": `Bearer ${apiKey}`,
  });
  // Whisper expects multipart/form-data, so preserve the original Content-Type
  if (request.headers.has("Content-Type")) {
    headers.set("Content-Type", request.headers.get("Content-Type"));
  }

  const startTime = Date.now();
  const response = await fetch(upstream, {
    method: "POST",
    headers,
    body: request.body,
  });
  logRequest("/whisper", upstream, startTime);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

async function handleSummarize(request, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return errorResponse("ANTHROPIC_API_KEY not configured", 503);

  let text;
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    text = body.text;
  } else {
    text = await request.text();
  }

  if (!text) return errorResponse("No text provided", 400);

  const upstream = "https://api.anthropic.com/v1/messages";
  const startTime = Date.now();
  const response = await fetch(upstream, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Please provide a concise summary of the following text:\n\n${text}`,
        },
      ],
    }),
  });
  logRequest("/summarize", upstream, startTime);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      // --- OpenAI proxy: /openai/* ---
      if (pathname.startsWith("/openai")) {
        const subpath = pathname.slice("/openai".length) || "/v1/chat/completions";
        return proxyToOpenAI(request, subpath, env);
      }

      // --- Anthropic proxy: /anthropic/* ---
      if (pathname.startsWith("/anthropic")) {
        const subpath = pathname.slice("/anthropic".length) || "/v1/messages";
        return proxyToAnthropic(request, subpath, env);
      }

      // --- Whisper: /whisper ---
      if (pathname.startsWith("/whisper")) {
        if (request.method !== "POST") return errorResponse("Method not allowed", 405);
        return handleWhisper(request, env);
      }

      // --- Replicate proxy: /replicate/* ---
      if (pathname.startsWith("/replicate")) {
        const subpath = pathname.slice("/replicate".length) || "/v1/predictions";
        return proxyToReplicate(request, subpath, env);
      }

      // --- Summarize: /summarize ---
      if (pathname.startsWith("/summarize")) {
        if (request.method !== "POST") return errorResponse("Method not allowed", 405);
        return handleSummarize(request, env);
      }

      // --- Health check ---
      if (pathname === "/health") {
        return jsonResponse({
          status: "ok",
          services: {
            openai: !!env.OPENAI_API_KEY,
            anthropic: !!env.ANTHROPIC_API_KEY,
            replicate: !!env.REPLICATE_API_TOKEN,
          },
        });
      }

      return errorResponse("Not found", 404);

    } catch (err) {
      console.error(`[ai-proxy] Error:`, err);
      return errorResponse(`AI proxy error: ${err.message}`, 502);
    }
  },
};
