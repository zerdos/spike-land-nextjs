/**
 * Notifications API Route
 *
 * GET - List notifications for a workspace
 * POST - Create a new notification
 *
 * Resolves #802
 */

import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/notification-service";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Query parameters for listing notifications
 */
const listQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  unreadOnly: z.string().optional(),
});

/**
 * Request body for creating a notification
 */
const createBodySchema = z.object({
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  userId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/orbit/[workspaceSlug]/notifications
 *
 * List notifications for a workspace with optional filtering
 */
export async function GET(
  request: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  // Validate workspaceSlug parameter
  if (!params.workspaceSlug) {
    return NextResponse.json({ error: "Workspace slug is required" }, {
      status: 400,
    });
  }

  const session = await auth();
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());

  const validated = listQuerySchema.safeParse(query);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues },
      { status: 400 },
    );
  }

  const { limit, offset, unreadOnly } = validated.data;

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

    const result = await NotificationService.list(workspace.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      unreadOnly: unreadOnly === "true",
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to list notifications";

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
 * POST /api/orbit/[workspaceSlug]/notifications
 *
 * Create a new notification for the workspace
 */
export async function POST(
  request: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  // Validate workspaceSlug parameter
  if (!params.workspaceSlug) {
    return NextResponse.json({ error: "Workspace slug is required" }, {
      status: 400,
    });
  }

  const session = await auth();
  const body = await request.json();

  const validated = createBodySchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues },
      { status: 400 },
    );
  }

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

    const { metadata, ...restData } = validated.data;
    const notification = await NotificationService.create({
      workspaceId: workspace.id,
      ...restData,
      metadata: metadata as Prisma.JsonValue,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to create notification";

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
