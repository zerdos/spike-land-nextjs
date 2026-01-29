/**
 * Pinterest Pins API Routes
 *
 * GET /api/social/pinterest/pins - List user's pins
 * POST /api/social/pinterest/pins - Create a new pin
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET - List user's pins
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

  // Get pins
  const { data: pins, error: pinsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (pinsError) {
    console.error("Failed to get Pinterest pins:", pinsError);
    return NextResponse.json(
      { error: "Failed to retrieve pins from Pinterest" },
      { status: 500 },
    );
  }

  return NextResponse.json({ pins });
}

/**
 * POST - Create a new pin
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

  const {
    accountId,
    board_id,
    title,
    description,
    link,
    alt_text,
    media_url,
  } = body as {
    accountId: string;
    board_id: string;
    title?: string;
    description?: string;
    link?: string;
    alt_text?: string;
    media_url: string;
  };

  // Validate required fields
  if (!accountId || !board_id || !media_url) {
    return NextResponse.json(
      { error: "accountId, board_id, and media_url are required" },
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
  const client = new PinterestClient({ accessToken, boardId: board_id });

  // Create pin
  const { data: pin, error: pinError } = await tryCatch(
    client.createPost(description || "", {
      mediaUrls: [media_url],
      metadata: {
        board_id,
        title,
        link,
        alt_text,
      },
    }),
  );

  if (pinError) {
    console.error("Failed to create Pinterest pin:", pinError);
    return NextResponse.json(
      { error: pinError instanceof Error ? pinError.message : "Failed to create pin" },
      { status: 500 },
    );
  }

  return NextResponse.json({ pin }, { status: 201 });
}
