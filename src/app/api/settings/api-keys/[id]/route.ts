import { auth } from "@/auth";
import { getApiKey, revokeApiKey } from "@/lib/mcp/api-key-manager";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; }>;
}

import { tryCatch } from "@/lib/try-catch";

// GET /api/settings/api-keys/[id] - Get a single API key
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: paramsData, error: paramsError } = await tryCatch(params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { id } = paramsData;

  const { data: apiKey, error: fetchError } = await tryCatch(
    getApiKey(session.user.id, id)
  );

  if (fetchError) {
    console.error("Failed to fetch API key:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 },
    );
  }

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt.toISOString(),
    },
  });
}

// DELETE /api/settings/api-keys/[id] - Revoke an API key
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: paramsData, error: paramsError } = await tryCatch(params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { id } = paramsData;

  const { data: result, error: revokeError } = await tryCatch(
    revokeApiKey(session.user.id, id)
  );

  if (revokeError) {
    console.error("Failed to revoke API key:", revokeError);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 },
    );
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "API key revoked successfully",
  });
}
