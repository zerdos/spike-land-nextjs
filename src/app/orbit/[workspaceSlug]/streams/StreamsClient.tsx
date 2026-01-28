"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { useWorkspace } from "@/components/orbit/WorkspaceContext";
import { ReplyDialog } from "@/components/streams/ReplyDialog";
import { StreamEmptyState } from "@/components/streams/StreamEmptyState";
import { StreamFeed } from "@/components/streams/StreamFeed";
import { StreamFilters } from "@/components/streams/StreamFilters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStreamActions } from "@/hooks/useStreamActions";
import { useStreamFeed } from "@/hooks/useStreamFeed";
import type { SocialPlatform, StreamFilter, StreamPost } from "@/lib/social/types";
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

  // State for reply dialog
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyingToPost, setReplyingToPost] = useState<StreamPost | null>(null);

  // State for tracking which post is being engaged with
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);

  // State for engagement messages
  const [engagementMessage, setEngagementMessage] = useState<
    {
      type: "success" | "error";
      message: string;
    } | null
  >(null);

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
    newPostsCount,
    acknowledgeNewPosts,
    isPolling,
  } = useStreamFeed({
    workspaceId,
    filters,
    enabled: !!workspaceId,
    includeComments: true,
  });

  // Stream actions hook for engagement
  const { likePost, unlikePost, replyToPost } = useStreamActions(workspaceId);

  /**
   * Show a temporary engagement message
   */
  const showMessage = useCallback(
    (type: "success" | "error", message: string) => {
      setEngagementMessage({ type, message });
      setTimeout(() => setEngagementMessage(null), 3000);
    },
    [],
  );

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
   * Handle new posts banner click - scroll to top and acknowledge
   */
  const handleNewPostsClick = useCallback(() => {
    acknowledgeNewPosts();
    feedContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [acknowledgeNewPosts]);

  /**
   * Handle load more button click
   */
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  /**
   * Handle like action on a post
   */
  const handleLike = useCallback(
    async (postId: string) => {
      // Find the post to get platform and account info
      const post = posts.find(
        (p) => p.id === postId || p.platformPostId === postId,
      );
      if (!post) {
        showMessage("error", "Post not found");
        return;
      }

      // Find the account for this post
      const account = accounts.find((a) => a.platform === post.platform);
      if (!account) {
        showMessage("error", "No connected account for this platform");
        return;
      }

      setLikingPostId(postId);
      try {
        if (post.isLiked) {
          await unlikePost(post.platformPostId, post.platform, account.id);
          showMessage("success", "Post unliked");
        } else {
          await likePost(post.platformPostId, post.platform, account.id);
          showMessage("success", "Post liked");
        }
      } catch (err) {
        showMessage(
          "error",
          err instanceof Error ? err.message : "Failed to update like",
        );
      } finally {
        setLikingPostId(null);
      }
    },
    [posts, accounts, likePost, unlikePost, showMessage],
  );

  /**
   * Handle reply action on a post - opens reply dialog
   */
  const handleReply = useCallback(
    (postId: string) => {
      const post = posts.find(
        (p) => p.id === postId || p.platformPostId === postId,
      );
      if (post) {
        setReplyingToPost(post);
        setReplyDialogOpen(true);
      }
    },
    [posts],
  );

  /**
   * Handle reply submission from dialog
   */
  const handleReplySubmit = useCallback(
    async (accountId: string, content: string) => {
      if (!replyingToPost) return;

      setReplyingPostId(replyingToPost.id);
      try {
        await replyToPost(
          replyingToPost.platformPostId,
          replyingToPost.platform,
          accountId,
          content,
        );
        showMessage("success", "Reply sent successfully");
        setReplyDialogOpen(false);
        setReplyingToPost(null);
      } catch (err) {
        showMessage(
          "error",
          err instanceof Error ? err.message : "Failed to post reply",
        );
      } finally {
        setReplyingPostId(null);
      }
    },
    [replyingToPost, replyToPost, showMessage],
  );

  /**
   * Copy URL to clipboard helper
   */
  const copyToClipboard = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        showMessage("success", "Link copied to clipboard");
      } catch (error) {
        // Clipboard API may be unavailable or permission denied
        console.warn(
          "[StreamsClient] Failed to copy to clipboard:",
          error instanceof Error ? error.message : String(error),
        );
        showMessage("error", "Failed to copy link");
      }
    },
    [showMessage],
  );

  /**
   * Handle share action on a post
   */
  const handleShare = useCallback(
    async (postId: string) => {
      const post = posts.find(
        (p) => p.id === postId || p.platformPostId === postId,
      );
      if (!post?.url) {
        showMessage("error", "No URL available for this post");
        return;
      }

      // Try Web Share API first, fall back to clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Post by ${post.accountName}`,
            url: post.url,
          });
          showMessage("success", "Post shared");
        } catch (err) {
          // User cancelled or share failed, try clipboard
          if ((err as Error).name !== "AbortError") {
            await copyToClipboard(post.url);
          }
        }
      } else {
        await copyToClipboard(post.url);
      }
    },
    [posts, showMessage, copyToClipboard],
  );

  /**
   * Handle connect accounts button click
   */
  const handleConnectAccounts = useCallback(() => {
    if (workspace?.slug) {
      router.push(`/orbit/${workspace.slug}/settings/accounts`);
    }
  }, [router, workspace?.slug]);

  /**
   * Handle view all comments - opens the original post URL
   */
  const handleViewAllComments = useCallback(
    (postId: string) => {
      const post = posts.find(
        (p) => p.id === postId || p.platformPostId === postId,
      );
      if (post?.url) {
        window.open(post.url, "_blank", "noopener,noreferrer");
      }
    },
    [posts],
  );

  /**
   * Extract connected platforms from accounts for the filter component
   */
  const connectedPlatforms: SocialPlatform[] = accounts.map(
    (account) => account.platform,
  );

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

        <StreamEmptyState
          type="no-accounts"
          onConnectAccounts={handleConnectAccounts}
        />
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

      {/* Engagement Message */}
      {engagementMessage && (
        <Alert
          variant={engagementMessage.type === "error"
            ? "destructive"
            : "default"}
          data-testid="engagement-message"
        >
          <AlertDescription>{engagementMessage.message}</AlertDescription>
        </Alert>
      )}

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
        isPolling={isPolling}
      />

      {/* New Posts Banner */}
      {newPostsCount > 0 && (
        <div
          className="sticky top-0 z-10 flex justify-center"
          data-testid="new-posts-banner"
        >
          <Button
            variant="default"
            size="sm"
            onClick={handleNewPostsClick}
            className="shadow-lg"
            data-testid="new-posts-button"
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            {newPostsCount === 1 ? "1 new post" : `${newPostsCount} new posts`}
          </Button>
        </div>
      )}

      <div ref={feedContainerRef}>
        <StreamFeed
          posts={posts}
          isLoading={isLoading || isFetchingNextPage}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onLike={handleLike}
          onReply={handleReply}
          onShare={handleShare}
          onViewAllComments={handleViewAllComments}
          onConnectAccounts={handleConnectAccounts}
          likingPostId={likingPostId}
          replyingPostId={replyingPostId}
        />
      </div>

      {/* Reply Dialog */}
      {replyingToPost && (
        <ReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          post={replyingToPost}
          accounts={accounts.filter(
            (a) => a.platform === replyingToPost.platform,
          )}
          onSubmit={handleReplySubmit}
          isSubmitting={replyingPostId === replyingToPost.id}
        />
      )}
    </div>
  );
}
