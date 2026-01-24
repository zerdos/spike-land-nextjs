/**
 * Notification Count API Route
 *
 * GET - Get unread notification count for a workspace
 *
 * Resolves #802
 */

import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/notification-service";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/orbit/[workspaceSlug]/notifications/count
 *
 * Get unread notification count for a workspace
 */
export async function GET(
  _request: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  // Validate workspaceSlug parameter
  if (!params.workspaceSlug) {
    return NextResponse.json({ error: "Workspace slug is required" }, {
      status: 400,
    });
  }

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

    await requireWorkspacePermission(session, workspace.id, "notifications:view");

    const count = await NotificationService.getUnreadCount(workspace.id);

    return NextResponse.json({ count });
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to get notification count";

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
