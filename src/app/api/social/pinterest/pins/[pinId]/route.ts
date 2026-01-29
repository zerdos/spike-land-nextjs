/**
 * Pinterest Pin Management API Routes
 *
 * DELETE /api/social/pinterest/pins/[pinId] - Delete a pin
 * PATCH /api/social/pinterest/pins/[pinId] - Update pin (move to board)
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ pinId: string }>;
}

/**
 * DELETE - Delete a pin
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
  const pinId = params.pinId;
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

  // Delete pin
  const { error: deleteError } = await tryCatch(client.deletePost(pinId));

  if (deleteError) {
    console.error("Failed to delete Pinterest pin:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete pin from Pinterest" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, message: "Pin deleted" });
}

/**
 * PATCH - Update pin (move to different board)
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
  const pinId = params.pinId;

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { accountId, board_id } = body as {
    accountId: string;
    board_id: string;
  };

  if (!accountId || !board_id) {
    return NextResponse.json(
      { error: "accountId and board_id are required" },
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

  // Move pin to board
  const { error: moveError } = await tryCatch(
    client.movePinToBoard(pinId, board_id),
  );

  if (moveError) {
    console.error("Failed to move Pinterest pin:", moveError);
    return NextResponse.json(
      { error: "Failed to move pin to board" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Pin moved to board",
    pinId,
    boardId: board_id,
  });
}
