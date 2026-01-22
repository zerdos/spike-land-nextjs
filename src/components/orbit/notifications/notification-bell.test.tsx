import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

// Mock the useNotifications hook
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockRefetch = vi.fn();
const mockUseNotifications = vi.fn();

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: (options: { workspaceSlug: string; }) => mockUseNotifications(options),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockNotifications = [
  {
    id: "notif-1",
    title: "New comment on your post",
    message: "John commented on your latest post about marketing strategies.",
    type: "info" as const,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    readAt: null,
    linkUrl: "/orbit/test-workspace/posts/123",
  },
  {
    id: "notif-2",
    title: "Campaign approved",
    message: "Your Q1 campaign has been approved and is now live.",
    type: "success" as const,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    readAt: null,
  },
  {
    id: "notif-3",
    title: "Budget warning",
    message: "Your ad spend is approaching 80% of the monthly budget.",
    type: "warning" as const,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    readAt: new Date().toISOString(),
  },
  {
    id: "notif-4",
    title: "Integration error",
    message: "Facebook API connection failed. Please reconnect your account.",
    type: "error" as const,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    readAt: new Date().toISOString(),
  },
];

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkAsRead.mockResolvedValue(undefined);
    mockMarkAllAsRead.mockResolvedValue(undefined);
  });

  describe("loading state", () => {
    it("shows skeleton loading state", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: true,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      // Should show skeletons
      const popover = screen.getByTestId("notification-popover");
      expect(popover).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no notifications", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.getByTestId("empty-notifications")).toBeInTheDocument();
      expect(screen.getByText("No notifications")).toBeInTheDocument();
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error state when fetch fails", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: new Error("Failed to fetch"),
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.getByTestId("notification-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to load notifications")).toBeInTheDocument();
    });
  });

  describe("badge display", () => {
    it("shows unread count badge when there are unread notifications", () => {
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const badge = screen.getByTestId("notification-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("2");
    });

    it("shows 99+ when unread count exceeds 99", () => {
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 150,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const badge = screen.getByTestId("notification-badge");
      expect(badge).toHaveTextContent("99+");
    });

    it("does not show badge when there are no unread notifications", () => {
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications.map((n) => ({
          ...n,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    });
  });

  describe("popover content", () => {
    it("displays notifications in dropdown", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.getByText("New comment on your post")).toBeInTheDocument();
      expect(screen.getByText("Campaign approved")).toBeInTheDocument();
      expect(screen.getByText("Budget warning")).toBeInTheDocument();
      expect(screen.getByText("Integration error")).toBeInTheDocument();
    });

    it("shows notification type badges", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.getByText("info")).toBeInTheDocument();
      expect(screen.getByText("success")).toBeInTheDocument();
      expect(screen.getByText("warning")).toBeInTheDocument();
      expect(screen.getByText("error")).toBeInTheDocument();
    });

    it("shows relative time for notifications", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.getByText("5m ago")).toBeInTheDocument();
      expect(screen.getByText("2h ago")).toBeInTheDocument();
      expect(screen.getByText("1d ago")).toBeInTheDocument();
      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });

    it("shows Mark all as read button when there are unread notifications", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.getByTestId("mark-all-read-button")).toBeInTheDocument();
    });

    it("does not show Mark all as read button when all notifications are read", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications.map((n) => ({
          ...n,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      expect(screen.queryByTestId("mark-all-read-button")).not.toBeInTheDocument();
    });

    it("shows View all notifications link", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      const viewAllLink = screen.getByText("View all notifications");
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest("a")).toHaveAttribute(
        "href",
        "/orbit/test-workspace/notifications",
      );
    });
  });

  describe("mark as read functionality", () => {
    it("calls markAsRead when clicking an unread notification", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      const notificationItem = screen.getByTestId("notification-item-notif-1");
      await user.click(notificationItem);

      expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1");
    });

    it("does not call markAsRead when clicking a read notification", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      // notif-3 is already read
      const notificationItem = screen.getByTestId("notification-item-notif-3");
      await user.click(notificationItem);

      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it("calls markAllAsRead when clicking Mark all as read button", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      const markAllButton = screen.getByTestId("mark-all-read-button");
      await user.click(markAllButton);

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label on bell button", () => {
      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      expect(trigger).toHaveAttribute("aria-label", "Notifications (2 unread)");
    });

    it("has proper aria-label when no unread notifications", () => {
      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      expect(trigger).toHaveAttribute("aria-label", "Notifications");
    });

    it("supports keyboard navigation on notification items", async () => {
      const user = userEvent.setup();

      mockUseNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(<NotificationBell workspaceSlug="test-workspace" />);

      const trigger = screen.getByTestId("notification-bell-trigger");
      await user.click(trigger);

      const notificationItem = screen.getByTestId("notification-item-notif-1");
      notificationItem.focus();
      await user.keyboard("{Enter}");

      expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1");
    });
  });

  describe("custom props", () => {
    it("applies custom className to bell button", () => {
      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(
        <NotificationBell
          workspaceSlug="test-workspace"
          className="custom-class"
        />,
      );

      const trigger = screen.getByTestId("notification-bell-trigger");
      expect(trigger).toHaveClass("custom-class");
    });

    it("passes pollInterval to useNotifications", () => {
      mockUseNotifications.mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        refetch: mockRefetch,
      });

      render(
        <NotificationBell workspaceSlug="test-workspace" pollInterval={60000} />,
      );

      expect(mockUseNotifications).toHaveBeenCalledWith({
        workspaceSlug: "test-workspace",
        pollInterval: 60000,
      });
    });
  });
});
