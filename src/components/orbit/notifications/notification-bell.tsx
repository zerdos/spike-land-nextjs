"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { type UINotification, useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { AlertCircle, Bell, CheckCheck, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

/**
 * Props for the NotificationBell component
 */
export interface NotificationBellProps {
  /** The workspace slug to fetch notifications for */
  workspaceSlug: string;
  /** Custom class name for the bell button */
  className?: string;
  /** Custom poll interval in milliseconds (default: 30000) */
  pollInterval?: number;
}

/**
 * Get the icon for a notification type
 */
function NotificationIcon({
  type,
  className,
}: {
  type: UINotification["type"];
  className?: string;
}) {
  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: TriangleAlert,
    error: AlertCircle,
  };
  const Icon = iconMap[type];
  return <Icon className={className} />;
}

/**
 * Get the badge variant for a notification type
 */
function getTypeVariant(type: UINotification["type"]) {
  const variantMap: Record<
    UINotification["type"],
    "secondary" | "success" | "warning" | "destructive"
  > = {
    info: "secondary",
    success: "success",
    warning: "warning",
    error: "destructive",
  };
  return variantMap[type];
}

/**
 * Format a relative time string from a date
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return "Just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Single notification item in the dropdown
 */
function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: UINotification;
  onMarkAsRead: (id: string) => void;
}) {
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors cursor-pointer",
        "hover:bg-white/5",
        isUnread && "bg-white/5",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      data-testid={`notification-item-${notification.id}`}
    >
      <div
        className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          notification.type === "info" && "bg-aurora-teal/10 text-aurora-teal",
          notification.type === "success" &&
            "bg-aurora-green/10 text-aurora-green",
          notification.type === "warning" &&
            "bg-aurora-yellow/10 text-aurora-yellow",
          notification.type === "error" && "bg-destructive/10 text-destructive",
        )}
      >
        <NotificationIcon type={notification.type} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isUnread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {notification.title}
          </p>
          {isUnread && (
            <span
              className="h-2 w-2 rounded-full bg-aurora-teal flex-shrink-0 mt-1.5"
              aria-label="Unread"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={getTypeVariant(notification.type)} className="text-xs py-0">
            {notification.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );

  if (notification.linkUrl) {
    return (
      <Link
        href={notification.linkUrl}
        className="block"
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Loading skeleton for notification items
 */
function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when there are no notifications
 */
function EmptyNotifications() {
  return (
    <div
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
      data-testid="empty-notifications"
    >
      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No notifications</p>
      <p className="text-xs text-muted-foreground mt-1">
        You&apos;re all caught up!
      </p>
    </div>
  );
}

/**
 * NotificationBell component that displays a bell icon with an unread count badge
 * and a dropdown showing recent notifications.
 *
 * @example
 * ```tsx
 * <NotificationBell workspaceSlug="my-workspace" />
 * ```
 */
export function NotificationBell({
  workspaceSlug,
  className,
  pollInterval = 30000,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ workspaceSlug, pollInterval });

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead(id);
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          data-testid="notification-bell-trigger"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1",
                "flex items-center justify-center",
                "text-xs font-semibold text-white",
                "bg-aurora-teal rounded-full",
                "animate-in zoom-in-50 duration-200",
              )}
              data-testid="notification-badge"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        data-testid="notification-popover"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
              data-testid="mark-all-read-button"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[320px]">
          {isLoading
            ? (
              <div className="divide-y divide-white/5">
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </div>
            )
            : error
            ? (
              <div
                className="flex flex-col items-center justify-center py-8 px-4 text-center"
                data-testid="notification-error"
              >
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive">
                  Failed to load notifications
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please try again later
                </p>
              </div>
            )
            : notifications.length === 0
            ? <EmptyNotifications />
            : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </div>
            )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href={`/orbit/${workspaceSlug}/notifications`}>
                  View all notifications
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
