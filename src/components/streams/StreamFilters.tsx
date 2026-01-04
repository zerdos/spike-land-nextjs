"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  SocialPlatform,
  StreamFilter,
  StreamSortBy,
  StreamSortOrder,
} from "@/lib/social/types";
import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Platform display configuration with icons/names
 */
const PLATFORM_CONFIG: Record<SocialPlatform, { name: string; shortName: string; }> = {
  TWITTER: { name: "Twitter", shortName: "X" },
  FACEBOOK: { name: "Facebook", shortName: "FB" },
  INSTAGRAM: { name: "Instagram", shortName: "IG" },
  LINKEDIN: { name: "LinkedIn", shortName: "LI" },
  TIKTOK: { name: "TikTok", shortName: "TT" },
  YOUTUBE: { name: "YouTube", shortName: "YT" },
};

/**
 * Sort options configuration
 */
interface SortOption {
  value: string;
  label: string;
  sortBy: StreamSortBy;
  sortOrder: StreamSortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first", sortBy: "publishedAt", sortOrder: "desc" },
  { value: "oldest", label: "Oldest first", sortBy: "publishedAt", sortOrder: "asc" },
  { value: "most-liked", label: "Most liked", sortBy: "likes", sortOrder: "desc" },
  { value: "most-comments", label: "Most comments", sortBy: "comments", sortOrder: "desc" },
  {
    value: "highest-engagement",
    label: "Highest engagement",
    sortBy: "engagementRate",
    sortOrder: "desc",
  },
];

/**
 * Debounce delay in milliseconds for search input
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Props for the StreamFilters component
 */
export interface StreamFiltersProps {
  /** Current filter state */
  filters: StreamFilter;
  /** Callback when filters change */
  onChange: (filters: StreamFilter) => void;
  /** List of platforms the user has connected */
  connectedPlatforms: SocialPlatform[];
  /** Optional callback when refresh button is clicked */
  onRefresh?: () => void;
  /** Whether the refresh action is in progress */
  isLoading?: boolean;
}

/**
 * Get the sort option value from sortBy and sortOrder
 */
function getSortValue(sortBy: StreamSortBy, sortOrder: StreamSortOrder): string {
  const option = SORT_OPTIONS.find(
    (opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder,
  );
  return option?.value ?? "newest";
}

/**
 * StreamFilters provides filtering and sorting controls for the unified stream feed.
 * It includes search, platform filtering, sort options, and a refresh button.
 */
export function StreamFilters({
  filters,
  onChange,
  connectedPlatforms,
  onRefresh,
  isLoading = false,
}: StreamFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery ?? "");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal search state with external filter changes
  useEffect(() => {
    setSearchValue(filters.searchQuery ?? "");
  }, [filters.searchQuery]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Handle search input change with debouncing
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        onChange({
          ...filters,
          searchQuery: value || undefined,
        });
      }, SEARCH_DEBOUNCE_MS);
    },
    [filters, onChange],
  );

  /**
   * Handle search on Enter key press (immediate, no debounce)
   */
  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        // Clear debounce timer and trigger immediately
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        onChange({
          ...filters,
          searchQuery: searchValue || undefined,
        });
      }
    },
    [filters, onChange, searchValue],
  );

  /**
   * Handle platform toggle changes
   */
  const handlePlatformChange = useCallback(
    (selectedPlatforms: string[]) => {
      // If all platforms are selected or none are selected, set to undefined (show all)
      const platforms =
        selectedPlatforms.length === 0 || selectedPlatforms.length === connectedPlatforms.length
          ? undefined
          : (selectedPlatforms as SocialPlatform[]);

      onChange({
        ...filters,
        platforms,
      });
    },
    [filters, onChange, connectedPlatforms.length],
  );

  /**
   * Handle sort dropdown change
   */
  const handleSortChange = useCallback(
    (value: string) => {
      const option = SORT_OPTIONS.find((opt) => opt.value === value);
      if (option) {
        onChange({
          ...filters,
          sortBy: option.sortBy,
          sortOrder: option.sortOrder,
        });
      }
    },
    [filters, onChange],
  );

  /**
   * Handle refresh button click
   */
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Determine currently selected platforms (empty array means all selected for toggle group)
  const selectedPlatforms = filters.platforms ?? [];
  const sortValue = getSortValue(filters.sortBy, filters.sortOrder);

  return (
    <div
      data-testid="stream-filters"
      className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/30 p-3"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="search-input"
          type="text"
          placeholder="Search posts..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="pl-9"
          aria-label="Search posts"
        />
      </div>

      {/* Platform Filter */}
      {connectedPlatforms.length > 0 && (
        <ToggleGroup
          data-testid="platform-filter"
          type="multiple"
          value={selectedPlatforms}
          onValueChange={handlePlatformChange}
          aria-label="Filter by platform"
        >
          {connectedPlatforms.map((platform) => (
            <ToggleGroupItem
              key={platform}
              value={platform}
              aria-label={`Filter by ${PLATFORM_CONFIG[platform].name}`}
              data-testid={`platform-toggle-${platform.toLowerCase()}`}
            >
              {PLATFORM_CONFIG[platform].shortName}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {/* Sort Dropdown */}
      <Select value={sortValue} onValueChange={handleSortChange}>
        <SelectTrigger
          data-testid="sort-select"
          className="w-[180px]"
          aria-label="Sort posts"
        >
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              data-testid={`sort-option-${option.value}`}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Refresh Button */}
      {onRefresh && (
        <Button
          data-testid="refresh-button"
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh posts"
        >
          <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      )}
    </div>
  );
}
