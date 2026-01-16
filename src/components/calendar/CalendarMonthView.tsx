/**
 * CalendarMonthView Component
 *
 * Displays a full month grid with scheduled posts.
 * Part of #574: Build Calendar UI
 */

"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

import type { CalendarPostItem } from "@/lib/calendar/types";
import { CalendarDayCell } from "./CalendarDayCell";

export interface CalendarMonthViewProps {
  currentDate: Date;
  posts: CalendarPostItem[];
  onPostClick?: (post: CalendarPostItem) => void;
  onDayClick?: (date: Date) => void;
  onReschedule?: (postId: string, newDate: Date) => void;
  isLoading?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonthView({
  currentDate,
  posts,
  onPostClick,
  onDayClick,
  onReschedule,
  isLoading,
}: CalendarMonthViewProps) {
  const [draggingPost, setDraggingPost] = useState<CalendarPostItem | null>(
    null,
  );
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  // Calculate days to display (including padding days from prev/next month)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group posts by date
  const postsByDate = posts.reduce<Record<string, CalendarPostItem[]>>(
    (acc, post) => {
      const dateKey = format(post.scheduledAt, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(post);
      return acc;
    },
    {},
  );

  const getPostsForDate = useCallback(
    (date: Date): CalendarPostItem[] => {
      const dateKey = format(date, "yyyy-MM-dd");
      return postsByDate[dateKey] || [];
    },
    [postsByDate],
  );

  const handlePostDragStart = (post: CalendarPostItem) => {
    setDraggingPost(post);
  };

  const handlePostDragEnd = () => {
    setDraggingPost(null);
    setDragOverDate(null);
  };

  const handleDrop = (date: Date) => {
    if (draggingPost && onReschedule) {
      // Keep the same time, just change the date
      const originalTime = new Date(draggingPost.scheduledAt);
      const newScheduledAt = new Date(date);
      newScheduledAt.setHours(
        originalTime.getHours(),
        originalTime.getMinutes(),
        originalTime.getSeconds(),
        originalTime.getMilliseconds(),
      );
      onReschedule(draggingPost.id, newScheduledAt);
    }
    handlePostDragEnd();
  };

  return (
    <div
      className={cn("rounded-lg border bg-card", isLoading && "opacity-60")}
      data-testid="calendar-month-view"
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r p-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <CalendarDayCell
            key={day.toISOString()}
            date={day}
            currentMonth={currentDate}
            posts={getPostsForDate(day)}
            onPostClick={onPostClick}
            onDayClick={onDayClick}
            onPostDragStart={handlePostDragStart}
            onPostDragEnd={handlePostDragEnd}
            onDrop={handleDrop}
            isDragOver={dragOverDate !== null && isSameDay(day, dragOverDate)}
          />
        ))}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
