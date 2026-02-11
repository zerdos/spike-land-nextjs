import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import { getOrCreateSession, updateSession } from "@/lib/codespace/session-service";
import { transpileCode } from "@/lib/codespace/transpile";
import { OptimisticLockError } from "@/lib/codespace/types";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

/**
 * GET /api/codespace/[codeSpace]/code
 *
 * Returns the raw source code as plain text.
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
      `[Codespace API] Failed to get code for "${codeSpace}":`,
      sessionError,
    );
    return new Response("Failed to retrieve code", {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "text/plain" },
    });
  }

  return new Response(session.code, {
    headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * PUT /api/codespace/[codeSpace]/code
 *
 * Update code with optimistic locking.
 * Body: { code: string, expectedHash: string }
 *
 * Transpiles via js.spike.land, then updates the session.
 * Returns 409 Conflict if expectedHash does not match current state.
 */
export async function PUT(
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
    request.json() as Promise<{ code?: string; expectedHash?: string }>,
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

  if (!body.expectedHash || typeof body.expectedHash !== "string") {
    return Response.json(
      { error: "Missing or invalid 'expectedHash' field" },
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

  // Get current session to preserve html/css
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

  // Update with optimistic lock
  const { data: updated, error: updateError } = await tryCatch(
    updateSession(
      codeSpace,
      {
        codeSpace,
        code: body.code,
        transpiled,
        html: current.html,
        css: current.css,
      },
      body.expectedHash,
    ),
  );

  if (updateError) {
    if (updateError instanceof OptimisticLockError) {
      return Response.json(
        {
          error: "Conflict: session was modified by another request",
          expectedHash: updateError.expectedHash,
          actualHash: updateError.actualHash,
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    console.error(
      `[Codespace API] Failed to update code for "${codeSpace}":`,
      updateError,
    );
    return Response.json(
      { error: "Failed to update session" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return Response.json(
    { hash: updated.hash },
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return corsOptions();
}
