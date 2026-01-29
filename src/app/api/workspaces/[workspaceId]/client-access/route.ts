/**
 * Client Access Management API
 *
 * GET /api/workspaces/[workspaceId]/client-access - List all client access
 * POST /api/workspaces/[workspaceId]/client-access - Grant client access
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { grantClientAccessSchema } from "@/lib/validations/client-portal";
import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/client-access
 * List all client access for a workspace
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const { workspaceId } = await params;

  // Verify user has permission to manage clients (admin only)
  const { error: authError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "members:list"),
  );

  if (authError) {
    const status = authError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: authError.message }, { status });
  }

  // Fetch all client access for this workspace
  const { data: clientAccess, error } = await tryCatch(
    prisma.clientPortalAccess.findMany({
      where: { workspaceId },
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
      orderBy: { createdAt: "desc" },
    }),
  );

  if (error) {
    console.error("Failed to fetch client access:", error);
    return NextResponse.json(
      { error: "Failed to fetch client access" },
      { status: 500 },
    );
  }

  return NextResponse.json({ clientAccess: clientAccess || [] });
}

/**
 * POST /api/workspaces/[workspaceId]/client-access
 * Grant client access to workspace
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const { workspaceId } = await params;

  // Verify user has permission to manage clients (admin only)
  const { error: authError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "members:invite"),
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

  const validation = grantClientAccessSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const {
    clientId,
    canViewContent,
    canComment,
    canApprove,
    canViewAnalytics,
    accessibleContentIds,
    accessibleFolderIds,
    expiresAt,
  } = validation.data;

  // Verify the user being granted access exists and is CLIENT role
  const { data: client, error: clientError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, role: true },
    }),
  );

  if (clientError || !client) {
    return NextResponse.json({ error: "Client user not found" }, { status: 404 });
  }

  if (client.role !== UserRole.CLIENT) {
    return NextResponse.json(
      { error: "User must have CLIENT role to be granted access" },
      { status: 400 },
    );
  }

  // Create or update client access
  const { data: access, error: accessError } = await tryCatch(
    prisma.clientPortalAccess.upsert({
      where: {
        clientId_workspaceId: { clientId, workspaceId },
      },
      create: {
        clientId,
        workspaceId,
        canViewContent,
        canComment,
        canApprove,
        canViewAnalytics,
        accessibleContentIds: accessibleContentIds ? accessibleContentIds : undefined,
        accessibleFolderIds: accessibleFolderIds ? accessibleFolderIds : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      update: {
        canViewContent,
        canComment,
        canApprove,
        canViewAnalytics,
        accessibleContentIds: accessibleContentIds ? accessibleContentIds : undefined,
        accessibleFolderIds: accessibleFolderIds ? accessibleFolderIds : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
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

  if (accessError || !access) {
    console.error("Failed to grant client access:", accessError);
    return NextResponse.json(
      { error: "Failed to grant client access" },
      { status: 500 },
    );
  }

  return NextResponse.json({ access }, { status: 201 });
}
