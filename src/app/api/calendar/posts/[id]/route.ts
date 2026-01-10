/**
 * Calendar Post Detail API Route
 *
 * GET /api/calendar/posts/[id] - Get a scheduled post by ID
 * PATCH /api/calendar/posts/[id] - Update a scheduled post
 * DELETE /api/calendar/posts/[id] - Delete a scheduled post
 *
 * Part of #574: Build Calendar UI
 */

import { auth } from "@/auth";
import { deleteScheduledPost, getScheduledPost, updateScheduledPost } from "@/lib/calendar";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { ScheduledPostStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Get just the workspaceId for a post (for permission checking)
 */
async function getPostWorkspaceId(postId: string): Promise<string | null> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    select: { workspaceId: true },
  });
  return post?.workspaceId ?? null;
}

interface UpdatePostBody {
  content?: string;
  scheduledAt?: string;
  timezone?: string;
  accountIds?: string[];
  recurrenceRule?: string | null;
  recurrenceEndAt?: string | null;
  status?: ScheduledPostStatus;
  metadata?: Record<string, unknown>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; },
): Promise<NextResponse> {
  const { id } = await params;

  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First get the workspaceId to check permissions
    const workspaceId = await getPostWorkspaceId(id);

    if (!workspaceId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify user has access to the workspace
    const { error: permError } = await tryCatch(
      requireWorkspaceMembership(session, workspaceId),
    );

    if (permError) {
      const httpStatus = permError.message.includes("Unauthorized") ? 401 : 403;
      return NextResponse.json({ error: permError.message }, { status: httpStatus });
    }

    // Now fetch the full post
    const post = await getScheduledPost(id, workspaceId);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Failed to fetch scheduled post:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled post" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; },
): Promise<NextResponse> {
  const { id } = await params;

  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdatePostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // First get the workspaceId to check permissions
    const workspaceId = await getPostWorkspaceId(id);

    if (!workspaceId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify user has access to the workspace
    const { error: permError } = await tryCatch(
      requireWorkspaceMembership(session, workspaceId),
    );

    if (permError) {
      const httpStatus = permError.message.includes("Unauthorized") ? 401 : 403;
      return NextResponse.json({ error: permError.message }, { status: httpStatus });
    }

    // Validate scheduledAt if provided
    let scheduledAt: Date | undefined;
    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        return NextResponse.json(
          { error: "scheduledAt must be a valid ISO date string" },
          { status: 400 },
        );
      }
      if (scheduledAt <= new Date()) {
        return NextResponse.json(
          { error: "Scheduled time must be in the future" },
          { status: 400 },
        );
      }
    }

    // Update the post
    const updatedPost = await updateScheduledPost(id, workspaceId, {
      content: body.content,
      scheduledAt,
      timezone: body.timezone,
      accountIds: body.accountIds,
      recurrenceRule: body.recurrenceRule,
      recurrenceEndAt: body.recurrenceEndAt ? new Date(body.recurrenceEndAt) : undefined,
      status: body.status,
      metadata: body.metadata as { mediaUrls?: string[]; link?: string; } | undefined,
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Failed to update scheduled post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update scheduled post" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; },
): Promise<NextResponse> {
  const { id } = await params;

  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First get the workspaceId to check permissions
    const workspaceId = await getPostWorkspaceId(id);

    if (!workspaceId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify user has access to the workspace
    const { error: permError } = await tryCatch(
      requireWorkspaceMembership(session, workspaceId),
    );

    if (permError) {
      const httpStatus = permError.message.includes("Unauthorized") ? 401 : 403;
      return NextResponse.json({ error: permError.message }, { status: httpStatus });
    }

    await deleteScheduledPost(id, workspaceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete scheduled post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete scheduled post" },
      { status: 500 },
    );
  }
}
