"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { useWorkspace } from "@/components/orbit/WorkspaceContext";
import { StreamEmptyState } from "@/components/streams/StreamEmptyState";
import { StreamFeed } from "@/components/streams/StreamFeed";
import { StreamFilters } from "@/components/streams/StreamFilters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStreamFeed } from "@/hooks/useStreamFeed";
import type { SocialPlatform, StreamFilter } from "@/lib/social/types";
import { AlertCircle, ArrowUp } from "lucide-react";

/**
 * Default filter configuration for the streams page
 */
const DEFAULT_FILTER: StreamFilter = {
  sortBy: "publishedAt",
  sortOrder: "desc",
};

/**
 * StreamsClient is the main client component that orchestrates the unified streams feature.
 * It manages filter state and coordinates between StreamFilters, StreamFeed, and the useStreamFeed hook.
 */
export function StreamsClient() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [filters, setFilters] = useState<StreamFilter>(DEFAULT_FILTER);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const workspaceId = workspace?.id ?? "";

  const {
    posts,
    accounts,
    errors,
    isLoading,
    isError,
    error,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useStreamFeed({
    workspaceId,
    filters,
    enabled: !!workspaceId,
  });

  /**
   * Handle filter changes from StreamFilters component
   */
  const handleFilterChange = useCallback((newFilters: StreamFilter) => {
    setFilters(newFilters);
  }, []);

  /**
   * Handle refresh button click
   */
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * Handle load more button click
   */
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  /**
   * Handle like action on a post
   */
  const handleLike = useCallback((postId: string) => {
    // TODO: Implement in ORB-008
    console.log("Like post:", postId);
  }, []);

  /**
   * Handle reply action on a post
   */
  const handleReply = useCallback((postId: string) => {
    // TODO: Implement in ORB-008
    console.log("Reply to post:", postId);
  }, []);

  /**
   * Handle share action on a post
   */
  const handleShare = useCallback((postId: string) => {
    // TODO: Implement in ORB-008
    console.log("Share post:", postId);
  }, []);

  /**
   * Handle connect accounts button click
   */
  const handleConnectAccounts = useCallback(() => {
    if (workspace?.slug) {
      router.push(`/orbit/${workspace.slug}/settings`);
    }
  }, [router, workspace?.slug]);

  /**
   * Extract connected platforms from accounts for the filter component
   */
  const connectedPlatforms: SocialPlatform[] = accounts.map((account) => account.platform);

  // Show empty state when no accounts are connected
  if (!isLoading && !isError && accounts.length === 0) {
    return (
      <div data-testid="streams-client" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Streams</h1>
            <p className="text-muted-foreground">
              View and engage with posts from all your connected accounts
            </p>
          </div>
        </div>

        <StreamEmptyState type="no-accounts" onConnectAccounts={handleConnectAccounts} />
      </div>
    );
  }

  return (
    <div data-testid="streams-client" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Streams</h1>
          <p className="text-muted-foreground">
            View and engage with posts from all your connected accounts
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {isError && error && (
        <Alert variant="destructive" data-testid="streams-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Per-account errors */}
      {errors && errors.length > 0 && (
        <Alert variant="default" data-testid="streams-account-errors">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Some accounts had issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2">
              {errors.map((err, index) => (
                <li key={`${err.accountId}-${index}`}>
                  {err.platform}: {err.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <StreamFilters
        filters={filters}
        onChange={handleFilterChange}
        connectedPlatforms={connectedPlatforms}
        onRefresh={handleRefresh}
        isLoading={isLoading || isRefetching}
      />

      <StreamFeed
        posts={posts}
        isLoading={isLoading || isFetchingNextPage}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onLike={handleLike}
        onReply={handleReply}
        onShare={handleShare}
        onConnectAccounts={handleConnectAccounts}
      />
    </div>
  );
}
