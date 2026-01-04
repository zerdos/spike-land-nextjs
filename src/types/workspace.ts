import type { WorkspaceRole } from "@prisma/client";

/**
 * Workspace with user's role information
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  isPersonal: boolean;
  role: WorkspaceRole;
}

/**
 * Context value for workspace management
 */
export interface WorkspaceContextValue {
  /** Currently selected workspace */
  workspace: Workspace | null;
  /** All workspaces the user has access to */
  workspaces: Workspace[];
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Switch to a different workspace by slug */
  switchWorkspace: (workspaceSlug: string) => void;
  /** Refetch workspaces from API */
  refetch: () => Promise<void>;
}

/**
 * API response for GET /api/workspaces
 */
export interface WorkspacesApiResponse {
  workspaces: Workspace[];
}
