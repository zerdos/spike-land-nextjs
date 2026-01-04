import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { StreamFilter, StreamPost, StreamsResponse } from "@/lib/social/types";

/**
 * Options for the useStreamFeed hook
 */
export interface UseStreamFeedOptions {
  /** The workspace ID to fetch streams for */
  workspaceId: string;
  /** Optional filters for the stream feed */
  filters?: StreamFilter;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Result returned by the useStreamFeed hook
 */
export interface UseStreamFeedResult {
  /** Flattened array of posts from all pages */
  posts: StreamPost[];
  /** Connected accounts info for filtering UI */
  accounts: StreamsResponse["accounts"];
  /** Any errors that occurred while fetching (per-account) */
  errors: StreamsResponse["errors"];
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Whether an error occurred */
  isError: boolean;
  /** The error object if an error occurred */
  error: Error | null;
  /** Whether more posts are available */
  hasMore: boolean;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** Whether currently fetching the next page */
  isFetchingNextPage: boolean;
  /** Function to refetch the data */
  refetch: () => void;
  /** Whether currently refetching */
  isRefetching: boolean;
}

/**
 * Fetches stream data from the API
 */
async function fetchStreams(
  workspaceId: string,
  filters?: StreamFilter,
  cursor?: string,
): Promise<StreamsResponse> {
  const params = new URLSearchParams();
  params.set("workspaceId", workspaceId);

  if (filters?.platforms && filters.platforms.length > 0) {
    params.set("platforms", filters.platforms.join(","));
  }
  if (filters?.sortBy) {
    params.set("sortBy", filters.sortBy);
  }
  if (filters?.sortOrder) {
    params.set("sortOrder", filters.sortOrder);
  }
  if (filters?.searchQuery) {
    params.set("searchQuery", filters.searchQuery);
  }
  if (filters?.dateRange?.start) {
    params.set("startDate", filters.dateRange.start.toISOString());
  }
  if (filters?.dateRange?.end) {
    params.set("endDate", filters.dateRange.end.toISOString());
  }
  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`/api/social/streams?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch streams");
  }

  return response.json() as Promise<StreamsResponse>;
}

/**
 * Normalizes filters for stable query key comparison
 * Converts dates to ISO strings and sorts platform arrays
 */
function normalizeFilters(filters?: StreamFilter): Record<string, unknown> | undefined {
  if (!filters) return undefined;

  return {
    platforms: filters.platforms ? [...filters.platforms].sort() : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    searchQuery: filters.searchQuery || undefined,
    startDate: filters.dateRange?.start?.toISOString(),
    endDate: filters.dateRange?.end?.toISOString(),
  };
}

/**
 * React Query hook for fetching and managing the stream feed data
 *
 * Uses infinite query for cursor-based pagination.
 * Automatically refetches on window focus and handles caching.
 *
 * @param options - The options for the hook
 * @returns The stream feed data and control functions
 *
 * @example
 * ```tsx
 * const { posts, isLoading, fetchNextPage, hasMore } = useStreamFeed({
 *   workspaceId: "ws-123",
 *   filters: { sortBy: "publishedAt", sortOrder: "desc" },
 * });
 * ```
 */
export function useStreamFeed({
  workspaceId,
  filters,
  enabled = true,
}: UseStreamFeedOptions): UseStreamFeedResult {
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);

  const query = useInfiniteQuery({
    queryKey: ["streams", workspaceId, normalizedFilters] as const,
    queryFn: ({ pageParam }) => fetchStreams(workspaceId, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Flatten posts from all pages
  const posts = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.posts);
  }, [query.data?.pages]);

  // Get accounts from the first page (they're the same across pages)
  const accounts = useMemo(() => {
    return query.data?.pages[0]?.accounts ?? [];
  }, [query.data?.pages]);

  // Collect errors from all pages
  const errors = useMemo(() => {
    if (!query.data?.pages) return undefined;
    const allErrors = query.data.pages.flatMap((page) => page.errors ?? []);
    return allErrors.length > 0 ? allErrors : undefined;
  }, [query.data?.pages]);

  // Get hasMore from the last page
  const hasMore = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages || pages.length === 0) return false;
    const lastPage = pages[pages.length - 1];
    return lastPage?.hasMore ?? false;
  }, [query.data?.pages]);

  return {
    posts,
    accounts,
    errors,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasMore,
    fetchNextPage: () => {
      query.fetchNextPage();
    },
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: () => {
      query.refetch();
    },
    isRefetching: query.isRefetching,
  };
}
