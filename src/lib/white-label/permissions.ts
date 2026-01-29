import type { Workspace, WorkspaceMember, WorkspaceSubscriptionTier } from '@/generated/prisma';

/**
 * Check if a workspace can access white-label features
 * White-label features are available for PRO and BUSINESS tiers only
 *
 * @param workspace - The workspace to check
 * @returns True if workspace has PRO or BUSINESS subscription
 */
export function canAccessWhiteLabel(
  workspace: Pick<Workspace, 'subscriptionTier'>
): boolean {
  return workspace.subscriptionTier === 'PRO' || workspace.subscriptionTier === 'BUSINESS';
}

/**
 * Check if a workspace member can configure white-label settings
 * Only OWNER and ADMIN roles can modify white-label configuration
 *
 * @param workspace - The workspace to check
 * @param member - The workspace member to check
 * @returns True if member has permission to configure white-label settings
 */
export function canConfigureWhiteLabel(
  workspace: Pick<Workspace, 'subscriptionTier'>,
  member: Pick<WorkspaceMember, 'role'>
): boolean {
  // First check if workspace has access to white-label features
  if (!canAccessWhiteLabel(workspace)) {
    return false;
  }

  // Then check if member has appropriate role
  return member.role === 'OWNER' || member.role === 'ADMIN';
}

/**
 * Check if a workspace member can configure custom domain
 * Only OWNER and ADMIN roles with PRO/BUSINESS tier can configure domains
 *
 * @param workspace - The workspace to check
 * @param member - The workspace member to check
 * @returns True if member has permission to configure custom domain
 */
export function canConfigureDomain(
  workspace: Pick<Workspace, 'subscriptionTier'>,
  member: Pick<WorkspaceMember, 'role'>
): boolean {
  // Custom domain configuration has the same requirements as general white-label config
  return canConfigureWhiteLabel(workspace, member);
}

/**
 * Check if a workspace member can delete white-label configuration
 * Only OWNER role can delete white-label configuration
 *
 * @param member - The workspace member to check
 * @returns True if member has permission to delete white-label config
 */
export function canDeleteWhiteLabelConfig(
  member: Pick<WorkspaceMember, 'role'>
): boolean {
  return member.role === 'OWNER';
}

/**
 * Get the subscription tier required for white-label features
 * @returns Array of subscription tiers that support white-label
 */
export function getWhiteLabelTiers(): WorkspaceSubscriptionTier[] {
  return ['PRO', 'BUSINESS'];
}

/**
 * Get a user-friendly message about white-label tier requirements
 * @returns Message explaining tier requirements
 */
export function getWhiteLabelTierMessage(): string {
  return 'White-label features require a PRO or BUSINESS subscription. Upgrade your workspace to access custom branding, domains, and email configuration.';
}

/**
 * Get a user-friendly message about white-label permission requirements
 * @returns Message explaining permission requirements
 */
export function getWhiteLabelPermissionMessage(): string {
  return 'Only workspace owners and administrators can configure white-label settings.';
}
