
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { YouTubeResumableUploader } from "@/lib/social/youtube/resumable-uploader";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { workspaceId, accountId, metadata, fileSize } = body;

  if (!workspaceId || !accountId || !metadata || !fileSize) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify access to workspace
  const { data: member, error: memberError } = await tryCatch(
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    })
  );

  if (memberError || !member) {
    return NextResponse.json({ error: "Unauthorized access to workspace" }, { status: 403 });
  }

  // Get account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId,
        platform: "YOUTUBE",
      },
    })
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "YouTube account not found" }, { status: 404 });
  }

  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  if (!accessToken) {
    return NextResponse.json({ error: "Failed to decrypt access token" }, { status: 500 });
  }

  const uploader = new YouTubeResumableUploader();

  const { data: result, error: uploadError } = await tryCatch(
    uploader.initiate(accessToken, {
      fileSize,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: metadata.categoryId,
      privacyStatus: metadata.privacyStatus,
      publishAt: metadata.scheduledPublishTime,
    })
  );

  if (uploadError) {
    console.error("Upload initiation failed", uploadError);
    return NextResponse.json({ error: "Failed to initiate upload" }, { status: 500 });
  }

  if (!result) {
      return NextResponse.json({ error: "Unknown error initiating upload" }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: result.uploadUrl,
    sessionId: result.sessionId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}
