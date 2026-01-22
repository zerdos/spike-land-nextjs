import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotifications } from "./useNotifications";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode; }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockNotifications = [
  {
    id: "notif-1",
    title: "New comment",
    message: "Someone commented on your post",
    type: "info" as const,
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  {
    id: "notif-2",
    title: "Approval needed",
    message: "A draft needs your approval",
    type: "warning" as const,
    createdAt: new Date().toISOString(),
    readAt: new Date().toISOString(),
  },
];

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetching notifications", () => {
    it("fetches notifications successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/notifications",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/notifications/count",
      );
    });

    it("handles fetch error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 0 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.error).not.toBeNull());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.error?.message).toBe("Failed to fetch notifications");
    });

    it("does not fetch when workspaceSlug is empty", () => {
      renderHook(() => useNotifications({ workspaceSlug: "" }), {
        wrapper: createWrapper(),
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", async () => {
      // Initial fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Setup mock for mark as read
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // Setup mocks for refetch after mutation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications.map((n) =>
              n.id === "notif-1"
                ? { ...n, readAt: new Date().toISOString() }
                : n
            ),
            total: 2,
            unreadCount: 0,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 0 }),
        });

      await act(async () => {
        await result.current.markAsRead("notif-1");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/notifications/notif-1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("readAt"),
        }),
      );
    });

    it("handles markAsRead error", async () => {
      // Initial fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Setup mock for mark as read error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        act(async () => {
          await result.current.markAsRead("notif-1");
        }),
      ).rejects.toThrow("Failed to mark notification as read");
    });
  });

  describe("markAllAsRead", () => {
    it("marks all notifications as read", async () => {
      // Initial fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Setup mock for mark all as read
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // Setup mocks for refetch after mutation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications.map((n) => ({
              ...n,
              readAt: new Date().toISOString(),
            })),
            total: 2,
            unreadCount: 0,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 0 }),
        });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/orbit/test-workspace/notifications/mark-all-read",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("handles markAllAsRead error", async () => {
      // Initial fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Setup mock for mark all as read error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        act(async () => {
          await result.current.markAllAsRead();
        }),
      ).rejects.toThrow("Failed to mark all notifications as read");
    });
  });

  describe("refetch", () => {
    it("manually refetches notifications", async () => {
      // Initial fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Setup mocks for refetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              ...mockNotifications,
              {
                id: "notif-3",
                title: "New notification",
                message: "A new notification arrived",
                type: "info" as const,
                createdAt: new Date().toISOString(),
                readAt: null,
              },
            ],
            total: 3,
            unreadCount: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 2 }),
        });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => expect(result.current.notifications.length).toBe(3));

      expect(result.current.unreadCount).toBe(2);
    });
  });

  describe("poll interval", () => {
    it("uses custom poll interval", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unreadCount: 1 }),
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace", pollInterval: 60000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.notifications).toEqual(mockNotifications);
    });
  });

  describe("unread count fallback", () => {
    it("uses notifications count when count query fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            total: 2,
            unreadCount: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(
        () => useNotifications({ workspaceSlug: "test-workspace" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should fall back to the unreadCount from notifications response
      expect(result.current.unreadCount).toBe(1);
    });
  });
});
