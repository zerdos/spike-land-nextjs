/**
 * Policy Check API
 *
 * POST /api/orbit/[workspaceSlug]/policy/check - Check content against policies
 *
 * Request Body:
 * - contentType: POST | AD | COMMENT | MESSAGE | BIO | STORY
 * - contentText: string (required)
 * - contentId?: string (optional reference to existing content)
 * - platform?: SocialPlatform (target platform)
 * - checkScope?: FULL | QUICK | CUSTOM
 * - contentMetadata?: { mediaUrls, mediaTypes, links, hashtags, mentions, language }
 *
 * Resolves #584: Build Policy Checker
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { checkContent } from "@/lib/policy-checker";
import type { PolicyCheckInput } from "@/lib/policy-checker";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { PolicyCheckScope, PolicyContentType, SocialPlatform } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * POST /api/orbit/[workspaceSlug]/policy/check - Check content against policies
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is a member
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.contentText || typeof body.contentText !== "string") {
    return NextResponse.json(
      { error: "contentText is required and must be a string" },
      { status: 400 },
    );
  }

  if (!body.contentType) {
    return NextResponse.json({ error: "contentType is required" }, { status: 400 });
  }

  const validContentTypes = ["POST", "AD", "COMMENT", "MESSAGE", "BIO", "STORY"];
  if (!validContentTypes.includes(body.contentType)) {
    return NextResponse.json(
      { error: `contentType must be one of: ${validContentTypes.join(", ")}` },
      { status: 400 },
    );
  }

  // Build check input
  const checkInput: PolicyCheckInput = {
    contentType: body.contentType as PolicyContentType,
    contentText: body.contentText,
    contentId: body.contentId,
    platform: body.platform as SocialPlatform | undefined,
    checkScope: (body.checkScope as PolicyCheckScope) ?? "FULL",
    contentMetadata: body.contentMetadata,
  };

  // Perform policy check
  const { data: result, error: checkError } = await tryCatch(
    checkContent(workspace.id, checkInput, session.user.id),
  );

  if (checkError) {
    console.error("Policy check error:", checkError);
    return NextResponse.json(
      { error: "Failed to perform policy check" },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
