import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/social/token-refresh";
import { YouTubeResumableUploader } from "@/lib/social/youtube/resumable-uploader";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { workspaceId, accountId, metadata, fileSize } = body;

  if (!workspaceId || !accountId || !metadata) {
    return NextResponse.json(
      { error: "Missing required fields: workspaceId, accountId, metadata" },
      { status: 400 },
    );
  }

  // Verify permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "social:post"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Get account
  const account = await prisma.socialAccount.findUnique({
    where: {
      id: accountId,
      workspaceId,
      platform: "YOUTUBE",
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get valid access token
  const { data: tokenResult, error: tokenError } = await tryCatch(
    getValidAccessToken(account),
  );

  if (tokenError || !tokenResult) {
    console.error("Token retrieval failed:", tokenError);
    return NextResponse.json(
      { error: "Failed to authenticate with YouTube" },
      { status: 401 },
    );
  }

  // Initiate upload
  const uploader = new YouTubeResumableUploader();

  // Construct metadata for uploader
  const videoMetadata = {
    fileSize, // Pass explicit file size
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
    categoryId: metadata.categoryId,
    privacyStatus: metadata.privacyStatus,
    publishAt: metadata.scheduledPublishTime,
  };

  const { data: uploadResult, error: uploadError } = await tryCatch(
    uploader.initiate(tokenResult.accessToken, videoMetadata),
  );

  if (uploadError || !uploadResult) {
    console.error("Upload initiation failed:", uploadError);
    return NextResponse.json(
      { error: `Failed to initiate upload: ${uploadError?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    uploadUrl: uploadResult.uploadUrl,
    sessionId: uploadResult.sessionId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  });
}
