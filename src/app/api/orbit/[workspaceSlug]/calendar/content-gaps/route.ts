/**
 * Content Gap Detection API
 *
 * Analyzes scheduled content against optimal posting times to identify
 * gaps in the content calendar during high-engagement periods.
 *
 * Resolves #869
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { detectContentGaps } from "@/lib/calendar/content-gaps";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { SocialPlatform } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/calendar/content-gaps
 *
 * Query parameters:
 * - days: Number of days ahead to analyze (default: 7, max: 30)
 * - platform: Filter by specific platform (optional)
 * - timezone: Timezone for analysis (default: UTC)
 *
 * Returns content gaps sorted by severity (high first).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify membership
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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const daysParam = searchParams.get("days");
  const platformParam = searchParams.get("platform");
  const timezone = searchParams.get("timezone") || "UTC";

  // Validate days parameter
  let daysAhead = 7;
  if (daysParam) {
    const parsedDays = parseInt(daysParam, 10);
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 30) {
      return NextResponse.json(
        { error: "days must be a number between 1 and 30" },
        { status: 400 },
      );
    }
    daysAhead = parsedDays;
  }

  // Validate platform parameter
  const validPlatforms: SocialPlatform[] = [
    "LINKEDIN",
    "TWITTER",
    "FACEBOOK",
    "INSTAGRAM",
    "TIKTOK",
    "YOUTUBE",
  ];
  let platform: SocialPlatform | undefined;
  if (platformParam) {
    const upperPlatform = platformParam.toUpperCase() as SocialPlatform;
    if (!validPlatforms.includes(upperPlatform)) {
      return NextResponse.json(
        { error: `Invalid platform. Valid options: ${validPlatforms.join(", ")}` },
        { status: 400 },
      );
    }
    platform = upperPlatform;
  }

  // Detect content gaps
  const { data: result, error: gapError } = await tryCatch(
    detectContentGaps({
      workspaceId: workspace.id,
      daysAhead,
      platform,
      timezone,
    }),
  );

  if (gapError) {
    console.error("Failed to detect content gaps:", gapError);
    return NextResponse.json(
      { error: "Failed to analyze content gaps" },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
