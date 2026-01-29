/**
 * Pinterest Board Management API Routes
 *
 * PATCH /api/social/pinterest/boards/[boardId] - Update board metadata
 * DELETE /api/social/pinterest/boards/[boardId] - Delete a board
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

/**
 * PATCH - Update board metadata
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const boardId = params.boardId;

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { accountId, name, description, privacy } = body as {
    accountId: string;
    name?: string;
    description?: string;
    privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
  };

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }

  // Get social account from database
  const { data: socialAccount, error: dbError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    }),
  );

  if (dbError || !socialAccount) {
    return NextResponse.json(
      { error: "Pinterest account not found" },
      { status: 404 },
    );
  }

  if (socialAccount.platform !== "PINTEREST") {
    return NextResponse.json(
      { error: "Account is not a Pinterest account" },
      { status: 400 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(socialAccount.accessTokenEncrypted);

  // Create Pinterest client
  const client = new PinterestClient({ accessToken });

  // Update board
  const updates: { name?: string; description?: string; privacy?: "PUBLIC" | "PROTECTED" | "SECRET" } = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (privacy) updates.privacy = privacy;

  const { data: board, error: updateError } = await tryCatch(
    client.updateBoard(boardId, updates),
  );

  if (updateError) {
    console.error("Failed to update Pinterest board:", updateError);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 },
    );
  }

  return NextResponse.json({ board });
}

/**
 * DELETE - Delete a board
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const boardId = params.boardId;
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get social account from database
  const { data: socialAccount, error: dbError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    }),
  );

  if (dbError || !socialAccount) {
    return NextResponse.json(
      { error: "Pinterest account not found" },
      { status: 404 },
    );
  }

  if (socialAccount.platform !== "PINTEREST") {
    return NextResponse.json(
      { error: "Account is not a Pinterest account" },
      { status: 400 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(socialAccount.accessTokenEncrypted);

  // Create Pinterest client
  const client = new PinterestClient({ accessToken });

  // Delete board
  const { error: deleteError } = await tryCatch(client.deleteBoard(boardId));

  if (deleteError) {
    console.error("Failed to delete Pinterest board:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, message: "Board deleted" });
}
