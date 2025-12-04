/**
 * Admin Bootstrap Logic
 *
 * This module handles the automatic promotion of the first user to ADMIN role.
 * The first registered user becomes ADMIN automatically.
 * All subsequent users get USER role by default.
 */

import prisma from "@/lib/prisma"
import { UserRole } from "@prisma/client"

/**
 * Checks if any admin exists in the system.
 *
 * @returns Promise<boolean> - true if at least one admin exists, false otherwise
 */
export async function hasAnyAdmin(): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: {
      OR: [
        { role: UserRole.ADMIN },
        { role: UserRole.SUPER_ADMIN }
      ]
    }
  })

  return adminCount > 0
}

/**
 * Bootstraps admin role for the first user.
 * If no admin exists and this is a new user, grants ADMIN role.
 *
 * @param userId - The user ID to check and potentially promote
 * @returns Promise<boolean> - true if user was promoted to admin, false otherwise
 */
export async function bootstrapAdminIfNeeded(userId: string): Promise<boolean> {
  try {
    // Check if any admin already exists
    const adminExists = await hasAnyAdmin()

    // If admin already exists, don't promote this user
    if (adminExists) {
      return false
    }

    // No admin exists - promote this user to ADMIN
    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.ADMIN }
    })

    console.log(`First user ${userId} promoted to ADMIN role`)
    return true
  } catch (error) {
    console.error("Failed to bootstrap admin:", error)
    return false
  }
}
