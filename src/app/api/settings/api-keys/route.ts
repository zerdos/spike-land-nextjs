import { auth } from "@/auth";
import {
  countActiveApiKeys,
  createApiKey,
  listApiKeys,
  MAX_API_KEYS_PER_USER,
} from "@/lib/mcp/api-key-manager";
import { NextRequest, NextResponse } from "next/server";

// GET /api/settings/api-keys - List user's API keys
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKeys = await listApiKeys(session.user.id);

    return NextResponse.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        lastUsedAt: key.lastUsedAt?.toISOString() || null,
        isActive: key.isActive,
        createdAt: key.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 },
    );
  }
}

// POST /api/settings/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 },
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "API key name must be 50 characters or less" },
        { status: 400 },
      );
    }

    // Check if user has reached the maximum number of API keys
    const activeKeyCount = await countActiveApiKeys(session.user.id);
    if (activeKeyCount >= MAX_API_KEYS_PER_USER) {
      return NextResponse.json(
        {
          error:
            `Maximum of ${MAX_API_KEYS_PER_USER} API keys allowed. Please revoke an existing key first.`,
        },
        { status: 400 },
      );
    }

    // Create the API key
    const result = await createApiKey(session.user.id, name.trim());

    return NextResponse.json({
      apiKey: {
        id: result.id,
        name: result.name,
        key: result.key, // Full key - only shown once
        keyPrefix: result.keyPrefix,
        createdAt: result.createdAt.toISOString(),
      },
      message:
        "API key created successfully. Make sure to copy the key now - it will not be shown again.",
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }
}
