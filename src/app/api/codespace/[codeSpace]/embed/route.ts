import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import { buildEmbedHtml } from "@/lib/codespace/html-template";
import { getOrCreateSession } from "@/lib/codespace/session-service";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

/**
 * GET /api/codespace/[codeSpace]/embed
 *
 * Serves a self-contained HTML page that renders the current session's
 * app. Designed to be loaded in an iframe for live app previews.
 *
 * Replaces the Cloudflare Worker's handleWrapHTMLRoute from liveRoutes.ts.
 */
export async function GET(
  _request: NextRequest,
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

  const { data: session, error: sessionError } = await tryCatch(
    getOrCreateSession(codeSpace),
  );

  if (sessionError) {
    console.error(
      `[Codespace Embed] Failed to get session for "${codeSpace}":`,
      sessionError,
    );
    return new Response("Failed to retrieve session", {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  }

  const html = buildEmbedHtml({
    transpiled: session.transpiled,
    html: session.html,
    css: session.css,
    codeSpace: session.codeSpace,
  });

  return new Response(html, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export function OPTIONS() {
  return corsOptions();
}
