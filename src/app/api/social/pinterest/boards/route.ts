/**
 * Pinterest Boards API Routes
 *
 * GET /api/social/pinterest/boards - List user's boards
 * POST /api/social/pinterest/boards - Create a new board
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET - List user's boards
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

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

  // Get boards
  const { data: boards, error: boardsError } = await tryCatch(
    client.listBoards(pageSize),
  );

  if (boardsError) {
    console.error("Failed to get Pinterest boards:", boardsError);
    return NextResponse.json(
      { error: "Failed to retrieve boards from Pinterest" },
      { status: 500 },
    );
  }

  return NextResponse.json({ boards });
}

/**
 * POST - Create a new board
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    name: string;
    description?: string;
    privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
  };

  // Validate required fields
  if (!accountId || !name) {
    return NextResponse.json(
      { error: "accountId and name are required" },
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

  // Create board
  const { data: board, error: boardError } = await tryCatch(
    client.createBoard(name, description, privacy || "PUBLIC"),
  );

  if (boardError) {
    console.error("Failed to create Pinterest board:", boardError);
    return NextResponse.json(
      {
        error: boardError instanceof Error
          ? boardError.message
          : "Failed to create board",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ board }, { status: 201 });
}
