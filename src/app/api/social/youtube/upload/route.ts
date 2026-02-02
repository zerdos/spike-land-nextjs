
import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { YouTubeResumableUploader } from "@/lib/social/youtube/resumable-uploader";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    workspaceId,
    accountId,
    metadata,
    fileSize,
  } = body || {};

  if (!workspaceId || !accountId || !metadata || !fileSize) {
    return NextResponse.json(
      { error: "Missing required fields: workspaceId, accountId, metadata, fileSize" },
      { status: 400 }
    );
  }

  // Verify permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "content:create")
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Get social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId,
        platform: "YOUTUBE",
      },
    })
  );

  if (accountError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json(
      { error: "YouTube account not found or not connected to this workspace" },
      { status: 404 }
    );
  }

  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "YouTube account is not active. Please reconnect." },
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

  // Initiate upload
  const uploader = new YouTubeResumableUploader();

  // We mock a "File" object just to pass size to uploader.initiate
  // Ideally uploader.initiate should accept size directly, but it takes File | Buffer
  // The uploader uses getFileSize which checks file.size or file.length
  // I will update ResumableUploader.initiate to accept size if it's just meta initiation,
  // but for now I can pass a dummy object with size property as it is used in initiate only for headers.
  // Wait, initiate takes `options.file`.

  // Let's look at ResumableUploader.initiate again.
  // "X-Upload-Content-Length": this.getFileSize(options.file).toString(),

  // So I can pass { size: fileSize } as "File" casted.
  const dummyFile = { size: fileSize } as unknown as File;

  try {
    const { uploadUrl, sessionId } = await uploader.initiate(accessToken, {
        file: dummyFile,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
        privacyStatus: metadata.privacyStatus,
        publishAt: metadata.scheduledPublishTime,
    });

    // We can store the session here if we decide to use DB later.

    return NextResponse.json({
        uploadUrl,
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

  } catch (error) {
      console.error("YouTube upload initiation failed:", error);
      return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to initiate upload" },
          { status: 500 }
      );
  }
}
