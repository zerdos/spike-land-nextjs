import { auth } from "@/auth";
import {
  countActiveApiKeys,
  createApiKey,
  listApiKeys,
  MAX_API_KEYS_PER_USER,
} from "@/lib/mcp/api-key-manager";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

// GET /api/settings/api-keys - List user's API keys
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: apiKeys, error } = await tryCatch(listApiKeys(session.user.id));

  if (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 },
    );
  }

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
}

// POST /api/settings/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Failed to create API key:", bodyError);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }

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
  const { data: activeKeyCount, error: countError } = await tryCatch(
    countActiveApiKeys(session.user.id),
  );

  if (countError) {
    console.error("Failed to create API key:", countError);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }

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
  const { data: result, error: createError } = await tryCatch(
    createApiKey(session.user.id, name.trim()),
  );

  if (createError) {
    console.error("Failed to create API key:", createError);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }

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
}
