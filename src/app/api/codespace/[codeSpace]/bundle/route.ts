import { deleteBundleCache, getBundleCache, setBundleCache } from "@/lib/codespace/bundle-cache";
import { buildBundleHtml } from "@/lib/codespace/bundle-template";
import { bundleCodespace } from "@/lib/codespace/bundler";
import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import {
  getOrCreateSession,
  upsertSession,
} from "@/lib/codespace/session-service";
import { transpileCode } from "@/lib/codespace/transpile";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

const BUILD_TIMEOUT_MS = 10_000;

const TRANSIENT_PATTERNS = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "timeout",
  "redis",
  "ENOTFOUND",
  "socket hang up",
];

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERNS.some((p) => message.toLowerCase().includes(p.toLowerCase()));
}

/**
 * GET /api/codespace/[codeSpace]/bundle
 *
 * Serves a fully self-contained HTML page with an IIFE-bundled app.
 * All JS (React, Emotion, user code) is inlined — no CDN dependencies at runtime.
 *
 * Query params:
 *   ?download=true — returns the HTML as a downloadable file
 *   ?rebuild=true  — force re-transpile and rebuild, bypassing cache
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ codeSpace: string }> },
) {
  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return new Response("Invalid parameters", {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  }

  const { codeSpace } = params;
  const rebuild = request.nextUrl.searchParams.get("rebuild") === "true";

  // Load session
  const { data: session, error: sessionError } = await tryCatch(
    getOrCreateSession(codeSpace),
  );

  if (sessionError) {
    console.error(
      `[Codespace Bundle] Failed to get session for "${codeSpace}":`,
      sessionError,
    );
    const isTransient = isTransientError(sessionError);
    return new Response(
      isTransient ? "Service temporarily unavailable" : "Failed to retrieve session",
      {
        status: isTransient ? 503 : 500,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/plain",
          ...(isTransient && { "Retry-After": "5" }),
        },
      },
    );
  }

  // Auto-transpile if session has code but no transpiled output.
  // On rebuild, always re-transpile from source code.
  let { transpiled } = session;
  if ((!transpiled || rebuild) && session.code) {
    const { data: result, error: transpileError } = await tryCatch(
      transpileCode(session.code),
    );
    if (transpileError) {
      console.error(
        `[Codespace Bundle] Auto-transpile failed for "${codeSpace}":`,
        transpileError,
      );
    } else if (result) {
      transpiled = result;
      upsertSession({ ...session, transpiled }).catch((err) =>
        console.error(`[Codespace Bundle] Failed to persist transpiled code:`, err),
      );
    }
  }

  if (!transpiled) {
    return new Response("No transpiled code available", {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  }

  // Check cache (skip on rebuild)
  const sessionHash = session.hash || codeSpace;

  if (rebuild) {
    deleteBundleCache(codeSpace, sessionHash).catch((err) =>
      console.error(`[Codespace Bundle] Failed to delete cache on rebuild:`, err),
    );
  }

  if (!rebuild) {
    const { data: cached } = await tryCatch(
      getBundleCache(codeSpace, sessionHash),
    );

    if (cached) {
      return bundleResponse(cached, codeSpace, request);
    }
  }

  // Build bundle with timeout
  const { data: bundleResult, error: bundleError } = await tryCatch(
    Promise.race([
      bundleCodespace({ ...session, transpiled }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Bundle build timed out")), BUILD_TIMEOUT_MS),
      ),
    ]),
  );

  if (bundleError) {
    console.error(
      `[Codespace Bundle] Build failed for "${codeSpace}":`,
      bundleError,
    );

    // esbuild-wasm doesn't work on Vercel's serverless runtime.
    // Fall back to redirecting to the testing.spike.land live page
    // which uses import maps and works without bundling.
    const liveUrl = `https://testing.spike.land/live/${codeSpace}/`;
    return Response.redirect(liveUrl, 302);
  }

  const html = buildBundleHtml({
    js: bundleResult.js,
    css: bundleResult.css + (session.css || ""),
    html: session.html || "",
    codeSpace,
  });

  // Cache in background
  setBundleCache(codeSpace, sessionHash, html).catch((err) =>
    console.error(`[Codespace Bundle] Failed to cache bundle:`, err),
  );

  return bundleResponse(html, codeSpace, request);
}

function bundleResponse(
  html: string,
  codeSpace: string,
  request: NextRequest,
): Response {
  const download = request.nextUrl.searchParams.get("download") === "true";

  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, max-age=60",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'unsafe-inline' https://esm.sh; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src * data: blob:; connect-src https://esm.sh;",
  };

  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${codeSpace}.html"`;
  }

  return new Response(html, { headers });
}

export function OPTIONS() {
  return corsOptions();
}
