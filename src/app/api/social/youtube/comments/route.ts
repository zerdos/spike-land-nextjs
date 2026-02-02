
import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const videoId = searchParams.get("videoId");
  const pageToken = searchParams.get("pageToken");
  const maxResults = searchParams.get("maxResults");

  if (!accountId || !videoId) {
    return NextResponse.json(
      { error: "accountId and videoId are required" },
      { status: 400 }
    );
  }

  // Get social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    })
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Verify permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, account.workspaceId, "social:view")
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account is not active" },
      { status: 403 }
    );
  }

  const accessToken = safeDecryptToken(account.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 }
    );
  }

  const client = new YouTubeClient({ accessToken });

  try {
    const result = await client.getCommentThreads(videoId, {
      pageToken: pageToken || undefined,
      maxResults: maxResults ? parseInt(maxResults) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube comments fetch failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { accountId, commentId, text } = body || {};

  if (!accountId || !commentId || !text) {
    return NextResponse.json(
      { error: "accountId, commentId, and text are required" },
      { status: 400 }
    );
  }

  // Get social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    })
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Verify permission - inbox:respond for replying
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, account.workspaceId, "inbox:respond")
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account is not active" },
      { status: 403 }
    );
  }

  const accessToken = safeDecryptToken(account.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 }
    );
  }

  const client = new YouTubeClient({ accessToken });

  try {
    const result = await client.replyToComment(commentId, text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube reply failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reply" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const commentId = searchParams.get("commentId");

  if (!accountId || !commentId) {
    return NextResponse.json(
      { error: "accountId and commentId are required" },
      { status: 400 }
    );
  }

  // Get social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
    })
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Verify permission - inbox:manage for deletion/moderation
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, account.workspaceId, "inbox:manage")
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account is not active" },
      { status: 403 }
    );
  }

  const accessToken = safeDecryptToken(account.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 }
    );
  }

  const client = new YouTubeClient({ accessToken });

  try {
    await client.moderateComment(commentId, "delete");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube delete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete comment" },
      { status: 500 }
    );
  }
}
