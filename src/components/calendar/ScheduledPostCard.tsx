/**
 * ScheduledPostCard Component
 *
 * Displays a scheduled post item in the calendar with platform icons,
 * status indicator, and content preview.
 * Part of #574: Build Calendar UI
 */

"use client";

import type { SocialPlatform } from "@prisma/client";
import { format } from "date-fns";
import { AlertCircle, Check, Clock, Repeat, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { CalendarPostItem, ScheduledPostStatus } from "@/lib/calendar/types";

export interface ScheduledPostCardProps {
  post: CalendarPostItem;
  onClick?: (post: CalendarPostItem) => void;
  compact?: boolean;
  isDragging?: boolean;
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  LINKEDIN: "bg-[#0A66C2]",
  TWITTER: "bg-[#1DA1F2]",
  FACEBOOK: "bg-[#1877F2]",
  INSTAGRAM: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
  TIKTOK: "bg-black",
  YOUTUBE: "bg-[#FF0000]",
  DISCORD: "bg-[#5865F2]",
  PINTEREST: "Pinterest",
};

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  LINKEDIN: "in",
  TWITTER: "𝕏",
  FACEBOOK: "f",
  INSTAGRAM: "📷",
  TIKTOK: "♪",
  YOUTUBE: "▶",
  DISCORD: "🎮",
  PINTEREST: "Pinterest",
};

const STATUS_CONFIG: Record<
  ScheduledPostStatus,
  { icon: React.ReactNode; color: string; label: string; }
> = {
  DRAFT: {
    icon: <Clock className="h-3 w-3" />,
    color: "text-muted-foreground bg-muted",
    label: "Draft",
  },
  PENDING: {
    icon: <Clock className="h-3 w-3" />,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950",
    label: "Pending",
  },
  SCHEDULED: {
    icon: <Clock className="h-3 w-3" />,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950",
    label: "Scheduled",
  },
  PUBLISHING: {
    icon: <Send className="h-3 w-3 animate-pulse" />,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950",
    label: "Publishing",
  },
  PUBLISHED: {
    icon: <Check className="h-3 w-3" />,
    color: "text-green-600 bg-green-50 dark:bg-green-950",
    label: "Published",
  },
  FAILED: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "text-red-600 bg-red-50 dark:bg-red-950",
    label: "Failed",
  },
  CANCELLED: {
    icon: <X className="h-3 w-3" />,
    color: "text-gray-400 bg-gray-100 dark:bg-gray-800",
    label: "Cancelled",
  },
};

export function ScheduledPostCard({
  post,
  onClick,
  compact = false,
  isDragging = false,
}: ScheduledPostCardProps) {
  const statusConfig = STATUS_CONFIG[post.status];

  const handleClick = () => {
    if (onClick) {
      onClick(post);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-accent",
          statusConfig.color,
          isDragging && "opacity-50",
          post.status === "CANCELLED" && "opacity-60 line-through cancelled",
        )}
        data-testid="calendar-post-marker"
        data-post-id={post.id}
        data-status={post.status.toLowerCase()}
        aria-label={`Scheduled post: ${post.content.substring(0, 50)}`}
      >
        {/* Platform indicators */}
        <div className="flex -space-x-1">
          {post.platforms.slice(0, 3).map((platform) => (
            <span
              key={platform}
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white",
                PLATFORM_COLORS[platform],
              )}
              title={platform}
              data-testid={`platform-icon-${platform.toLowerCase()}`}
              data-platform={platform.toLowerCase()}
            >
              {PLATFORM_ICONS[platform]}
            </span>
          ))}
          {post.platforms.length > 3 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[8px] text-white">
              +{post.platforms.length - 3}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <span
          data-testid={`status-indicator-${post.status.toLowerCase()}`}
          className="sr-only"
        >
          {statusConfig.label}
        </span>

        {/* Time */}
        <span className="font-medium">{format(post.scheduledAt, "HH:mm")}</span>

        {/* Recurring indicator */}
        {post.isRecurring && (
          <Repeat
            className="h-3 w-3 text-muted-foreground"
            data-testid="recurring-indicator"
          />
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm",
        isDragging && "opacity-50 ring-2 ring-primary",
        post.status === "CANCELLED" && "opacity-60 cancelled",
      )}
      data-testid="calendar-post-marker"
      data-post-id={post.id}
      data-status={post.status.toLowerCase()}
      aria-label={`Scheduled post: ${post.content.substring(0, 50)}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {/* Platform icons */}
        <div className="flex -space-x-1">
          {post.platforms.map((platform) => (
            <span
              key={platform}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                PLATFORM_COLORS[platform],
              )}
              title={platform}
              data-testid={`platform-icon-${platform.toLowerCase()}`}
              data-platform={platform.toLowerCase()}
            >
              {PLATFORM_ICONS[platform]}
            </span>
          ))}
        </div>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn("text-xs", statusConfig.color)}
          data-testid={`status-indicator-${post.status.toLowerCase()}`}
        >
          {statusConfig.icon}
          <span className="ml-1">{statusConfig.label}</span>
        </Badge>
      </div>

      {/* Content preview */}
      <p
        className={cn(
          "line-clamp-2 text-sm text-foreground",
          post.status === "CANCELLED" && "line-through",
        )}
      >
        {post.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(post.scheduledAt, "h:mm a")}</span>
        {post.isRecurring && (
          <span
            className="flex items-center gap-1"
            data-testid="recurring-indicator"
          >
            <Repeat className="h-3 w-3" />
            Recurring
          </span>
        )}
      </div>
    </div>
  );
}
