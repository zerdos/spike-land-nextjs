// Collab Service - real-time collaboration, WebSocket management, session state
// Replaces the Code Durable Object from the original spike.land architecture.

// ---------------------------------------------------------------------------
// Redis HTTP helpers (Upstash REST API compatible)
// Swap these out for a direct Redis connection when available.
// ---------------------------------------------------------------------------

class RedisClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }

  async exec(command) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      throw new Error(`Redis error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return data.result;
  }

  get(key) { return this.exec(["GET", key]); }
  set(key, value) { return this.exec(["SET", key, value]); }
  del(key) { return this.exec(["DEL", key]); }
  incr(key) { return this.exec(["INCR", key]); }
  hset(key, field, value) { return this.exec(["HSET", key, field, value]); }
  hget(key, field) { return this.exec(["HGET", key, field]); }
  hgetall(key) { return this.exec(["HGETALL", key]); }
  publish(channel, message) { return this.exec(["PUBLISH", channel, message]); }
}

// ---------------------------------------------------------------------------
// In-memory session tracking (per-instance)
// ---------------------------------------------------------------------------

// Map<codeSpace, Set<WebSocket>>
const activeSockets = new Map();

// Map<codeSpace, SessionData>
const sessionCache = new Map();

// ---------------------------------------------------------------------------
// Hash computation
// ---------------------------------------------------------------------------

async function sha256hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function computeSessionHash(codeSpace, code, html, css, transpiled) {
  const codeMd5 = await sha256hex(code || "");
  const htmlMd5 = await sha256hex(html || "");
  const cssMd5 = await sha256hex(css || "");
  const transpiledMd5 = await sha256hex(transpiled || "");
  return sha256hex(JSON.stringify({ codeSpace, code_md5: codeMd5, html_md5: htmlMd5, css_md5: cssMd5, transpiled_md5: transpiledMd5 }));
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function getRedis(env) {
  const url = env.REDIS_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.REDIS_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new RedisClient(url, token);
}

async function loadSession(redis, codeSpace) {
  if (sessionCache.has(codeSpace)) return sessionCache.get(codeSpace);

  const session = {
    codeSpace,
    code: "",
    transpiled: "",
    html: "",
    css: "",
    messages: [],
    hash: "",
  };

  if (redis) {
    try {
      const core = await redis.hgetall(`session:${codeSpace}:core`);
      if (core && typeof core === "object") {
        // Upstash returns flat array [field, value, field, value...]
        const entries = Array.isArray(core)
          ? Object.fromEntries(core.reduce((acc, v, i) => {
              if (i % 2 === 0) acc.push([v, core[i + 1]]);
              return acc;
            }, []))
          : core;
        session.code = entries.code || "";
        session.transpiled = entries.transpiled || "";
        session.html = entries.html || "";
        session.css = entries.css || "";
        session.hash = entries.hash || "";
      }
    } catch (err) {
      console.error(`[collab] Failed to load session ${codeSpace}:`, err);
    }
  }

  session.hash = session.hash || await computeSessionHash(codeSpace, session.code, session.html, session.css, session.transpiled);
  sessionCache.set(codeSpace, session);
  return session;
}

async function saveSession(redis, session) {
  sessionCache.set(session.codeSpace, session);
  if (!redis) return;

  try {
    const key = `session:${session.codeSpace}:core`;
    await redis.hset(key, "code", session.code);
    await redis.hset(key, "transpiled", session.transpiled);
    await redis.hset(key, "html", session.html);
    await redis.hset(key, "css", session.css);
    await redis.hset(key, "hash", session.hash);
  } catch (err) {
    console.error(`[collab] Failed to save session ${session.codeSpace}:`, err);
  }
}

async function saveVersion(redis, session) {
  if (!redis) return;
  try {
    const count = await redis.incr(`version_count:${session.codeSpace}`);
    await redis.set(`version:${session.codeSpace}:${count}`, JSON.stringify({
      version: count,
      code: session.code,
      transpiled: session.transpiled,
      html: session.html,
      css: session.css,
      hash: session.hash,
      timestamp: Date.now(),
    }));
  } catch (err) {
    console.error(`[collab] Failed to save version for ${session.codeSpace}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Broadcast to all connected WebSockets for a codeSpace
// ---------------------------------------------------------------------------

function broadcast(codeSpace, message, exclude = null) {
  const sockets = activeSockets.get(codeSpace);
  if (!sockets) return;
  const payload = typeof message === "string" ? message : JSON.stringify(message);
  for (const ws of sockets) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch { /* socket may have closed */ }
    }
  }
}

// ---------------------------------------------------------------------------
// WebSocket handler
// ---------------------------------------------------------------------------

async function handleWebSocket(request, env) {
  const url = new URL(request.url);
  const codeSpace = url.searchParams.get("codeSpace") || "default";

  const [client, server] = Object.values(new WebSocketPair());

  server.accept();

  const redis = getRedis(env);
  const session = await loadSession(redis, codeSpace);

  // Register socket
  if (!activeSockets.has(codeSpace)) {
    activeSockets.set(codeSpace, new Set());
  }
  activeSockets.get(codeSpace).add(server);

  // Send handshake
  server.send(JSON.stringify({ type: "handshake", hash: session.hash }));

  // Keepalive interval
  const pingInterval = setInterval(() => {
    if (server.readyState === WebSocket.OPEN) {
      try { server.send(JSON.stringify({ type: "ping" })); } catch { /* ignore */ }
    }
  }, 30_000);

  server.addEventListener("message", async (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "pong") return;

      if (msg.type === "ping") {
        server.send(JSON.stringify({ type: "pong" }));
        return;
      }

      // Delta update: { oldHash, hashCode, delta }
      if (msg.delta !== undefined) {
        if (msg.oldHash && msg.oldHash !== session.hash) {
          // Hash mismatch - send full state so the client can reconcile
          server.send(JSON.stringify({
            type: "full-state",
            hash: session.hash,
            code: session.code,
            transpiled: session.transpiled,
            html: session.html,
            css: session.css,
          }));
          return;
        }

        // TODO: Apply delta patch to session.code using a diffing library
        // For now, if the message includes full code, use that
        if (msg.code !== undefined) {
          session.code = msg.code;
          if (msg.transpiled !== undefined) session.transpiled = msg.transpiled;
          if (msg.html !== undefined) session.html = msg.html;
          if (msg.css !== undefined) session.css = msg.css;
          session.hash = await computeSessionHash(codeSpace, session.code, session.html, session.css, session.transpiled);
          await saveSession(redis, session);
          await saveVersion(redis, session);

          // Broadcast to other clients
          broadcast(codeSpace, {
            type: "update",
            hash: session.hash,
            code: session.code,
            transpiled: session.transpiled,
            html: session.html,
            css: session.css,
          }, server);

          // Publish to Redis for cross-instance sync
          if (redis) {
            try {
              await redis.publish(`collab:${codeSpace}`, JSON.stringify({
                type: "update",
                hash: session.hash,
              }));
            } catch { /* ignore pub/sub errors */ }
          }
        }

        // Acknowledge
        server.send(JSON.stringify({ type: "ack", hash: session.hash }));
        return;
      }

      // Topic subscribe/publish
      if (msg.type === "subscribe") {
        // TODO: Implement topic subscription tracking
        return;
      }

      if (msg.type === "publish") {
        // Broadcast to all sockets in this codeSpace
        broadcast(codeSpace, { type: "topic", topic: msg.topic, data: msg.data }, server);
        return;
      }
    } catch (err) {
      console.error(`[collab] WebSocket message error:`, err);
    }
  });

  server.addEventListener("close", () => {
    clearInterval(pingInterval);
    const sockets = activeSockets.get(codeSpace);
    if (sockets) {
      sockets.delete(server);
      if (sockets.size === 0) activeSockets.delete(codeSpace);
    }
  });

  server.addEventListener("error", () => {
    clearInterval(pingInterval);
    const sockets = activeSockets.get(codeSpace);
    if (sockets) {
      sockets.delete(server);
      if (sockets.size === 0) activeSockets.delete(codeSpace);
    }
  });

  return new Response(null, { status: 101, webSocket: client });
}

// ---------------------------------------------------------------------------
// HTTP request handler
// ---------------------------------------------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Extract codeSpace from paths like /live/{codeSpace}/... or /api-v1/{codeSpace}/...
function extractCodeSpace(pathname) {
  const patterns = [
    /^\/live\/([^/]+)/,
    /^\/api-v1\/([^/]+)/,
    /^\/api\/room\/([^/]+)/,
  ];
  for (const re of patterns) {
    const m = pathname.match(re);
    if (m) return m[1];
  }
  return null;
}

function editorHtml(codeSpace, session) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${codeSpace} - spike.land</title>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime"
    }
  }
  </script>
  <style>${session.css || ""}</style>
</head>
<body>
  <div id="root">${session.html || ""}</div>
  <script type="module">
    const wsUrl = location.origin.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(wsUrl + "/websocket?codeSpace=${codeSpace}");
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "handshake") console.log("[collab] connected, hash:", msg.hash);
      if (msg.type === "update") location.reload();
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request, env);
    }

    const redis = getRedis(env);
    const codeSpace = extractCodeSpace(pathname);

    try {
      // --- /hashCode ---
      if (pathname === "/hashCode") {
        const cs = url.searchParams.get("codeSpace") || "default";
        const session = await loadSession(redis, cs);
        return jsonResponse({ hash: session.hash });
      }

      // --- /versions ---
      if (pathname === "/versions" && redis) {
        const cs = url.searchParams.get("codeSpace") || "default";
        const count = await redis.get(`version_count:${cs}`);
        return jsonResponse({ codeSpace: cs, count: parseInt(count || "0", 10) });
      }

      // --- /version/{N} ---
      const versionMatch = pathname.match(/^\/version\/(\d+)$/);
      if (versionMatch && redis) {
        const cs = url.searchParams.get("codeSpace") || "default";
        const n = versionMatch[1];
        const raw = await redis.get(`version:${cs}:${n}`);
        if (!raw) return jsonResponse({ error: "Version not found" }, 404);
        return jsonResponse(JSON.parse(raw));
      }

      // --- /live/{codeSpace} routes ---
      if (pathname.startsWith("/live/") && codeSpace) {
        const session = await loadSession(redis, codeSpace);
        const sub = pathname.slice(`/live/${codeSpace}`.length);

        if (sub === "/session.json" || sub === "/session") {
          return jsonResponse({
            codeSpace: session.codeSpace,
            code: session.code,
            transpiled: session.transpiled,
            html: session.html,
            css: session.css,
            hash: session.hash,
          });
        }

        if (sub === "/index.mjs") {
          return new Response(session.transpiled || "", {
            headers: { "Content-Type": "application/javascript" },
          });
        }

        if (sub === "/index.css") {
          return new Response(session.css || "", {
            headers: { "Content-Type": "text/css" },
          });
        }

        // Default: serve editor HTML
        return htmlResponse(editorHtml(codeSpace, session));
      }

      // --- /api-v1/{codeSpace}/code ---
      if (pathname.startsWith("/api-v1/") && codeSpace) {
        const session = await loadSession(redis, codeSpace);
        const sub = pathname.slice(`/api-v1/${codeSpace}`.length);

        if (sub === "/code" && request.method === "GET") {
          return new Response(session.code || "", {
            headers: { "Content-Type": "text/plain" },
          });
        }

        if (sub === "/code" && request.method === "PUT") {
          const code = await request.text();
          session.code = code;
          session.hash = await computeSessionHash(codeSpace, session.code, session.html, session.css, session.transpiled);
          await saveSession(redis, session);
          await saveVersion(redis, session);
          broadcast(codeSpace, { type: "update", hash: session.hash, code: session.code });
          return jsonResponse({ hash: session.hash, codeSpace });
        }

        return jsonResponse({ error: "Not found" }, 404);
      }

      // --- /api/room/{codeSpace} routes (alias for api-v1) ---
      if (pathname.startsWith("/api/room/") && codeSpace) {
        const session = await loadSession(redis, codeSpace);
        return jsonResponse({
          codeSpace: session.codeSpace,
          code: session.code,
          hash: session.hash,
        });
      }

      // Default: assume it is a codeSpace root and serve editor
      const fallbackCs = pathname.slice(1).split("/")[0] || "default";
      const session = await loadSession(redis, fallbackCs);
      return htmlResponse(editorHtml(fallbackCs, session));

    } catch (err) {
      console.error(`[collab] Error handling ${pathname}:`, err);
      return jsonResponse({ error: err.message }, 500);
    }
  },
};
