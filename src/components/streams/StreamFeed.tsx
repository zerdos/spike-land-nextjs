"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StreamPost } from "@/lib/social/types";
import { StreamEmptyState } from "./StreamEmptyState";
import { StreamPostCard } from "./StreamPostCard";

/**
 * Props for the StreamFeed component
 */
export interface StreamFeedProps {
  /** List of posts to display */
  posts: StreamPost[];
  /** Whether the feed is currently loading */
  isLoading?: boolean;
  /** Whether there are more posts available to load */
  hasMore?: boolean;
  /** Callback when the load more button is clicked */
  onLoadMore?: () => void;
  /** Callback when the like button is clicked on a post */
  onLike?: (postId: string) => void;
  /** Callback when the reply button is clicked on a post */
  onReply?: (postId: string) => void;
  /** Callback when the share button is clicked on a post */
  onShare?: (postId: string) => void;
  /** Callback when connect accounts is clicked from empty state */
  onConnectAccounts?: () => void;
  /** Post ID that is currently being liked */
  likingPostId?: string | null;
  /** Post ID that is currently being replied to */
  replyingPostId?: string | null;
}

/**
 * Skeleton loading card for the feed
 */
function StreamFeedSkeleton() {
  return (
    <Card data-testid="stream-feed-skeleton">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * StreamFeed displays a vertical list of social media posts with infinite scroll support.
 * It shows loading skeletons when fetching data and an empty state when there are no posts.
 */
export function StreamFeed({
  posts,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onLike,
  onReply,
  onShare,
  onConnectAccounts,
  likingPostId,
  replyingPostId,
}: StreamFeedProps) {
  // Show loading skeletons when loading and no posts yet
  if (isLoading && posts.length === 0) {
    return (
      <div data-testid="stream-feed" className="flex flex-col gap-4">
        <StreamFeedSkeleton />
        <StreamFeedSkeleton />
        <StreamFeedSkeleton />
      </div>
    );
  }

  // Show empty state when no posts and not loading
  if (posts.length === 0 && !isLoading) {
    return (
      <div data-testid="stream-feed">
        <StreamEmptyState
          type="no-posts"
          onConnectAccounts={onConnectAccounts}
        />
      </div>
    );
  }

  const handleLoadMore = () => {
    onLoadMore?.();
  };

  return (
    <div data-testid="stream-feed" className="flex flex-col gap-4">
      {posts.map((post) => (
        <StreamPostCard
          key={post.id}
          post={post}
          onLike={onLike}
          onReply={onReply}
          onShare={onShare}
          isLiking={likingPostId === post.id ||
            likingPostId === post.platformPostId}
          isReplying={replyingPostId === post.id ||
            replyingPostId === post.platformPostId}
        />
      ))}

      {/* Show loading skeleton at the bottom when loading more */}
      {isLoading && posts.length > 0 && <StreamFeedSkeleton />}

      {/* Show load more button when there are more posts */}
      {hasMore && !isLoading && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            data-testid="load-more-button"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
