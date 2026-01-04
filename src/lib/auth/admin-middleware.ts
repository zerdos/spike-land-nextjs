/**
 * Admin Middleware
 *
 * This module provides utilities for checking admin permissions in API routes and UI components.
 * It checks if a user has ADMIN or SUPER_ADMIN role.
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Checks if a session has admin privileges (ADMIN or SUPER_ADMIN role).
 * Now that role is included in the session type, this check is reliable.
 *
 * @param session - NextAuth session object
 * @returns boolean - true if user is admin, false otherwise
 */
export function isAdmin(session: Session | null): boolean {
  if (!session?.user?.id) {
    return false;
  }

  // Role is now properly included in session via JWT callback
  const role = session.user.role;
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

/**
 * Checks if a user has admin privileges by fetching from database.
 * Use this when session doesn't have role information.
 *
 * @param userId - User ID to check
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdminByUserId(userId: string): Promise<boolean> {
  const { data: user, error } = await tryCatch(
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  );

  if (error) {
    console.error("Failed to check admin status:", error);
    return false;
  }

  return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
}

/**
 * Requires admin role for API route access.
 * Throws an error if user is not admin.
 *
 * @param session - NextAuth session object
 * @throws Error if user is not authenticated or not admin
 */
export function requireAdmin(session: Session | null): void {
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  if (!isAdmin(session)) {
    throw new Error("Forbidden: Admin access required");
  }
}

/**
 * Requires admin role by checking database.
 * Use this when session doesn't have role information.
 *
 * @param userId - User ID to check
 * @throws Error if user is not admin
 */
export async function requireAdminByUserId(userId: string): Promise<void> {
  const isUserAdmin = await isAdminByUserId(userId);

  if (!isUserAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
}

/**
 * Checks if a user is super admin.
 *
 * @param userId - User ID to check
 * @returns Promise<boolean> - true if user is super admin, false otherwise
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data: user, error } = await tryCatch(
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  );

  if (error) {
    console.error("Failed to check super admin status:", error);
    return false;
  }

  return user?.role === UserRole.SUPER_ADMIN;
}
