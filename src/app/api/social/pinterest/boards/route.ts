/**
 * Pinterest Boards API Route
 *
 * GET /api/social/pinterest/boards - Fetch user's boards
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/pinterest/boards
 * Fetch user's Pinterest boards
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Fetch social account from database
  const { data: socialAccount, error: dbError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accessTokenEncrypted: true,
        status: true,
        workspace: {
          select: {
            id: true,
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    }),
  );

  if (dbError || !socialAccount) {
    return NextResponse.json(
      { error: "Pinterest account not found" },
      { status: 404 },
    );
  }

  // Verify user has access to this workspace
  if (socialAccount.workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 },
    );
  }

  // Verify it's a Pinterest account
  if (socialAccount.platform !== "PINTEREST") {
    return NextResponse.json(
      { error: "Not a Pinterest account" },
      { status: 400 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(socialAccount.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 },
    );
  }

  // Fetch boards using Pinterest client
  const client = new PinterestClient({
    accessToken,
    accountId: socialAccount.accountId,
  });

  const { data: boards, error: boardsError } = await tryCatch(
    client.getBoards(limit),
  );

  if (boardsError) {
    console.error("Failed to fetch Pinterest boards:", boardsError);
    return NextResponse.json(
      { error: "Failed to fetch Pinterest boards" },
      { status: 500 },
    );
  }

  return NextResponse.json({ boards });
}
