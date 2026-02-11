import { transpileCode, upsertSession } from "@/lib/codespace";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * POST /api/live/[codeSpace]/sync
 * Sync code to the codespace (transpile + save to DB)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ codeSpace: string; }>; },
) {
  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { codeSpace } = params;

  // Validate codeSpace format (alphanumeric, hyphens, underscores, dots)
  if (!/^[a-zA-Z0-9_.-]+$/.test(codeSpace)) {
    return NextResponse.json(
      { error: "Invalid codeSpace format" },
      { status: 400 },
    );
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());
  if (bodyError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code } = body;
  if (typeof code !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'code' field" },
      { status: 400 },
    );
  }

  // Transpile the code
  const { data: transpiled, error: transpileError } = await tryCatch(
    transpileCode(code, "https://spike.land"),
  );

  if (transpileError) {
    console.error("[api/live/sync] Transpile error:", transpileError);
    return NextResponse.json(
      { error: transpileError instanceof Error ? transpileError.message : "Transpilation failed" },
      { status: 400 },
    );
  }

  // Save to DB
  const { error: saveError } = await tryCatch(
    upsertSession({
      codeSpace,
      code,
      transpiled,
      html: "",
      css: "",
    }),
  );

  if (saveError) {
    console.error("[api/live/sync] Save error:", saveError);
    return NextResponse.json(
      { error: "Failed to save code" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    codeSpace,
    syncedAt: new Date().toISOString(),
  });
}
