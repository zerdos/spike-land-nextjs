import { auth } from "@/auth";
import { getApiKey, revokeApiKey } from "@/lib/mcp/api-key-manager";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; }>;
}

// GET /api/settings/api-keys/[id] - Get a single API key
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const apiKey = await getApiKey(session.user.id, id);

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
  } catch (error) {
    console.error("Failed to fetch API key:", error);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 },
    );
  }
}

// DELETE /api/settings/api-keys/[id] - Revoke an API key
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const result = await revokeApiKey(session.user.id, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 },
    );
  }
}
