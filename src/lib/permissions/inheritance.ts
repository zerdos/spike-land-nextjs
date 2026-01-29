import prisma from "@/lib/prisma";
import type { WorkspaceRole } from "@prisma/client";

/**
 * Role mapping for inheritance
 * Maps parent role to child role
 */
export interface RoleMapping {
  [parentRole: string]: WorkspaceRole;
}

/**
 * Default role mapping (parent role -> child role)
 */
const DEFAULT_ROLE_MAPPING: RoleMapping = {
  OWNER: "ADMIN" as WorkspaceRole,
  ADMIN: "MEMBER" as WorkspaceRole,
  MEMBER: "VIEWER" as WorkspaceRole,
  VIEWER: "VIEWER" as WorkspaceRole,
};

/**
 * Configure role inheritance for a workspace
 */
export async function configureInheritance(
  workspaceId: string,
  parentWorkspaceId: string | null,
  options: {
    inheritPermissions?: boolean;
    inheritMembers?: boolean;
    roleMapping?: RoleMapping;
  }
): Promise<void> {
  const { inheritPermissions = true, inheritMembers = false, roleMapping } =
    options;

  // Check if workspace already has inheritance configured
  const existing = await prisma.workspaceRoleInheritance.findUnique({
    where: { workspaceId },
  });

  if (existing) {
    // Update existing configuration
    await prisma.workspaceRoleInheritance.update({
      where: { workspaceId },
      data: {
        parentWorkspaceId,
        inheritPermissions,
        inheritMembers,
        roleMapping: roleMapping || DEFAULT_ROLE_MAPPING,
      },
    });
  } else {
    // Create new configuration
    await prisma.workspaceRoleInheritance.create({
      data: {
        workspaceId,
        parentWorkspaceId,
        inheritPermissions,
        inheritMembers,
        roleMapping: roleMapping || DEFAULT_ROLE_MAPPING,
      },
    });
  }

  // If inheritMembers is enabled, sync members
  if (inheritMembers && parentWorkspaceId) {
    await syncInheritedMembers(workspaceId, parentWorkspaceId, roleMapping);
  }
}

/**
 * Get effective role for a user in a workspace, considering inheritance
 */
export async function getEffectiveRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  // First check direct membership
  const directMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (directMember) {
    return directMember.role;
  }

  // Check for inherited role
  const inheritance = await prisma.workspaceRoleInheritance.findUnique({
    where: { workspaceId },
    include: {
      parentWorkspace: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (
    !inheritance ||
    !inheritance.inheritPermissions ||
    !inheritance.parentWorkspace
  ) {
    return null;
  }

  const parentMember = inheritance.parentWorkspace.members[0];
  if (!parentMember) {
    return null;
  }

  // Map parent role to child role
  const roleMapping = (inheritance.roleMapping as RoleMapping) ||
    DEFAULT_ROLE_MAPPING;
  const mappedRole = roleMapping[parentMember.role];

  return mappedRole || null;
}

/**
 * Check if user has permission in workspace (considering inheritance)
 */
export async function hasPermission(
  workspaceId: string,
  userId: string,
  requiredRole: WorkspaceRole
): Promise<boolean> {
  const effectiveRole = await getEffectiveRole(workspaceId, userId);

  if (!effectiveRole) {
    return false;
  }

  // Role hierarchy: OWNER > ADMIN > MEMBER > VIEWER
  const roleHierarchy: Record<WorkspaceRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  return roleHierarchy[effectiveRole] >= roleHierarchy[requiredRole];
}

/**
 * Sync members from parent workspace to child workspace
 */
async function syncInheritedMembers(
  workspaceId: string,
  parentWorkspaceId: string,
  roleMapping?: RoleMapping
): Promise<void> {
  const mapping = roleMapping || DEFAULT_ROLE_MAPPING;

  // Get all parent workspace members
  const parentMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: parentWorkspaceId },
  });

  // Get existing child workspace members
  const existingMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId },
  });

  const existingUserIds = new Set(existingMembers.map((m) => m.userId));

  // Add new members with mapped roles
  const newMembers = parentMembers
    .filter((pm) => !existingUserIds.has(pm.userId))
    .map((pm) => ({
      workspaceId,
      userId: pm.userId,
      role: mapping[pm.role] || pm.role,
      invitedById: pm.userId, // Parent member invited them
    }));

  if (newMembers.length > 0) {
    await prisma.workspaceMember.createMany({
      data: newMembers,
      skipDuplicates: true,
    });
  }
}

/**
 * Get all child workspaces for a parent workspace
 */
export async function getChildWorkspaces(
  parentWorkspaceId: string
): Promise<string[]> {
  const children = await prisma.workspaceRoleInheritance.findMany({
    where: { parentWorkspaceId },
    select: { workspaceId: true },
  });

  return children.map((c) => c.workspaceId);
}

/**
 * Get parent workspace for a child workspace
 */
export async function getParentWorkspace(
  workspaceId: string
): Promise<string | null> {
  const inheritance = await prisma.workspaceRoleInheritance.findUnique({
    where: { workspaceId },
    select: { parentWorkspaceId: true },
  });

  return inheritance?.parentWorkspaceId || null;
}

/**
 * Remove inheritance configuration
 */
export async function removeInheritance(workspaceId: string): Promise<void> {
  await prisma.workspaceRoleInheritance.delete({
    where: { workspaceId },
  });
}

/**
 * Get inheritance configuration for a workspace
 */
export async function getInheritanceConfig(workspaceId: string) {
  return prisma.workspaceRoleInheritance.findUnique({
    where: { workspaceId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      parentWorkspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}
