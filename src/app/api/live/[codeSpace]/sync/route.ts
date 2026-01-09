import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MCP_ENDPOINT = "https://testing.spike.land/mcp";

/**
 * POST /api/live/[codeSpace]/sync
 * Sync code to testing.spike.land via MCP
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

  // Validate codeSpace format (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(codeSpace)) {
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

  // Call MCP endpoint to update code
  const payload = {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "tools/call",
    params: {
      name: "update_code",
      arguments: { codeSpace, code },
    },
  };

  const { data: response, error: fetchError } = await tryCatch(
    fetch(`${MCP_ENDPOINT}?codespaceId=${codeSpace}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  );

  if (fetchError) {
    console.error("[api/live/sync] Fetch error:", fetchError);
    return NextResponse.json(
      { error: "Failed to connect to codespace server" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("[api/live/sync] MCP error:", response.status, text);
    return NextResponse.json(
      { error: `Sync failed: ${response.status}` },
      { status: response.status },
    );
  }

  const { data: result, error: jsonError } = await tryCatch(response.json());

  if (jsonError) {
    console.error("[api/live/sync] JSON parse error:", jsonError);
    return NextResponse.json(
      { error: "Invalid response from MCP server" },
      { status: 502 },
    );
  }

  // Check for MCP error response
  if (result.error) {
    console.error("[api/live/sync] MCP returned error:", result.error);
    return NextResponse.json(
      { error: result.error.message || "MCP error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    codeSpace,
    syncedAt: new Date().toISOString(),
  });
}
