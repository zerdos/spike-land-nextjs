// Auth Worker - JWT validation and session management
// Provides authentication middleware for spike.land nanoservices.

// TODO: Full NextAuth integration. Currently implements basic JWT validation
// using crypto.subtle for HMAC-SHA256 verification.

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

// ---------------------------------------------------------------------------
// JWT helpers using crypto.subtle (no external dependencies)
// ---------------------------------------------------------------------------

function base64UrlDecode(str) {
  const padded = str + "=".repeat((4 - str.length % 4) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
  return { header: JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0]))), payload, signature: parts[2] };
}

async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const { header, payload } = decodeJwtPayload(token);

  // Only support HS256 for now
  if (header.alg !== "HS256") {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }

  // Import the secret key
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  // Verify signature
  const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signatureBytes = base64UrlDecode(parts[2]);

  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, signatureInput);
  if (!valid) throw new Error("Invalid signature");

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  // Check issuer if configured
  return payload;
}

// ---------------------------------------------------------------------------
// Extract token from request
// ---------------------------------------------------------------------------

function extractToken(request) {
  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return authHeader;
  }

  // Check cookie
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)session-token=([^;]+)/);
    if (match) return match[1];
    const nextAuth = cookie.match(/(?:^|;\s*)next-auth\.session-token=([^;]+)/);
    if (nextAuth) return nextAuth[1];
  }

  // Check query parameter (for WebSocket upgrades)
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get("token");
  if (tokenParam) return tokenParam;

  return null;
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    const secret = env.JWT_SECRET;
    if (!secret) {
      if (pathname === "/health") {
        return jsonResponse({ status: "ok", configured: false });
      }
      return errorResponse("JWT_SECRET not configured", 503);
    }

    try {
      // --- POST /auth/validate - validate token and return user info ---
      if (pathname === "/auth/validate" && request.method === "POST") {
        const token = extractToken(request);
        if (!token) {
          return errorResponse("No token provided", 401);
        }

        try {
          const payload = await verifyJwt(token, secret);
          return jsonResponse({
            valid: true,
            user: {
              sub: payload.sub,
              email: payload.email,
              name: payload.name,
              iat: payload.iat,
              exp: payload.exp,
            },
          });
        } catch (err) {
          return jsonResponse({ valid: false, error: err.message }, 401);
        }
      }

      // --- GET /auth/session - check session validity ---
      if (pathname === "/auth/session" && request.method === "GET") {
        const token = extractToken(request);
        if (!token) {
          return jsonResponse({ authenticated: false }, 401);
        }

        try {
          const payload = await verifyJwt(token, secret);
          return jsonResponse({
            authenticated: true,
            user: {
              sub: payload.sub,
              email: payload.email,
              name: payload.name,
            },
            expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
          });
        } catch (err) {
          return jsonResponse({ authenticated: false, error: err.message }, 401);
        }
      }

      // --- GET /auth/health ---
      if (pathname === "/health" || pathname === "/auth/health") {
        return jsonResponse({
          status: "ok",
          configured: true,
          issuer: env.AUTH_ISSUER || "spike.land",
        });
      }

      return errorResponse("Not found", 404);

    } catch (err) {
      console.error(`[auth-worker] Error:`, err);
      return errorResponse(`Auth error: ${err.message}`, 500);
    }
  },
};
