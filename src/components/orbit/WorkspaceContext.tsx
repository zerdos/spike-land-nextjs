"use client";

import type {
  ExtendedWorkspaceContextValue,
  Workspace,
  WorkspaceWithMetadata,
} from "@/types/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ORBIT_STORAGE_KEY } from "./constants";

const WorkspaceContext = createContext<ExtendedWorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

interface WorkspacesApiResponse {
  workspaces: (Workspace & { isFavorite: boolean; })[];
  favorites: string[];
  recentIds: string[];
}

/**
 * Provider component for workspace management in the Orbit module.
 * Handles workspace fetching, switching, favorites, and recent access tracking.
 *
 * @example
 * ```tsx
 * <WorkspaceProvider>
 *   <OrbitApp />
 * </WorkspaceProvider>
 * ```
 */
export function WorkspaceProvider({
  children,
}: WorkspaceProviderProps): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();

  // Current workspace slug from URL or localStorage
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  // Extract URL slug from params
  const urlSlug = params?.["workspaceSlug"] as string | undefined;

  // Fetch workspaces with favorites and recents
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery<WorkspacesApiResponse>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }
      return response.json();
    },
  });

  const workspaces = useMemo<WorkspaceWithMetadata[]>(() => {
    if (!data) return [];

    const recentOrder = new Map(data.recentIds.map((id, idx) => [id, idx]));

    return data.workspaces.map((ws) => ({
      ...ws,
      isFavorite: ws.isFavorite,
      lastAccessedAt: recentOrder.has(ws.id)
        ? new Date() // Use current time as a proxy for recent access
        : null,
    }));
  }, [data]);

  const favoriteIds = useMemo(() => data?.favorites ?? [], [data]);
  const recentIds = useMemo(() => data?.recentIds ?? [], [data]);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const response = await fetch(`/api/workspaces/${workspaceId}/favorite`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to toggle favorite");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  // Record access mutation
  const recordAccessMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      // Record access in the background - don't block UI
      await fetch(`/api/workspaces/${workspaceId}/access`, {
        method: "POST",
      });
    },
  });

  // Initialize from URL param or localStorage
  useEffect(() => {
    if (urlSlug) {
      setCurrentSlug(urlSlug);
      if (typeof window !== "undefined") {
        localStorage.setItem(ORBIT_STORAGE_KEY, urlSlug);
      }
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ORBIT_STORAGE_KEY);
      if (stored) {
        setCurrentSlug(stored);
      }
    }
  }, [urlSlug]);

  // Auto-select first workspace if none selected
  useEffect(() => {
    const firstWorkspace = workspaces[0];
    if (!isLoading && firstWorkspace && !currentSlug) {
      setCurrentSlug(firstWorkspace.slug);
      if (typeof window !== "undefined") {
        localStorage.setItem(ORBIT_STORAGE_KEY, firstWorkspace.slug);
      }
    }
  }, [isLoading, workspaces, currentSlug]);

  // Sync across tabs using storage event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ORBIT_STORAGE_KEY && event.newValue !== null) {
        setCurrentSlug(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const workspace = workspaces.find((w) => w.slug === currentSlug) ?? null;

  const switchWorkspace = useCallback(
    (workspaceSlug: string) => {
      setCurrentSlug(workspaceSlug);
      if (typeof window !== "undefined") {
        localStorage.setItem(ORBIT_STORAGE_KEY, workspaceSlug);
      }

      // Find the workspace to record access
      const targetWorkspace = workspaces.find((w) => w.slug === workspaceSlug);
      if (targetWorkspace) {
        recordAccessMutation.mutate(targetWorkspace.id);
      }

      // Navigate to workspace dashboard
      router.push(`/orbit/${workspaceSlug}/dashboard`);
      // Invalidate workspace-specific queries
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceSlug] });
    },
    [router, queryClient, workspaces, recordAccessMutation],
  );

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const toggleFavorite = useCallback(
    async (workspaceId: string) => {
      await toggleFavoriteMutation.mutateAsync(workspaceId);
    },
    [toggleFavoriteMutation],
  );

  const recordAccess = useCallback(
    async (workspaceId: string) => {
      await recordAccessMutation.mutateAsync(workspaceId);
    },
    [recordAccessMutation],
  );

  const value = useMemo<ExtendedWorkspaceContextValue>(
    () => ({
      workspace,
      workspaces,
      isLoading,
      error: error as Error | null,
      switchWorkspace,
      refetch,
      favoriteIds,
      recentIds,
      toggleFavorite,
      recordAccess,
    }),
    [
      workspace,
      workspaces,
      isLoading,
      error,
      switchWorkspace,
      refetch,
      favoriteIds,
      recentIds,
      toggleFavorite,
      recordAccess,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Hook to access workspace context.
 * Must be used within a WorkspaceProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { workspace, workspaces, switchWorkspace, favoriteIds, toggleFavorite } = useWorkspace();
 *   return <div>Current: {workspace?.name}</div>;
 * }
 * ```
 *
 * @throws {Error} If used outside of WorkspaceProvider
 */
export function useWorkspace(): ExtendedWorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }

  return context;
}
