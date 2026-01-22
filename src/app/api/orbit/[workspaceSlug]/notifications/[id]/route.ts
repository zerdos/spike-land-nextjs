/**
 * Single Notification API Route
 *
 * PATCH - Mark notification as read
 * DELETE - Delete notification
 *
 * Resolves #802
 */

import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/notification-service";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * PATCH /api/orbit/[workspaceSlug]/notifications/[id]
 *
 * Mark a notification as read
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { workspaceSlug: string; id: string; }; },
) {
  const session = await auth();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    await requireWorkspacePermission(session, workspace.id, "notifications:manage");

    // Verify notification exists and belongs to workspace
    const existing = await NotificationService.getById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, {
        status: 404,
      });
    }

    if (existing.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Notification does not belong to this workspace" },
        { status: 403 },
      );
    }

    const notification = await NotificationService.markAsRead(params.id);
    return NextResponse.json(notification);
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to update notification";

    if (error instanceof Error) {
      const errWithStatus = error as Error & {
        status?: number;
        statusCode?: number;
      };
      if (typeof errWithStatus.status === "number") {
        status = errWithStatus.status;
      } else if (typeof errWithStatus.statusCode === "number") {
        status = errWithStatus.statusCode;
      }
      if (error.message) {
        message = error.message;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/orbit/[workspaceSlug]/notifications/[id]
 *
 * Delete a notification
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { workspaceSlug: string; id: string; }; },
) {
  const session = await auth();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    await requireWorkspacePermission(session, workspace.id, "notifications:manage");

    // Verify notification exists and belongs to workspace
    const existing = await NotificationService.getById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, {
        status: 404,
      });
    }

    if (existing.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Notification does not belong to this workspace" },
        { status: 403 },
      );
    }

    await NotificationService.delete(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to delete notification";

    if (error instanceof Error) {
      const errWithStatus = error as Error & {
        status?: number;
        statusCode?: number;
      };
      if (typeof errWithStatus.status === "number") {
        status = errWithStatus.status;
      } else if (typeof errWithStatus.statusCode === "number") {
        status = errWithStatus.statusCode;
      }
      if (error.message) {
        message = error.message;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
