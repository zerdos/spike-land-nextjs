/**
 * Calendar Posts API Route
 *
 * POST /api/calendar/posts - Create a new scheduled post
 *
 * Part of #574: Build Calendar UI
 */

import { auth } from "@/auth";
import { createScheduledPost, schedulePost } from "@/lib/calendar";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface CreatePostBody {
  workspaceId: string;
  content: string;
  scheduledAt: string;
  timezone?: string;
  accountIds: string[];
  recurrenceRule?: string;
  recurrenceEndAt?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    workspaceId,
    content,
    scheduledAt,
    timezone,
    accountIds,
    recurrenceRule,
    recurrenceEndAt,
    metadata,
  } = body;

  // Validate required fields
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 },
    );
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "content is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "scheduledAt is required" },
      { status: 400 },
    );
  }

  const scheduledAtDate = new Date(scheduledAt);
  if (isNaN(scheduledAtDate.getTime())) {
    return NextResponse.json(
      { error: "scheduledAt must be a valid ISO date string" },
      { status: 400 },
    );
  }

  if (scheduledAtDate <= new Date()) {
    return NextResponse.json(
      { error: "Scheduled time must be in the future" },
      { status: 400 },
    );
  }

  if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
    return NextResponse.json(
      { error: "Please select at least one account" },
      { status: 400 },
    );
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
    // Create the post
    const post = await createScheduledPost(workspaceId, session.user.id, {
      content: content.trim(),
      scheduledAt: scheduledAtDate,
      timezone: timezone || "UTC",
      accountIds,
      recurrenceRule,
      recurrenceEndAt: recurrenceEndAt ? new Date(recurrenceEndAt) : undefined,
      metadata: metadata as { mediaUrls?: string[]; link?: string; } | undefined,
    });

    // Automatically schedule the post if it's ready
    await schedulePost(post.id, workspaceId);

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Failed to create scheduled post:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to create scheduled post",
      },
      { status: 500 },
    );
  }
}
