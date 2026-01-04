/**
 * Workspace Permission Middleware
 *
 * Server-side utilities for checking workspace permissions in API routes.
 * Follows the pattern established in admin-middleware.ts
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { WorkspaceRole } from "@prisma/client";
import type { Session } from "next-auth";
import { hasPermission, type WorkspaceAction } from "./permissions";

/**
 * Workspace member info returned from permission checks
 */
export interface WorkspaceMemberInfo {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

/**
 * Get user's membership in a workspace by workspace ID
 *
 * @param userId - User ID to check
 * @param workspaceId - Workspace ID to check membership in
 * @returns Membership info or null if not a member
 */
export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMemberInfo | null> {
  const { data: membership, error } = await tryCatch(
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
        joinedAt: { not: null }, // Must be accepted member
      },
      select: {
        workspaceId: true,
        userId: true,
        role: true,
      },
    }),
  );

  if (error) {
    console.error("Failed to fetch workspace membership:", error);
    return null;
  }

  return membership;
}

/**
 * Get user's membership in a workspace by workspace slug
 *
 * @param userId - User ID to check
 * @param workspaceSlug - Workspace slug to check membership in
 * @returns Membership info or null if not a member
 */
export async function getWorkspaceMembershipBySlug(
  userId: string,
  workspaceSlug: string,
): Promise<WorkspaceMemberInfo | null> {
  const { data: workspace, error: wsError } = await tryCatch(
    prisma.workspace.findUnique({
      where: { slug: workspaceSlug, deletedAt: null },
      select: { id: true },
    }),
  );

  if (wsError || !workspace) {
    return null;
  }

  return getWorkspaceMembership(userId, workspace.id);
}

/**
 * Check if user has permission in workspace
 *
 * @param userId - User ID to check
 * @param workspaceId - Workspace ID to check permission in
 * @param action - Action to check permission for
 * @returns true if user has permission
 */
export async function hasWorkspacePermission(
  userId: string,
  workspaceId: string,
  action: WorkspaceAction,
): Promise<boolean> {
  const membership = await getWorkspaceMembership(userId, workspaceId);

  if (!membership) {
    return false;
  }

  return hasPermission(membership.role, action);
}

/**
 * Require specific permission for API route access.
 * Throws an error if user lacks permission.
 *
 * @param session - NextAuth session object
 * @param workspaceId - Workspace ID to check permission in
 * @param action - Required action permission
 * @returns Membership info if authorized
 * @throws Error if user lacks permission
 *
 * @example
 * ```ts
 * export async function PATCH(request: NextRequest, { params }) {
 *   const session = await auth();
 *   const { workspaceId } = await params;
 *
 *   const { error } = await tryCatch(
 *     requireWorkspacePermission(session, workspaceId, "workspace:settings:write")
 *   );
 *
 *   if (error) {
 *     const status = error.message.includes("Unauthorized") ? 401 : 403;
 *     return NextResponse.json({ error: error.message }, { status });
 *   }
 *
 *   // Proceed with authorized action...
 * }
 * ```
 */
export async function requireWorkspacePermission(
  session: Session | null,
  workspaceId: string,
  action: WorkspaceAction,
): Promise<WorkspaceMemberInfo> {
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  const membership = await getWorkspaceMembership(session.user.id, workspaceId);

  if (!membership) {
    throw new Error("Forbidden: Not a workspace member");
  }

  if (!hasPermission(membership.role, action)) {
    throw new Error(`Forbidden: Requires ${action} permission`);
  }

  return membership;
}

/**
 * Require workspace membership (any role)
 *
 * @param session - NextAuth session object
 * @param workspaceId - Workspace ID to check membership in
 * @returns Membership info if authorized
 * @throws Error if not a member
 */
export async function requireWorkspaceMembership(
  session: Session | null,
  workspaceId: string,
): Promise<WorkspaceMemberInfo> {
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  const membership = await getWorkspaceMembership(session.user.id, workspaceId);

  if (!membership) {
    throw new Error("Forbidden: Not a workspace member");
  }

  return membership;
}

/**
 * Check if user is workspace owner
 *
 * @param userId - User ID to check
 * @param workspaceId - Workspace ID to check
 * @returns true if user is owner
 */
export async function isWorkspaceOwner(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  return membership?.role === "OWNER";
}

/**
 * Check if user is workspace admin or owner
 *
 * @param userId - User ID to check
 * @param workspaceId - Workspace ID to check
 * @returns true if user is admin or owner
 */
export async function isWorkspaceAdmin(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  return membership?.role === "OWNER" || membership?.role === "ADMIN";
}

/**
 * Get user's role in a workspace
 *
 * @param userId - User ID to check
 * @param workspaceId - Workspace ID to check
 * @returns User's role or null if not a member
 */
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  return membership?.role ?? null;
}
