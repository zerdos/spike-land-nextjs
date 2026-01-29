/**
 * Client Permission Middleware
 *
 * Server-side utilities for checking CLIENT role permissions and access control.
 * Implements whitelist-based security model for client collaboration portal.
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Client access info returned from permission checks
 */
export interface ClientAccessInfo {
  clientId: string;
  workspaceId: string;
  canViewContent: boolean;
  canComment: boolean;
  canApprove: boolean;
  canViewAnalytics: boolean;
  accessibleContentIds: string[] | null;
  accessibleFolderIds: string[] | null;
}

/**
 * Checks if a session belongs to a CLIENT role user
 *
 * @param session - NextAuth session object
 * @returns boolean - true if user is CLIENT, false otherwise
 */
export function isClient(session: Session | null): boolean {
  if (!session?.user?.id) {
    return false;
  }

  return session.user.role === UserRole.CLIENT;
}

/**
 * Checks if a user has CLIENT role by fetching from database
 *
 * @param userId - User ID to check
 * @returns Promise<boolean> - true if user is CLIENT, false otherwise
 */
export async function isClientByUserId(userId: string): Promise<boolean> {
  const { data: user, error } = await tryCatch(
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  );

  if (error) {
    console.error("Failed to check client status:", error);
    return false;
  }

  return user?.role === UserRole.CLIENT;
}

/**
 * Get client's access permissions for a workspace
 *
 * @param clientId - Client user ID
 * @param workspaceId - Workspace ID to check access for
 * @returns Client access info or null if no access
 */
export async function getClientAccess(
  clientId: string,
  workspaceId: string,
): Promise<ClientAccessInfo | null> {
  const { data: access, error } = await tryCatch(
    prisma.clientPortalAccess.findUnique({
      where: {
        clientId_workspaceId: { clientId, workspaceId },
      },
      select: {
        clientId: true,
        workspaceId: true,
        canViewContent: true,
        canComment: true,
        canApprove: true,
        canViewAnalytics: true,
        accessibleContentIds: true,
        accessibleFolderIds: true,
        expiresAt: true,
      },
    }),
  );

  if (error) {
    console.error("Failed to fetch client access:", error);
    return null;
  }

  // Check if access has expired
  if (access?.expiresAt && access.expiresAt < new Date()) {
    return null;
  }

  if (!access) {
    return null;
  }

  return {
    clientId: access.clientId,
    workspaceId: access.workspaceId,
    canViewContent: access.canViewContent,
    canComment: access.canComment,
    canApprove: access.canApprove,
    canViewAnalytics: access.canViewAnalytics,
    accessibleContentIds:
      (access.accessibleContentIds as string[] | null) ?? null,
    accessibleFolderIds:
      (access.accessibleFolderIds as string[] | null) ?? null,
  };
}

/**
 * Check if client can access specific content
 *
 * @param clientId - Client user ID
 * @param workspaceId - Workspace ID
 * @param contentId - Content ID to check access for
 * @returns true if client has access
 */
export async function canAccessContent(
  clientId: string,
  workspaceId: string,
  contentId: string,
): Promise<boolean> {
  const access = await getClientAccess(clientId, workspaceId);

  if (!access || !access.canViewContent) {
    return false;
  }

  // If accessibleContentIds is null, client has access to all content
  if (access.accessibleContentIds === null) {
    return true;
  }

  // Check if contentId is in the whitelist
  return access.accessibleContentIds.includes(contentId);
}

/**
 * Require CLIENT role for API route access
 * Throws an error if user is not a client
 *
 * @param session - NextAuth session object
 * @throws Error if user is not authenticated or not a client
 */
export function requireClient(session: Session | null): void {
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  if (!isClient(session)) {
    throw new Error("Forbidden: Client access required");
  }
}

/**
 * Require client access to a workspace
 * Throws an error if client doesn't have access
 *
 * @param session - NextAuth session object
 * @param workspaceId - Workspace ID to check access for
 * @returns Client access info if authorized
 * @throws Error if client lacks access
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest, { params }) {
 *   const session = await auth();
 *   const { workspaceId } = await params;
 *
 *   const { data: access, error } = await tryCatch(
 *     requireClientAccess(session, workspaceId)
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
export async function requireClientAccess(
  session: Session | null,
  workspaceId: string,
): Promise<ClientAccessInfo> {
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  // Verify user is CLIENT role
  if (!isClient(session)) {
    throw new Error("Forbidden: Client access required");
  }

  const access = await getClientAccess(session.user.id, workspaceId);

  if (!access) {
    throw new Error("Forbidden: No access to this workspace");
  }

  return access;
}

/**
 * Require client access to specific content
 * Throws an error if client can't access the content
 *
 * @param session - NextAuth session object
 * @param workspaceId - Workspace ID
 * @param contentId - Content ID to check access for
 * @returns Client access info if authorized
 * @throws Error if client lacks access
 */
export async function requireContentAccess(
  session: Session | null,
  workspaceId: string,
  contentId: string,
): Promise<ClientAccessInfo> {
  const access = await requireClientAccess(session, workspaceId);

  if (!access.canViewContent) {
    throw new Error("Forbidden: Cannot view content");
  }

  // If accessibleContentIds is null, client has access to all content
  if (access.accessibleContentIds === null) {
    return access;
  }

  // Check if contentId is in the whitelist
  if (!access.accessibleContentIds.includes(contentId)) {
    throw new Error("Forbidden: No access to this content");
  }

  return access;
}

/**
 * Enforces client permissions - prevents clients from accessing internal data
 * Use as middleware guard in API routes
 *
 * @param session - NextAuth session object
 * @param workspaceId - Workspace ID
 * @param action - Action client is attempting
 * @returns true if client can perform action
 */
export async function enforceClientPermissions(
  session: Session | null,
  workspaceId: string,
  action: "view" | "comment" | "approve" | "analytics",
): Promise<boolean> {
  if (!session?.user?.id || !isClient(session)) {
    return false;
  }

  const access = await getClientAccess(session.user.id, workspaceId);

  if (!access) {
    return false;
  }

  switch (action) {
    case "view":
      return access.canViewContent;
    case "comment":
      return access.canComment;
    case "approve":
      return access.canApprove;
    case "analytics":
      return access.canViewAnalytics;
    default:
      return false;
  }
}

/**
 * Filter content IDs by client access
 * Returns only content IDs that the client can access
 *
 * @param clientId - Client user ID
 * @param workspaceId - Workspace ID
 * @param contentIds - Array of content IDs to filter
 * @returns Filtered array of accessible content IDs
 */
export async function filterContentByClientAccess(
  clientId: string,
  workspaceId: string,
  contentIds: string[],
): Promise<string[]> {
  const access = await getClientAccess(clientId, workspaceId);

  if (!access || !access.canViewContent) {
    return [];
  }

  // If accessibleContentIds is null, all content is accessible
  if (access.accessibleContentIds === null) {
    return contentIds;
  }

  // Return intersection of requested IDs and accessible IDs
  return contentIds.filter((id) => access.accessibleContentIds!.includes(id));
}
