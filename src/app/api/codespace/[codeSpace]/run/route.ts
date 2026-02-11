import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import {
  getOrCreateSession,
  saveVersion,
  upsertSession,
} from "@/lib/codespace/session-service";
import { transpileCode } from "@/lib/codespace/transpile";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

/**
 * POST /api/codespace/[codeSpace]/run
 *
 * Transpile code and force-update the session (no optimistic locking).
 * Also saves a new version snapshot.
 *
 * Body: { code: string }
 * Returns: { success: true, hash: string }
 */
export async function POST(
  request: NextRequest,
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

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(
    request.json() as Promise<{ code?: string }>,
  );

  if (bodyError) {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!body.code || typeof body.code !== "string") {
    return Response.json(
      { error: "Missing or invalid 'code' field" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Transpile
  const origin = request.headers.get("origin") ?? undefined;
  const { data: transpiled, error: transpileError } = await tryCatch(
    transpileCode(body.code, origin),
  );

  if (transpileError) {
    console.error(
      `[Codespace API] Transpilation failed for "${codeSpace}":`,
      transpileError,
    );
    return Response.json(
      { error: `Transpilation failed: ${transpileError.message}` },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  // Get current session to preserve html/css fields
  const { data: current, error: currentError } = await tryCatch(
    getOrCreateSession(codeSpace),
  );

  if (currentError) {
    console.error(
      `[Codespace API] Failed to get current session for "${codeSpace}":`,
      currentError,
    );
    return Response.json(
      { error: "Failed to retrieve current session" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Force-update session (no optimistic lock)
  const { data: session, error: upsertError } = await tryCatch(
    upsertSession({
      codeSpace,
      code: body.code,
      transpiled,
      html: current.html,
      css: current.css,
    }),
  );

  if (upsertError) {
    console.error(
      `[Codespace API] Failed to upsert session for "${codeSpace}":`,
      upsertError,
    );
    return Response.json(
      { error: "Failed to update session" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Save a version snapshot (best-effort, do not fail the request)
  const { error: versionError } = await tryCatch(saveVersion(codeSpace));
  if (versionError) {
    console.warn(
      `[Codespace API] Failed to save version for "${codeSpace}":`,
      versionError,
    );
  }

  return Response.json(
    { success: true, hash: session.hash },
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return corsOptions();
}
