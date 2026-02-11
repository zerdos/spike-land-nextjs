import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import { getOrCreateSession } from "@/lib/codespace/session-service";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

/**
 * GET /api/codespace/[codeSpace]/session
 *
 * Returns the full session state including code, transpiled output, html, css, and hash.
 * Creates a default session if one does not exist for this codeSpace.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ codeSpace: string }> },
) {
  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return Response.json(
      { error: "Invalid parameters" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { codeSpace } = params;

  const { data: session, error: sessionError } = await tryCatch(
    getOrCreateSession(codeSpace),
  );

  if (sessionError) {
    console.error(
      `[Codespace API] Failed to get session for "${codeSpace}":`,
      sessionError,
    );
    return Response.json(
      { error: "Failed to retrieve session" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return Response.json(
    {
      codeSpace: session.codeSpace,
      code: session.code,
      transpiled: session.transpiled,
      html: session.html,
      css: session.css,
      hash: session.hash,
    },
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return corsOptions();
}
