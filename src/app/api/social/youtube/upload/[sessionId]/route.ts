
import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/social/token-refresh";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { pollVideoProcessingStatus } from "@/lib/social/youtube/video-processor";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  const { sessionId } = params;

  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const accountId = searchParams.get("accountId");
  const videoId = searchParams.get("videoId"); // If provided, check processing

  if (!workspaceId || !accountId) {
    return NextResponse.json(
      { error: "Missing required query params: workspaceId, accountId" },
      { status: 400 }
    );
  }

  // Verify permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "social:read")
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
    getValidAccessToken(account)
  );

  if (tokenError || !tokenResult) {
    return NextResponse.json(
      { error: "Failed to authenticate with YouTube" },
      { status: 401 }
    );
  }

  // If videoId is provided, check processing status
  if (videoId) {
    const client = new YouTubeClient({ accessToken: tokenResult.accessToken });

    // Check once (no polling loop)
    const result = await pollVideoProcessingStatus(client, videoId, {
      maxAttempts: 1,
      intervalMs: 0,
    });

    return NextResponse.json({
      status: result.status,
      processingDetails: result.processingDetails,
    });
  }

  // Fallback: If no videoId, we can't check much without DB persistence of sessionId
  // Return a generic "uploading" status or 400
  return NextResponse.json({
    status: "unknown",
    message: "Provide videoId to check processing status. Session tracking not implemented yet.",
    sessionId
  });
}
