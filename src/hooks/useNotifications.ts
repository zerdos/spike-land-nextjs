import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Notification type for the notification bell UI
 */
export interface UINotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: string;
  readAt: string | null;
  linkUrl?: string;
}

/**
 * Response from the notifications list endpoint
 */
interface NotificationsResponse {
  notifications: UINotification[];
  total: number;
  unreadCount: number;
}

/**
 * Response from the notifications count endpoint
 */
interface NotificationsCountResponse {
  unreadCount: number;
}

/**
 * Options for the useNotifications hook
 */
export interface UseNotificationsOptions {
  workspaceSlug: string;
  pollInterval?: number; // default 30000ms (30 seconds)
}

/**
 * Return type for the useNotifications hook
 */
export interface UseNotificationsReturn {
  notifications: UINotification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => void;
}

/**
 * React hook for managing notifications in the Orbit workspace
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   isLoading,
 *   markAsRead,
 *   markAllAsRead
 * } = useNotifications({ workspaceSlug: "my-workspace" });
 * ```
 */
export function useNotifications({
  workspaceSlug,
  pollInterval = 30000,
}: UseNotificationsOptions): UseNotificationsReturn {
  const queryClient = useQueryClient();

  // Query for fetching notifications
  const notificationsQuery = useQuery({
    queryKey: ["notifications", workspaceSlug],
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await fetch(`/api/orbit/${workspaceSlug}/notifications`);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    enabled: !!workspaceSlug,
    refetchInterval: pollInterval,
    staleTime: pollInterval / 2,
  });

  // Query for fetching unread count (lighter endpoint for polling)
  const countQuery = useQuery({
    queryKey: ["notifications-count", workspaceSlug],
    queryFn: async (): Promise<NotificationsCountResponse> => {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/notifications/count`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch notification count");
      }
      return response.json();
    },
    enabled: !!workspaceSlug,
    refetchInterval: pollInterval,
    staleTime: pollInterval / 2,
  });

  // Mutation for marking a single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/notifications/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readAt: new Date().toISOString() }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
    },
    onSuccess: () => {
      // Invalidate both queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["notifications", workspaceSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-count", workspaceSlug],
      });
    },
  });

  // Mutation for marking all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/notifications/mark-all-read`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
    },
    onSuccess: () => {
      // Invalidate both queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["notifications", workspaceSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-count", workspaceSlug],
      });
    },
  });

  // Callback to mark a single notification as read
  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation],
  );

  // Callback to mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  // Callback to manually refetch notifications
  const refetch = useCallback(() => {
    notificationsQuery.refetch();
    countQuery.refetch();
  }, [notificationsQuery, countQuery]);

  // Determine unread count from count query or notifications query
  const unreadCount = countQuery.data?.unreadCount ??
    notificationsQuery.data?.unreadCount ??
    0;

  return {
    notifications: notificationsQuery.data?.notifications ?? [],
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error ?? countQuery.error ?? null,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
