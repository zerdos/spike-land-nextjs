/**
 * CalendarDayCell Component
 *
 * Renders a single day cell in the calendar month view
 * with scheduled posts and drag-and-drop support.
 * Part of #574: Build Calendar UI
 */

"use client";

import { format, isFuture, isSameMonth, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import type { CalendarPostItem } from "@/lib/calendar/types";
import { ScheduledPostCard } from "./ScheduledPostCard";

export interface CalendarDayCellProps {
  date: Date;
  currentMonth: Date;
  posts: CalendarPostItem[];
  onPostClick?: (post: CalendarPostItem) => void;
  onDayClick?: (date: Date) => void;
  onPostDragStart?: (post: CalendarPostItem) => void;
  onPostDragEnd?: () => void;
  onDrop?: (date: Date) => void;
  isDragOver?: boolean;
  maxVisiblePosts?: number;
}

export function CalendarDayCell({
  date,
  currentMonth,
  posts,
  onPostClick,
  onDayClick,
  onPostDragStart,
  onPostDragEnd,
  onDrop,
  isDragOver = false,
  maxVisiblePosts = 3,
}: CalendarDayCellProps) {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const isFutureDate = isFuture(date);
  const dayName = format(date, "EEEE").toLowerCase();
  const visiblePosts = posts.slice(0, maxVisiblePosts);
  const hiddenPostsCount = posts.length - maxVisiblePosts;

  const handleDayClick = (e: React.MouseEvent) => {
    // Only trigger day click if clicking on empty area (not a post)
    if ((e.target as HTMLElement).closest("[data-testid^='scheduled-post-']")) {
      return;
    }
    onDayClick?.(date);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onDayClick?.(date);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(date);
  };

  const handlePostDragStart = (e: React.DragEvent, post: CalendarPostItem) => {
    e.dataTransfer.setData("text/plain", post.id);
    e.dataTransfer.effectAllowed = "move";
    onPostDragStart?.(post);
  };

  const handlePostDragEnd = () => {
    onPostDragEnd?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleDayClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "min-h-[120px] border-b border-r p-1 transition-colors",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isDragOver && "bg-primary/10 ring-2 ring-inset ring-primary",
        "hover:bg-accent/50 cursor-pointer",
      )}
      data-testid="calendar-date-cell"
      data-date={format(date, "yyyy-MM-dd")}
      data-future={isFutureDate ? "true" : "false"}
      data-day={dayName}
      aria-label={`${format(date, "EEEE, MMMM d, yyyy")}${
        posts.length > 0 ? `, ${posts.length} scheduled posts` : ""
      }`}
    >
      {/* Day number */}
      <div className="mb-1 flex justify-end">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
            isTodayDate && "bg-primary text-primary-foreground",
            !isCurrentMonth && !isTodayDate && "text-muted-foreground",
          )}
        >
          {format(date, "d")}
        </span>
      </div>

      {/* Posts */}
      <div className="space-y-1">
        {visiblePosts.map((post) => (
          <div
            key={post.id}
            draggable
            onDragStart={(e) => handlePostDragStart(e, post)}
            onDragEnd={handlePostDragEnd}
          >
            <ScheduledPostCard
              post={post}
              onClick={onPostClick}
              compact
            />
          </div>
        ))}

        {/* Hidden posts indicator */}
        {hiddenPostsCount > 0 && (
          <button
            className="w-full rounded bg-muted/50 px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick?.(date);
            }}
            data-testid="more-posts-button"
          >
            +{hiddenPostsCount} more
          </button>
        )}
      </div>
    </div>
  );
}
