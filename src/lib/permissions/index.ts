/**
 * Workspace Permissions Module
 *
 * Re-exports all permission utilities for workspace RBAC.
 *
 * @example
 * ```ts
 * // Server-side (API routes)
 * import { requireWorkspacePermission } from "@/lib/permissions";
 *
 * // Client-side (components)
 * import { hasPermission, type WorkspaceAction } from "@/lib/permissions";
 * ```
 */

// Core permission logic
export {
  canModifyRole,
  compareRoles,
  getAllActions,
  getPermittedActions,
  getRequiredRole,
  hasPermission,
  isAtLeast,
  type WorkspaceAction,
} from "./permissions";

// Server-side middleware
export {
  getWorkspaceMembership,
  getWorkspaceMembershipBySlug,
  getWorkspaceRole,
  hasWorkspacePermission,
  isWorkspaceAdmin,
  isWorkspaceOwner,
  requireWorkspaceMembership,
  requireWorkspacePermission,
  type WorkspaceMemberInfo,
} from "./workspace-middleware";
