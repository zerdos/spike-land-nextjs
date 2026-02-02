
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { pollVideoProcessingStatus } from "@/lib/social/youtube/video-processor";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId: videoId } = params; // Using sessionId as videoId
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const accountId = searchParams.get("accountId");

  if (!workspaceId || !accountId) {
    return NextResponse.json(
      { error: "Missing required parameters: workspaceId, accountId" },
      { status: 400 }
    );
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

  // Check status once
  try {
    const result = await pollVideoProcessingStatus(accessToken, videoId, {
      maxAttempts: 1,
      intervalMs: 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to check video status:", error);
    return NextResponse.json(
      { error: "Failed to check video status" },
      { status: 500 }
    );
  }
}
