/**
 * Calendar View API Route
 *
 * GET /api/calendar/view - Fetch calendar posts for a date range
 *
 * Query Parameters:
 * - workspaceId: Required. The workspace ID
 * - startDate: Required. ISO date string for range start
 * - endDate: Required. ISO date string for range end
 * - platforms: Optional. Comma-separated platform filter
 * - status: Optional. Comma-separated status filter
 *
 * Part of #574: Build Calendar UI
 */

import { auth } from "@/auth";
import { getCalendarView } from "@/lib/calendar";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import { tryCatch } from "@/lib/try-catch";
import type { ScheduledPostStatus, SocialPlatform } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const VALID_PLATFORMS: SocialPlatform[] = [
  "LINKEDIN",
  "TWITTER",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "DISCORD",
];

const VALID_STATUSES: ScheduledPostStatus[] = [
  "DRAFT",
  "PENDING",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const platformsParam = searchParams.get("platforms");
  const statusParam = searchParams.get("status");

  // Validate required parameters
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 },
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate query parameters are required" },
      { status: 400 },
    );
  }

  // Validate date formats
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use ISO date strings" },
      { status: 400 },
    );
  }

  // Parse and validate platforms
  let platforms: SocialPlatform[] | undefined;
  if (platformsParam) {
    const platformList = platformsParam.split(",").map((p) => p.trim().toUpperCase());
    const invalidPlatforms = platformList.filter(
      (p) => !VALID_PLATFORMS.includes(p as SocialPlatform),
    );
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platform(s): ${invalidPlatforms.join(", ")}` },
        { status: 400 },
      );
    }
    platforms = platformList as SocialPlatform[];
  }

  // Parse and validate status
  let status: ScheduledPostStatus[] | undefined;
  if (statusParam) {
    const statusList = statusParam.split(",").map((s) => s.trim().toUpperCase());
    const invalidStatuses = statusList.filter(
      (s) => !VALID_STATUSES.includes(s as ScheduledPostStatus),
    );
    if (invalidStatuses.length > 0) {
      return NextResponse.json(
        { error: `Invalid status(es): ${invalidStatuses.join(", ")}` },
        { status: 400 },
      );
    }
    status = statusList as ScheduledPostStatus[];
  }

  // Verify user has access to the workspace
  const { error: permError } = await tryCatch(
    requireWorkspaceMembership(session, workspaceId),
  );

  if (permError) {
    const httpStatus = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, {
      status: httpStatus,
    });
  }

  try {
    const result = await getCalendarView(workspaceId, { start, end });

    // Apply client-side filtering if specified
    let filteredPosts = result.posts;

    if (platforms && platforms.length > 0) {
      filteredPosts = filteredPosts.filter((post) =>
        post.platforms.some((p) => platforms.includes(p))
      );
    }

    if (status && status.length > 0) {
      filteredPosts = filteredPosts.filter((post) => status.includes(post.status));
    }

    return NextResponse.json({
      ...result,
      posts: filteredPosts,
    });
  } catch (error) {
    console.error("Failed to fetch calendar view:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar view" },
      { status: 500 },
    );
  }
}
