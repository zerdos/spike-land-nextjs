"use client";

import { usePermission } from "@/hooks/usePermission";
import type { WorkspaceAction } from "@/lib/permissions";
import type { ComponentType, ReactNode } from "react";

interface PermissionGateProps {
  /** Action to check permission for */
  action: WorkspaceAction;
  /** Content to render when permitted */
  children: ReactNode;
  /** Optional fallback when not permitted (defaults to null) */
  fallback?: ReactNode;
  /** Show loading skeleton while checking (defaults to false) */
  showLoading?: boolean;
}

/**
 * Conditionally renders children based on workspace permission
 *
 * @example
 * ```tsx
 * // Hide element if no permission
 * <PermissionGate action="workspace:settings:write">
 *   <Button>Edit Settings</Button>
 * </PermissionGate>
 *
 * // Show fallback when no permission
 * <PermissionGate
 *   action="analytics:export"
 *   fallback={<Tooltip content="Requires Admin access"><Button disabled>Export</Button></Tooltip>}
 * >
 *   <Button>Export Data</Button>
 * </PermissionGate>
 *
 * // Show loading state
 * <PermissionGate action="members:invite" showLoading>
 *   <InviteMembersForm />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  action,
  children,
  fallback = null,
  showLoading = false,
}: PermissionGateProps): ReactNode {
  const { can, isLoading } = usePermission(action);

  if (isLoading && showLoading) {
    return <div className="h-8 w-24 animate-pulse rounded bg-muted" />;
  }

  if (isLoading) {
    return null;
  }

  return can ? children : fallback;
}

/**
 * Props for components wrapped with withPermission HOC
 */
type WithPermissionProps = {
  /** Override the permission check (useful for testing) */
  permissionOverride?: boolean;
};

/**
 * Higher-Order Component for permission-gated components
 *
 * @param WrappedComponent - Component to wrap
 * @param action - Action to check permission for
 * @param fallback - Optional fallback when no permission
 * @returns Wrapped component that only renders when permitted
 *
 * @example
 * ```tsx
 * const AdminSettingsButton = withPermission(
 *   SettingsButton,
 *   "workspace:settings:write"
 * );
 *
 * // With fallback
 * const InviteButton = withPermission(
 *   InviteMemberButton,
 *   "members:invite",
 *   <DisabledInviteButton />
 * );
 *
 * // Usage
 * <AdminSettingsButton onClick={handleClick} />
 * ```
 */
export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  action: WorkspaceAction,
  fallback?: ReactNode,
): ComponentType<P & WithPermissionProps> {
  function WithPermission(props: P & WithPermissionProps): ReactNode {
    const { permissionOverride, ...restProps } = props;
    const { can, isLoading } = usePermission(action);

    // Allow override for testing
    const hasPermission = permissionOverride ?? can;

    if (isLoading) {
      return null;
    }

    if (!hasPermission) {
      return fallback ?? null;
    }

    return <WrappedComponent {...(restProps as P)} />;
  }

  // Set display name for debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";
  WithPermission.displayName = `WithPermission(${displayName})`;

  return WithPermission;
}
