/**
 * useCalendarView Hook
 *
 * Fetches and manages calendar data for the scheduled posts calendar view
 * Part of #574: Build Calendar UI
 */

import type { SocialPlatform } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { useCallback, useState } from "react";

import type { CalendarPostItem, ScheduledPostStatus } from "@/lib/calendar/types";

export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarFilters {
  platforms?: SocialPlatform[];
  status?: ScheduledPostStatus[];
}

export interface UseCalendarViewOptions {
  workspaceId: string;
  enabled?: boolean;
  initialDate?: Date;
  initialViewMode?: CalendarViewMode;
}

export interface UseCalendarViewResult {
  posts: CalendarPostItem[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  filters: CalendarFilters;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setFilters: (filters: CalendarFilters) => void;
  dateRange: { start: Date; end: Date; };
}

async function fetchCalendarView(
  workspaceId: string,
  dateRange: { start: Date; end: Date; },
  filters: CalendarFilters,
): Promise<CalendarPostItem[]> {
  const params = new URLSearchParams({
    workspaceId,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
  });

  if (filters.platforms?.length) {
    params.set("platforms", filters.platforms.join(","));
  }

  if (filters.status?.length) {
    params.set("status", filters.status.join(","));
  }

  const response = await fetch(`/api/calendar/view?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch calendar" }));
    throw new Error(error.error || "Failed to fetch calendar");
  }

  const data = await response.json();
  return data.posts.map((post: CalendarPostItem) => ({
    ...post,
    scheduledAt: new Date(post.scheduledAt),
  }));
}

export function useCalendarView(options: UseCalendarViewOptions): UseCalendarViewResult {
  const { workspaceId, enabled = true, initialDate, initialViewMode = "month" } = options;

  const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialViewMode);
  const [filters, setFilters] = useState<CalendarFilters>({});

  const dateRange = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };

  const queryKey = [
    "calendar-view",
    workspaceId,
    dateRange.start.toISOString(),
    dateRange.end.toISOString(),
    filters,
  ];

  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCalendarView(workspaceId, dateRange, filters),
    enabled: enabled && !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => addMonths(prev, 1));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => subMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return {
    posts,
    currentDate,
    viewMode,
    filters,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    goToNextMonth,
    goToPreviousMonth,
    goToToday,
    goToDate,
    setViewMode,
    setFilters,
    dateRange,
  };
}
