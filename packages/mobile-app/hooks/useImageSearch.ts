/**
 * useImageSearch Hook
 * Manages search query, filters, and sort options for gallery images
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "size_asc" | "size_desc";

export interface DateRange {
  /** Start date (inclusive) */
  startDate: Date | null;
  /** End date (inclusive) */
  endDate: Date | null;
}

export interface ImageFilters {
  /** Album IDs to filter by (empty array means all albums) */
  albumIds: string[];
  /** Date range filter */
  dateRange: DateRange;
}

export interface UseImageSearchOptions {
  /** Initial search query */
  initialQuery?: string;
  /** Initial filters */
  initialFilters?: Partial<ImageFilters>;
  /** Initial sort option */
  initialSortBy?: SortOption;
  /** Debounce delay for search query in milliseconds */
  debounceMs?: number;
  /** Callback when search params change */
  onSearchChange?: (params: ImageSearchParams) => void;
}

export interface ImageSearchParams {
  /** Debounced search query */
  query: string;
  /** Current filters */
  filters: ImageFilters;
  /** Current sort option */
  sortBy: SortOption;
}

export interface UseImageSearchReturn {
  /** Current search query (input value) */
  query: string;
  /** Debounced search query (for API calls) */
  debouncedQuery: string;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Current filters */
  filters: ImageFilters;
  /** Set filters */
  setFilters: (filters: Partial<ImageFilters>) => void;
  /** Reset filters to defaults */
  resetFilters: () => void;
  /** Current sort option */
  sortBy: SortOption;
  /** Set sort option */
  setSortBy: (sortBy: SortOption) => void;
  /** Check if any filters are active */
  hasActiveFilters: boolean;
  /** Number of active filters */
  activeFilterCount: number;
  /** Clear all search/filter/sort settings */
  clearAll: () => void;
  /** Get API-compatible search params */
  getApiParams: () => ApiSearchParams;
}

export interface ApiSearchParams {
  search?: string;
  sortBy?: "createdAt" | "name" | "size";
  sortOrder?: "asc" | "desc";
  albumId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 300;

const DEFAULT_FILTERS: ImageFilters = {
  albumIds: [],
  dateRange: {
    startDate: null,
    endDate: null,
  },
};

const DEFAULT_SORT: SortOption = "newest";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert sort option to API parameters
 */
export function sortOptionToApiParams(sortBy: SortOption): {
  sortBy: "createdAt" | "name" | "size";
  sortOrder: "asc" | "desc";
} {
  switch (sortBy) {
    case "newest":
      return { sortBy: "createdAt", sortOrder: "desc" };
    case "oldest":
      return { sortBy: "createdAt", sortOrder: "asc" };
    case "name_asc":
      return { sortBy: "name", sortOrder: "asc" };
    case "name_desc":
      return { sortBy: "name", sortOrder: "desc" };
    case "size_asc":
      return { sortBy: "size", sortOrder: "asc" };
    case "size_desc":
      return { sortBy: "size", sortOrder: "desc" };
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

/**
 * Get display label for sort option
 */
export function getSortLabel(sortBy: SortOption): string {
  switch (sortBy) {
    case "newest":
      return "Newest First";
    case "oldest":
      return "Oldest First";
    case "name_asc":
      return "Name A-Z";
    case "name_desc":
      return "Name Z-A";
    case "size_asc":
      return "Size: Small to Large";
    case "size_desc":
      return "Size: Large to Small";
    default:
      return "Newest First";
  }
}

/**
 * Format date to ISO string (date only)
 */
function formatDateToIso(date: Date | null): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useImageSearch(options: UseImageSearchOptions = {}): UseImageSearchReturn {
  const {
    initialQuery = "",
    initialFilters = {},
    initialSortBy = DEFAULT_SORT,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onSearchChange,
  } = options;

  // State
  const [query, setQueryState] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filters, setFiltersState] = useState<ImageFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [sortBy, setSortByState] = useState<SortOption>(initialSortBy);

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const onSearchChangeRef = useRef(onSearchChange);

  // Keep callback ref updated
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isMounted.current) {
        setDebouncedQuery(query);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs]);

  // Notify on search params change
  useEffect(() => {
    if (onSearchChangeRef.current) {
      onSearchChangeRef.current({
        query: debouncedQuery,
        filters,
        sortBy,
      });
    }
  }, [debouncedQuery, filters, sortBy]);

  // Set query
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  // Set filters (partial update)
  const setFilters = useCallback((partialFilters: Partial<ImageFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partialFilters,
      dateRange: partialFilters.dateRange
        ? { ...prev.dateRange, ...partialFilters.dateRange }
        : prev.dateRange,
    }));
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Set sort option
  const setSortBy = useCallback((newSortBy: SortOption) => {
    setSortByState(newSortBy);
  }, []);

  // Calculate if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.albumIds.length > 0 ||
      filters.dateRange.startDate !== null ||
      filters.dateRange.endDate !== null
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.albumIds.length > 0) count++;
    if (filters.dateRange.startDate !== null || filters.dateRange.endDate !== null) count++;
    return count;
  }, [filters]);

  // Clear all settings
  const clearAll = useCallback(() => {
    setQueryState("");
    setDebouncedQuery("");
    setFiltersState(DEFAULT_FILTERS);
    setSortByState(DEFAULT_SORT);

    // Clear pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Get API-compatible params
  const getApiParams = useCallback((): ApiSearchParams => {
    const params: ApiSearchParams = {};

    // Search query
    if (debouncedQuery.trim()) {
      params.search = debouncedQuery.trim();
    }

    // Sort
    const { sortBy: apiSortBy, sortOrder } = sortOptionToApiParams(sortBy);
    params.sortBy = apiSortBy;
    params.sortOrder = sortOrder;

    // Album filter (use first album if multiple selected)
    if (filters.albumIds.length > 0) {
      params.albumId = filters.albumIds[0];
    }

    // Date range
    if (filters.dateRange.startDate) {
      params.startDate = formatDateToIso(filters.dateRange.startDate);
    }
    if (filters.dateRange.endDate) {
      params.endDate = formatDateToIso(filters.dateRange.endDate);
    }

    return params;
  }, [debouncedQuery, sortBy, filters]);

  return {
    query,
    debouncedQuery,
    setQuery,
    filters,
    setFilters,
    resetFilters,
    sortBy,
    setSortBy,
    hasActiveFilters,
    activeFilterCount,
    clearAll,
    getApiParams,
  };
}

export default useImageSearch;
