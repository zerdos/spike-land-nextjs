import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/live/[codeSpace]
 * Fetch current code from testing.spike.land for a codespace
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

  // Validate codeSpace format (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(codeSpace)) {
    return NextResponse.json(
      { error: "Invalid codeSpace format" },
      { status: 400 },
    );
  }

  const { data: response, error: fetchError } = await tryCatch(
    fetch(`https://testing.spike.land/live/${codeSpace}/session.json`, {
      headers: {
        "Accept": "application/json",
      },
      // Cache for 1 second to allow quick refreshes
      next: { revalidate: 1 },
    }),
  );

  if (fetchError) {
    console.error("[api/live] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Failed to connect to codespace server" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      return NextResponse.json(
        { error: "Codespace not found", codeSpace },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: `Upstream error: ${response.status}` },
      { status: response.status },
    );
  }

  const { data: session, error: jsonError } = await tryCatch(response.json());

  if (jsonError) {
    console.error("[api/live] JSON parse error:", jsonError);
    return NextResponse.json(
      { error: "Invalid response from codespace server" },
      { status: 502 },
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
