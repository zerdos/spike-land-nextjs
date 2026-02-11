import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import { transpileCode } from "@/lib/codespace/transpile";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

/**
 * POST /api/codespace/[codeSpace]/validate
 *
 * Validate code by transpiling it without saving to the database.
 * Useful for editor-side syntax checking before committing changes.
 *
 * Body: { code: string }
 * Returns: { valid: true, transpiled: string } or { valid: false, error: string }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ codeSpace: string }> },
) {
  // We still resolve params to keep the route signature consistent,
  // even though validate does not read from the database.
  const { error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return Response.json(
      { error: "Invalid parameters" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

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

  // Transpile without saving
  const origin = request.headers.get("origin") ?? undefined;
  const { data: transpiled, error: transpileError } = await tryCatch(
    transpileCode(body.code, origin),
  );

  if (transpileError) {
    return Response.json(
      { valid: false, error: transpileError.message },
      { headers: CORS_HEADERS },
    );
  }

  return Response.json(
    { valid: true, transpiled },
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return corsOptions();
}
