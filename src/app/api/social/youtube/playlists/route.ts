
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
  const pageToken = searchParams.get("pageToken");
  const maxResults = searchParams.get("maxResults");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
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
    return NextResponse.json({ error: permError.message }, { status: 403 });
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
    const result = await client.getPlaylists({
      pageToken: pageToken || undefined,
      maxResults: maxResults ? parseInt(maxResults) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube playlists fetch failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch playlists" },
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

  const { accountId, title, description, privacyStatus } = body || {};

  if (!accountId || !title) {
    return NextResponse.json(
      { error: "accountId and title are required" },
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
    requireWorkspacePermission(session, account.workspaceId, "content:create")
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 403 });
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
    const result = await client.createPlaylist(title, description, privacyStatus);
    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube playlist creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create playlist" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { accountId, playlistId, updates } = body || {};

  if (!accountId || !playlistId || !updates) {
    return NextResponse.json(
      { error: "accountId, playlistId, and updates are required" },
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
    requireWorkspacePermission(session, account.workspaceId, "content:edit:own")
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 403 });
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
    const result = await client.updatePlaylist(playlistId, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube playlist update failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update playlist" },
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
  const playlistId = searchParams.get("playlistId");

  if (!accountId || !playlistId) {
    return NextResponse.json(
      { error: "accountId and playlistId are required" },
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
    requireWorkspacePermission(session, account.workspaceId, "content:delete:own")
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 403 });
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
    await client.deletePlaylist(playlistId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube playlist deletion failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete playlist" },
      { status: 500 }
    );
  }
}
