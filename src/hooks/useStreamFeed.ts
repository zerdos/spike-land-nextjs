import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StreamFilter, StreamPost, StreamsResponse } from "@/lib/social/types";

/**
 * Default polling interval in milliseconds (30 seconds)
 */
export const DEFAULT_POLLING_INTERVAL = 30000;

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
  /** Polling interval in milliseconds (default: 30000ms). Set to 0 to disable polling. */
  pollingInterval?: number;
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
  /** Number of new posts detected since last acknowledgment */
  newPostsCount: number;
  /** Function to acknowledge new posts (resets count) */
  acknowledgeNewPosts: () => void;
  /** Whether polling is currently active */
  isPolling: boolean;
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
function normalizeFilters(
  filters?: StreamFilter,
): Record<string, unknown> | undefined {
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
 * Supports polling with automatic pause when tab is not visible.
 *
 * @param options - The options for the hook
 * @returns The stream feed data and control functions
 *
 * @example
 * ```tsx
 * const { posts, isLoading, fetchNextPage, hasMore, newPostsCount, acknowledgeNewPosts } = useStreamFeed({
 *   workspaceId: "ws-123",
 *   filters: { sortBy: "publishedAt", sortOrder: "desc" },
 *   pollingInterval: 30000, // Poll every 30 seconds
 * });
 * ```
 */
export function useStreamFeed({
  workspaceId,
  filters,
  enabled = true,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
}: UseStreamFeedOptions): UseStreamFeedResult {
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);

  // Track document visibility for polling
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  // Track known post IDs for new post detection
  const knownPostIdsRef = useRef<Set<string>>(new Set());
  const [newPostsCount, setNewPostsCount] = useState(0);
  const isInitialFetchRef = useRef(true);

  // Handle visibility change for polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Set initial state
    setIsDocumentVisible(document.visibilityState === "visible");

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Determine if polling should be active
  const shouldPoll = enabled && pollingInterval > 0 && isDocumentVisible;

  const query = useInfiniteQuery({
    queryKey: ["streams", workspaceId, normalizedFilters] as const,
    queryFn: ({ pageParam }) => fetchStreams(workspaceId, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (
      lastPage,
    ) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    // Use function for refetchInterval to conditionally enable polling
    refetchInterval: shouldPoll ? pollingInterval : false,
  });

  // Flatten posts from all pages
  const posts = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.posts);
  }, [query.data?.pages]);

  // Track the dataUpdatedAt timestamp to detect actual data changes
  const lastDataUpdatedAtRef = useRef<number>(0);

  // Detect new posts when data changes
  useEffect(() => {
    // Skip if no data or timestamp hasn't changed
    if (
      !query.data?.pages || query.dataUpdatedAt === lastDataUpdatedAtRef.current
    ) return;

    const currentPosts = query.data.pages.flatMap((page) => page.posts);

    // On initial fetch, just populate the known IDs
    if (isInitialFetchRef.current) {
      knownPostIdsRef.current = new Set(currentPosts.map((post) => post.id));
      isInitialFetchRef.current = false;
      lastDataUpdatedAtRef.current = query.dataUpdatedAt;
      return;
    }

    // Count new posts (posts we haven't seen before)
    const currentPostIds = currentPosts.map((post) => post.id);
    const newIds = currentPostIds.filter((id) => !knownPostIdsRef.current.has(id));

    if (newIds.length > 0) {
      setNewPostsCount((prev) => prev + newIds.length);
      // Add new IDs to known set
      newIds.forEach((id) => knownPostIdsRef.current.add(id));
    }

    lastDataUpdatedAtRef.current = query.dataUpdatedAt;
  }, [query.data?.pages, query.dataUpdatedAt]);

  // Reset state when filters or workspaceId changes
  useEffect(() => {
    knownPostIdsRef.current = new Set();
    setNewPostsCount(0);
    isInitialFetchRef.current = true;
    lastDataUpdatedAtRef.current = 0;
  }, [workspaceId, normalizedFilters]);

  // Function to acknowledge new posts
  const acknowledgeNewPosts = useCallback(() => {
    setNewPostsCount(0);
  }, []);

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
    newPostsCount,
    acknowledgeNewPosts,
    isPolling: shouldPoll,
  };
}
