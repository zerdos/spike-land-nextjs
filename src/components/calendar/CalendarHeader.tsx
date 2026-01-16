/**
 * CalendarHeader Component
 *
 * Navigation header for the calendar view with month navigation,
 * view mode selector, and filter controls.
 * Part of #574: Build Calendar UI
 */

"use client";

import type { SocialPlatform } from "@prisma/client";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScheduledPostStatus } from "@/lib/calendar/types";

import type { CalendarFilters, CalendarViewMode } from "@/hooks/useCalendarView";

export interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  filters: CalendarFilters;
  connectedPlatforms: SocialPlatform[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onFiltersChange: (filters: CalendarFilters) => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS: { value: ScheduledPostStatus; label: string; }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PENDING", label: "Pending" },
  { value: "PUBLISHING", label: "Publishing" },
  { value: "PUBLISHED", label: "Published" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  LINKEDIN: "LinkedIn",
  TWITTER: "Twitter/X",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  DISCORD: "Discord",
};

export function CalendarHeader({
  currentDate,
  viewMode,
  filters,
  connectedPlatforms,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onViewModeChange,
  onFiltersChange,
  isLoading,
}: CalendarHeaderProps) {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const handlePlatformToggle = (platform: SocialPlatform) => {
    const currentPlatforms = filters.platforms || [];
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter((p) => p !== platform)
      : [...currentPlatforms, platform];

    onFiltersChange({
      ...filters,
      platforms: newPlatforms.length > 0 ? newPlatforms : undefined,
    });
  };

  const handleStatusToggle = (status: ScheduledPostStatus) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];

    onFiltersChange({
      ...filters,
      status: newStatus.length > 0 ? newStatus : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasFilters = (filters.platforms?.length ?? 0) > 0 ||
    (filters.status?.length ?? 0) > 0;

  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="calendar-header"
    >
      {/* Month Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousMonth}
          disabled={isLoading}
          data-testid="calendar-prev-month"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2
          className="min-w-[140px] text-center text-lg font-semibold"
          data-testid="current-month"
        >
          {format(currentDate, "MMMM yyyy")}
        </h2>

        <Button
          variant="outline"
          size="icon"
          onClick={onNextMonth}
          disabled={isLoading}
          data-testid="calendar-next-month"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          disabled={isLoading}
          className="ml-2"
          data-testid="today-button"
        >
          Today
        </Button>
      </div>

      {/* View Mode and Filters */}
      <div className="flex items-center gap-2">
        {/* View Mode Selector */}
        <Select
          value={viewMode}
          onValueChange={(value) => onViewModeChange(value as CalendarViewMode)}
        >
          <SelectTrigger className="w-[110px]" data-testid="view-mode-selector">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="day">Day</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Dropdown */}
        <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant={hasFilters ? "default" : "outline"}
              size="sm"
              data-testid="filter-button"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {hasFilters && (
                <span className="ml-1 rounded-full bg-primary-foreground px-1.5 text-xs text-primary">
                  {(filters.platforms?.length ?? 0) +
                    (filters.status?.length ?? 0)}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Platform</DropdownMenuLabel>
            {connectedPlatforms.map((platform) => (
              <DropdownMenuCheckboxItem
                key={platform}
                checked={filters.platforms?.includes(platform) ?? false}
                onCheckedChange={() => handlePlatformToggle(platform)}
                data-testid={`filter-platform-${platform.toLowerCase()}`}
              >
                {PLATFORM_LABELS[platform] || platform}
              </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.status?.includes(option.value) ?? false}
                onCheckedChange={() => handleStatusToggle(option.value)}
                data-testid={`filter-status-${option.value.toLowerCase()}`}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}

            {hasFilters && (
              <>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={clearFilters}
                  data-testid="clear-filters-button"
                >
                  Clear filters
                </Button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
