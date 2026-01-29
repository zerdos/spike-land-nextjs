/**
 * Individual Client Access API
 *
 * GET /api/workspaces/[workspaceId]/client-access/[clientId] - Get client access details
 * PATCH /api/workspaces/[workspaceId]/client-access/[clientId] - Update permissions
 * DELETE /api/workspaces/[workspaceId]/client-access/[clientId] - Revoke access
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { updateClientAccessSchema } from "@/lib/validations/client-portal";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceId: string; clientId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/client-access/[clientId]
 * Get specific client access details
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const { workspaceId, clientId } = await params;

  // Verify user has permission
  const { error: authError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "members:list"),
  );

  if (authError) {
    const status = authError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: authError.message }, { status });
  }

  // Fetch client access
  const { data: access, error } = await tryCatch(
    prisma.clientPortalAccess.findUnique({
      where: {
        clientId_workspaceId: { clientId, workspaceId },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    }),
  );

  if (error) {
    console.error("Failed to fetch client access:", error);
    return NextResponse.json(
      { error: "Failed to fetch client access" },
      { status: 500 },
    );
  }

  if (!access) {
    return NextResponse.json(
      { error: "Client access not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ access });
}

/**
 * PATCH /api/workspaces/[workspaceId]/client-access/[clientId]
 * Update client access permissions
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const { workspaceId, clientId } = await params;

  // Verify user has permission to manage clients
  const { error: authError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "members:remove"),
  );

  if (authError) {
    const status = authError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: authError.message }, { status });
  }

  // Parse and validate request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = updateClientAccessSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const {
    canViewContent,
    canComment,
    canApprove,
    canViewAnalytics,
    accessibleContentIds,
    accessibleFolderIds,
    expiresAt,
  } = validation.data;

  // Build update data only for provided fields
  const updateData: Record<string, unknown> = {};
  if (canViewContent !== undefined) updateData["canViewContent"] = canViewContent;
  if (canComment !== undefined) updateData["canComment"] = canComment;
  if (canApprove !== undefined) updateData["canApprove"] = canApprove;
  if (canViewAnalytics !== undefined) updateData["canViewAnalytics"] = canViewAnalytics;
  if (accessibleContentIds !== undefined) updateData["accessibleContentIds"] = accessibleContentIds ? accessibleContentIds : undefined;
  if (accessibleFolderIds !== undefined) updateData["accessibleFolderIds"] = accessibleFolderIds ? accessibleFolderIds : undefined;
  if (expiresAt !== undefined) updateData["expiresAt"] = expiresAt ? new Date(expiresAt) : null;

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  // Update client access
  const { data: access, error: updateError } = await tryCatch(
    prisma.clientPortalAccess.update({
      where: {
        clientId_workspaceId: { clientId, workspaceId },
      },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    }),
  );

  if (updateError) {
    console.error("Failed to update client access:", updateError);
    if (updateError.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Client access not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update client access" },
      { status: 500 },
    );
  }

  return NextResponse.json({ access });
}

/**
 * DELETE /api/workspaces/[workspaceId]/client-access/[clientId]
 * Revoke client access
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const { workspaceId, clientId } = await params;

  // Verify user has permission to manage clients
  const { error: authError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "members:remove"),
  );

  if (authError) {
    const status = authError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: authError.message }, { status });
  }

  // Delete client access
  const { error: deleteError } = await tryCatch(
    prisma.clientPortalAccess.delete({
      where: {
        clientId_workspaceId: { clientId, workspaceId },
      },
    }),
  );

  if (deleteError) {
    console.error("Failed to revoke client access:", deleteError);
    if (deleteError.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Client access not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Failed to revoke client access" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
