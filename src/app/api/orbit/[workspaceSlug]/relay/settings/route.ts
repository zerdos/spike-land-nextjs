/**
 * Relay Approval Settings API
 *
 * GET /api/orbit/[workspaceSlug]/relay/settings - Get approval settings
 * PUT /api/orbit/[workspaceSlug]/relay/settings - Update approval settings
 *
 * Resolves #569: Build Relay approval workflow
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  getApprovalSettings,
  type RelayApprovalSettings,
  updateApprovalSettings,
} from "@/lib/relay";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/relay/settings - Get approval settings
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug
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
        settings: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  const settings = getApprovalSettings(
    workspace.settings as Record<string, unknown> | null,
  );

  return NextResponse.json({ settings });
}

/**
 * PUT /api/orbit/[workspaceSlug]/relay/settings - Update approval settings
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is admin/owner
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: {
              in: ["OWNER", "ADMIN"],
            },
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
      { error: "Workspace not found or insufficient permissions" },
      { status: 404 },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const updates = body as Partial<RelayApprovalSettings>;

  // Validate the updates
  if (updates.autoApproveThreshold !== undefined) {
    if (updates.autoApproveThreshold < 0 || updates.autoApproveThreshold > 1) {
      return NextResponse.json(
        { error: "autoApproveThreshold must be between 0 and 1" },
        { status: 400 },
      );
    }
  }

  if (updates.escalationTimeoutHours !== undefined) {
    if (
      updates.escalationTimeoutHours !== null &&
      updates.escalationTimeoutHours < 0
    ) {
      return NextResponse.json(
        { error: "escalationTimeoutHours must be null or a positive number" },
        { status: 400 },
      );
    }
  }

  if (updates.approverRoles !== undefined) {
    const validRoles = ["OWNER", "ADMIN", "MEMBER"];
    if (!updates.approverRoles.every((role) => validRoles.includes(role))) {
      return NextResponse.json(
        { error: `approverRoles must be one of: ${validRoles.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Update settings
  const { data: newSettings, error: updateError } = await tryCatch(
    updateApprovalSettings(workspace.id, updates),
  );

  if (updateError) {
    console.error("Failed to update approval settings:", updateError);
    return NextResponse.json(
      { error: "Failed to update approval settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({ settings: newSettings });
}
