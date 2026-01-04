"use client";

import type { Workspace, WorkspaceContextValue } from "@/types/workspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * Provider component for workspace management in the Orbit module.
 * Handles workspace fetching, switching, and localStorage persistence.
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

  // Fetch workspaces
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }
      const result = await response.json();
      return result.workspaces as Workspace[];
    },
  });

  const workspaces = useMemo(() => data ?? [], [data]);

  // Initialize from URL param or localStorage
  useEffect(() => {
    const urlSlug = params?.workspaceSlug as string | undefined;

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
  }, [params?.workspaceSlug]);

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
      // Navigate to workspace dashboard
      router.push(`/orbit/${workspaceSlug}/dashboard`);
      // Invalidate workspace-specific queries
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceSlug] });
    },
    [router, queryClient],
  );

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      workspaces,
      isLoading,
      error: error as Error | null,
      switchWorkspace,
      refetch,
    }),
    [workspace, workspaces, isLoading, error, switchWorkspace, refetch],
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
 *   const { workspace, workspaces, switchWorkspace } = useWorkspace();
 *   return <div>Current: {workspace?.name}</div>;
 * }
 * ```
 *
 * @throws {Error} If used outside of WorkspaceProvider
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }

  return context;
}
