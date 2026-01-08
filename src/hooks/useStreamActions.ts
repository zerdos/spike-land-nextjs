/**
 * useStreamActions Hook
 *
 * Provides engagement actions (like, unlike, reply) for the unified stream feed
 * with optimistic updates and error rollback.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { SocialPlatform, StreamPost } from "@/lib/social/types";

/**
 * Platform-specific character limits for replies
 */
export const PLATFORM_CHARACTER_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  FACEBOOK: 8000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
  TIKTOK: 150,
  YOUTUBE: 10000,
  DISCORD: 2000,
};

/**
 * Result of using the stream actions hook
 */
export interface UseStreamActionsResult {
  /** Like a post */
  likePost: (
    postId: string,
    platform: SocialPlatform,
    accountId: string,
  ) => Promise<void>;
  /** Unlike a post */
  unlikePost: (
    postId: string,
    platform: SocialPlatform,
    accountId: string,
  ) => Promise<void>;
  /** Reply to a post */
  replyToPost: (
    postId: string,
    platform: SocialPlatform,
    accountId: string,
    content: string,
  ) => Promise<void>;
  /** Whether a like action is in progress */
  isLiking: boolean;
  /** Whether an unlike action is in progress */
  isUnliking: boolean;
  /** Whether a reply action is in progress */
  isReplying: boolean;
  /** Get character limit for a platform */
  getCharacterLimit: (platform: SocialPlatform) => number;
}

/**
 * Like a post via API
 */
async function likePostApi(
  postId: string,
  platform: SocialPlatform,
  accountId: string,
): Promise<void> {
  const response = await fetch(
    `/api/social/${platform.toLowerCase()}/posts/${encodeURIComponent(postId)}/like`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.details || "Failed to like post");
  }
}

/**
 * Unlike a post via API
 */
async function unlikePostApi(
  postId: string,
  platform: SocialPlatform,
  accountId: string,
): Promise<void> {
  const response = await fetch(
    `/api/social/${platform.toLowerCase()}/posts/${encodeURIComponent(postId)}/like?accountId=${
      encodeURIComponent(accountId)
    }`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.details || "Failed to unlike post");
  }
}

/**
 * Reply to a post via API
 */
async function replyToPostApi(
  postId: string,
  platform: SocialPlatform,
  accountId: string,
  content: string,
): Promise<{ id: string; url?: string; }> {
  const response = await fetch(
    `/api/social/${platform.toLowerCase()}/posts/${encodeURIComponent(postId)}/reply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, content }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.details || "Failed to reply to post");
  }

  const data = await response.json();
  return data.reply;
}

/**
 * Context type for the infinite query
 */
interface StreamsQueryContext {
  previousData?: { pages: Array<{ posts: StreamPost[]; }>; };
}

/**
 * React Query hook for managing stream engagement actions
 *
 * Provides optimistic updates for immediate UI feedback:
 * - Like: Immediately shows liked state, increments like count
 * - Unlike: Immediately removes liked state, decrements like count
 * - Reply: Increments comment count after successful reply
 *
 * On error, changes are automatically rolled back to the previous state.
 *
 * @param workspaceId - The workspace ID for the stream query
 * @returns Stream action functions and loading states
 *
 * @example
 * ```tsx
 * const { likePost, unlikePost, replyToPost, isLiking } = useStreamActions("workspace-123");
 *
 * // Like a post
 * await likePost("post-456", "TWITTER", "account-789");
 *
 * // Reply to a post
 * await replyToPost("post-456", "TWITTER", "account-789", "Great post!");
 * ```
 */
export function useStreamActions(workspaceId: string): UseStreamActionsResult {
  const queryClient = useQueryClient();

  /**
   * Get the streams query key for cache manipulation
   */
  const getStreamsQueryKey = useCallback(() => {
    return ["streams", workspaceId];
  }, [workspaceId]);

  /**
   * Like mutation with optimistic updates
   */
  const likeMutation = useMutation<
    void,
    Error,
    { postId: string; platform: SocialPlatform; accountId: string; },
    StreamsQueryContext
  >({
    mutationFn: ({ postId, platform, accountId }) => likePostApi(postId, platform, accountId),
    onMutate: async ({ postId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: getStreamsQueryKey() });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<{
        pages: Array<{ posts: StreamPost[]; }>;
      }>(getStreamsQueryKey());

      // Optimistically update to the new value
      queryClient.setQueryData<
        { pages: Array<{ posts: StreamPost[]; }>; } | undefined
      >(
        getStreamsQueryKey(),
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.platformPostId === postId || post.id === postId
                  ? {
                    ...post,
                    isLiked: true,
                    metrics: post.metrics
                      ? { ...post.metrics, likes: post.metrics.likes + 1 }
                      : undefined,
                  }
                  : post
              ),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(getStreamsQueryKey(), context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: getStreamsQueryKey() });
    },
  });

  /**
   * Unlike mutation with optimistic updates
   */
  const unlikeMutation = useMutation<
    void,
    Error,
    { postId: string; platform: SocialPlatform; accountId: string; },
    StreamsQueryContext
  >({
    mutationFn: ({ postId, platform, accountId }) => unlikePostApi(postId, platform, accountId),
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: getStreamsQueryKey() });

      const previousData = queryClient.getQueryData<{
        pages: Array<{ posts: StreamPost[]; }>;
      }>(getStreamsQueryKey());

      queryClient.setQueryData<
        { pages: Array<{ posts: StreamPost[]; }>; } | undefined
      >(
        getStreamsQueryKey(),
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.platformPostId === postId || post.id === postId
                  ? {
                    ...post,
                    isLiked: false,
                    metrics: post.metrics
                      ? {
                        ...post.metrics,
                        likes: Math.max(0, post.metrics.likes - 1),
                      }
                      : undefined,
                  }
                  : post
              ),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(getStreamsQueryKey(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getStreamsQueryKey() });
    },
  });

  /**
   * Reply mutation with optimistic comment count update
   */
  const replyMutation = useMutation<
    { id: string; url?: string; },
    Error,
    {
      postId: string;
      platform: SocialPlatform;
      accountId: string;
      content: string;
    },
    StreamsQueryContext
  >({
    mutationFn: ({ postId, platform, accountId, content }) =>
      replyToPostApi(postId, platform, accountId, content),
    onSuccess: (_data, { postId }) => {
      // Update comment count after successful reply
      queryClient.setQueryData<
        { pages: Array<{ posts: StreamPost[]; }>; } | undefined
      >(
        getStreamsQueryKey(),
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.platformPostId === postId || post.id === postId
                  ? {
                    ...post,
                    metrics: post.metrics
                      ? { ...post.metrics, comments: post.metrics.comments + 1 }
                      : undefined,
                  }
                  : post
              ),
            })),
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getStreamsQueryKey() });
    },
  });

  /**
   * Like a post
   */
  const likePost = useCallback(
    async (postId: string, platform: SocialPlatform, accountId: string) => {
      await likeMutation.mutateAsync({ postId, platform, accountId });
    },
    [likeMutation],
  );

  /**
   * Unlike a post
   */
  const unlikePost = useCallback(
    async (postId: string, platform: SocialPlatform, accountId: string) => {
      await unlikeMutation.mutateAsync({ postId, platform, accountId });
    },
    [unlikeMutation],
  );

  /**
   * Reply to a post
   */
  const replyToPost = useCallback(
    async (
      postId: string,
      platform: SocialPlatform,
      accountId: string,
      content: string,
    ) => {
      await replyMutation.mutateAsync({ postId, platform, accountId, content });
    },
    [replyMutation],
  );

  /**
   * Get character limit for a platform
   */
  const getCharacterLimit = useCallback((platform: SocialPlatform): number => {
    return PLATFORM_CHARACTER_LIMITS[platform] ?? 280;
  }, []);

  return {
    likePost,
    unlikePost,
    replyToPost,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
    isReplying: replyMutation.isPending,
    getCharacterLimit,
  };
}
