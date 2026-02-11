import { getOrCreateSession } from "@/lib/codespace";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/live/[codeSpace]
 * Fetch current code for a codespace (reads directly from DB)
 */
export async function GET(
  _request: NextRequest,
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

  const { data: session, error: sessionError } = await tryCatch(
    getOrCreateSession(codeSpace),
  );

  if (sessionError) {
    console.error("[api/live] Session error:", sessionError);
    return NextResponse.json(
      { error: "Failed to load codespace session" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    codeSpace,
    code: session.code || "",
    transpiled: session.transpiled || "",
    html: session.html || "",
    css: session.css || "",
  });
}
