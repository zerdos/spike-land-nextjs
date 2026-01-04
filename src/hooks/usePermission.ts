"use client";

import { useWorkspace } from "@/components/orbit/WorkspaceContext";
import { getPermittedActions, hasPermission, type WorkspaceAction } from "@/lib/permissions";
import type { WorkspaceRole } from "@prisma/client";
import { useMemo } from "react";

/**
 * Result of the usePermission hook
 */
export interface UsePermissionResult {
  /** Whether the current user can perform the action */
  can: boolean;
  /** Current user's role in the workspace */
  role: WorkspaceRole | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to check if current user has permission for an action
 * Gets workspace context from WorkspaceProvider
 *
 * @param action - The action to check permission for
 * @returns Permission check result with can, role, and isLoading
 *
 * @example
 * ```tsx
 * function SettingsButton() {
 *   const { can, isLoading } = usePermission("workspace:settings:write");
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!can) return null;
 *
 *   return <Button>Settings</Button>;
 * }
 * ```
 */
export function usePermission(action: WorkspaceAction): UsePermissionResult {
  const { workspace, isLoading } = useWorkspace();

  return useMemo(() => {
    if (isLoading || !workspace) {
      return {
        can: false,
        role: null,
        isLoading,
      };
    }

    return {
      can: hasPermission(workspace.role, action),
      role: workspace.role,
      isLoading: false,
    };
  }, [workspace, action, isLoading]);
}

/**
 * Result type for usePermissions hook with dynamic keys
 */
export type UsePermissionsResult<T extends Record<string, WorkspaceAction>> =
  & {
    [K in keyof T]: boolean;
  }
  & {
    isLoading: boolean;
    role: WorkspaceRole | null;
  };

/**
 * Hook to check multiple permissions at once
 *
 * @param actions - Object mapping names to actions to check
 * @returns Object with boolean results for each action plus isLoading and role
 *
 * @example
 * ```tsx
 * function ContentActions() {
 *   const permissions = usePermissions({
 *     canEdit: "content:edit:any",
 *     canDelete: "content:delete:any",
 *     canPublish: "content:publish",
 *   });
 *
 *   if (permissions.isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       {permissions.canEdit && <EditButton />}
 *       {permissions.canDelete && <DeleteButton />}
 *       {permissions.canPublish && <PublishButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissions<T extends Record<string, WorkspaceAction>>(
  actions: T,
): UsePermissionsResult<T> {
  const { workspace, isLoading } = useWorkspace();

  return useMemo(() => {
    const results: Record<string, boolean> = {};

    for (const [key, action] of Object.entries(actions)) {
      results[key] = workspace ? hasPermission(workspace.role, action) : false;
    }

    return {
      ...results,
      isLoading,
      role: workspace?.role ?? null,
    } as UsePermissionsResult<T>;
  }, [workspace, actions, isLoading]);
}

/**
 * Result of useAllPermissions hook
 */
export interface UseAllPermissionsResult {
  /** Array of all permitted actions for the current user */
  actions: WorkspaceAction[];
  /** Loading state */
  isLoading: boolean;
  /** Current user's role in the workspace */
  role: WorkspaceRole | null;
}

/**
 * Hook to get all permitted actions for current user
 *
 * @returns Object with actions array, isLoading, and role
 *
 * @example
 * ```tsx
 * function DebugPermissions() {
 *   const { actions, role, isLoading } = useAllPermissions();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <p>Role: {role}</p>
 *       <p>Can perform {actions.length} actions</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAllPermissions(): UseAllPermissionsResult {
  const { workspace, isLoading } = useWorkspace();

  return useMemo(() => {
    if (isLoading || !workspace) {
      return {
        actions: [],
        isLoading,
        role: null,
      };
    }

    return {
      actions: getPermittedActions(workspace.role),
      isLoading: false,
      role: workspace.role,
    };
  }, [workspace, isLoading]);
}
