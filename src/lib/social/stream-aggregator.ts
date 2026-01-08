/**
 * Stream Aggregator Utility
 *
 * Merges and sorts posts from multiple social platforms into a unified stream feed.
 * Provides filtering, sorting, and pagination capabilities.
 */

import type { SocialPlatform } from "@prisma/client";

import type {
  PostMetrics,
  SocialAccountInfo,
  SocialPost,
  StreamFilter,
  StreamPost,
  StreamSortBy,
  StreamSortOrder,
} from "./types";
import { PLATFORM_CAPABILITIES } from "./types";

/**
 * Account context for transforming posts
 */
export interface AccountContext {
  accountId: string;
  accountName: string;
  accountAvatarUrl?: string;
  platform: SocialPlatform;
}

/**
 * Paginated result from stream aggregation
 */
export interface AggregatedStreamResult {
  posts: StreamPost[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}

/**
 * Options for stream aggregation
 */
export interface AggregateOptions {
  filter: StreamFilter;
  limit?: number;
  cursor?: string;
}

/**
 * Calculate engagement rate for a post
 *
 * Engagement rate = (likes + comments + shares) / impressions * 100
 * If impressions are not available, returns undefined
 *
 * @param metrics - Post metrics containing engagement data
 * @returns Engagement rate as a percentage, or undefined if not calculable
 */
export function calculateEngagementRate(
  metrics?: PostMetrics,
): number | undefined {
  if (!metrics) {
    return undefined;
  }

  const { likes = 0, comments = 0, shares = 0, impressions } = metrics;

  // If impressions are available, use them for the calculation
  if (impressions && impressions > 0) {
    return ((likes + comments + shares) / impressions) * 100;
  }

  // If no impressions, we can't calculate a proper rate
  return undefined;
}

/**
 * Transform a SocialPost to a StreamPost with account context
 *
 * @param post - The original social post
 * @param context - Account context (id, name, avatar)
 * @returns StreamPost with account info and platform capabilities
 */
export function transformToStreamPost(
  post: SocialPost,
  context: AccountContext,
): StreamPost {
  const capabilities = PLATFORM_CAPABILITIES[post.platform];

  return {
    ...post,
    accountId: context.accountId,
    accountName: context.accountName,
    accountAvatarUrl: context.accountAvatarUrl,
    canLike: capabilities.canLike,
    canReply: capabilities.canReply,
    canShare: capabilities.canShare,
    // isLiked is undefined by default - would need API call to determine
    isLiked: undefined,
  };
}

/**
 * Transform account info to account context
 *
 * @param accountId - Database account ID
 * @param info - Social account information from API
 * @param platform - The social platform
 * @returns AccountContext for transforming posts
 */
export function createAccountContext(
  accountId: string,
  info: SocialAccountInfo,
  platform: SocialPlatform,
): AccountContext {
  return {
    accountId,
    accountName: info.displayName || info.username,
    accountAvatarUrl: info.avatarUrl,
    platform,
  };
}

/**
 * Filter stream posts based on filter criteria
 *
 * @param posts - Array of stream posts to filter
 * @param filter - Filter configuration
 * @returns Filtered array of posts
 */
export function filterStreamPosts(
  posts: StreamPost[],
  filter: StreamFilter,
): StreamPost[] {
  let filtered = [...posts];

  // Filter by platforms
  if (filter.platforms && filter.platforms.length > 0) {
    filtered = filtered.filter((post) => filter.platforms!.includes(post.platform));
  }

  // Filter by date range
  if (filter.dateRange) {
    const { start, end } = filter.dateRange;
    filtered = filtered.filter((post) => {
      const publishedAt = new Date(post.publishedAt);
      return publishedAt >= start && publishedAt <= end;
    });
  }

  // Filter by search query (case-insensitive content search)
  if (filter.searchQuery && filter.searchQuery.trim()) {
    const query = filter.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((post) => post.content.toLowerCase().includes(query));
  }

  return filtered;
}

/**
 * Get the value to sort by for a given post and sort field
 *
 * @param post - The stream post
 * @param sortBy - The field to sort by
 * @returns The sortable value
 */
function getSortValue(post: StreamPost, sortBy: StreamSortBy): number | Date {
  switch (sortBy) {
    case "publishedAt":
      return new Date(post.publishedAt);
    case "likes":
      return post.metrics?.likes ?? 0;
    case "comments":
      return post.metrics?.comments ?? 0;
    case "engagementRate": {
      const rate = calculateEngagementRate(post.metrics);
      return rate ?? 0;
    }
    default:
      return new Date(post.publishedAt);
  }
}

/**
 * Sort stream posts by the specified field and order
 *
 * @param posts - Array of stream posts to sort
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction (asc/desc)
 * @returns Sorted array of posts
 */
export function sortStreamPosts(
  posts: StreamPost[],
  sortBy: StreamSortBy,
  sortOrder: StreamSortOrder,
): StreamPost[] {
  const sorted = [...posts];

  sorted.sort((a, b) => {
    const aValue = getSortValue(a, sortBy);
    const bValue = getSortValue(b, sortBy);

    let comparison: number;

    if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      comparison = (aValue as number) - (bValue as number);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Decode a cursor string to get the offset
 *
 * @param cursor - Base64 encoded cursor string
 * @returns Decoded offset, or 0 if invalid
 */
export function decodeCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return typeof parsed.offset === "number" ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

/**
 * Encode an offset into a cursor string
 *
 * @param offset - The offset to encode
 * @returns Base64 encoded cursor string
 */
export function encodeCursor(offset: number): string {
  const data = JSON.stringify({ offset });
  return Buffer.from(data, "utf-8").toString("base64");
}

/**
 * Aggregate posts from multiple accounts into a unified stream
 *
 * This is the main entry point for stream aggregation. It:
 * 1. Merges posts from multiple accounts
 * 2. Applies filters (platforms, dateRange, searchQuery)
 * 3. Sorts by specified field and order
 * 4. Returns paginated results with cursor
 *
 * @param postsWithContext - Array of tuples [posts, accountContext]
 * @param options - Aggregation options (filter, limit, cursor)
 * @returns Paginated and filtered stream result
 */
export function aggregateStreamPosts(
  postsWithContext: Array<[SocialPost[], AccountContext]>,
  options: AggregateOptions,
): AggregatedStreamResult {
  const { filter, limit = 20, cursor } = options;

  // Transform all posts to stream posts
  const allStreamPosts: StreamPost[] = [];

  for (const [posts, context] of postsWithContext) {
    for (const post of posts) {
      const streamPost = transformToStreamPost(post, context);
      allStreamPosts.push(streamPost);
    }
  }

  // Apply filters
  const filteredPosts = filterStreamPosts(allStreamPosts, filter);

  // Sort posts
  const sortedPosts = sortStreamPosts(
    filteredPosts,
    filter.sortBy,
    filter.sortOrder,
  );

  // Calculate total count before pagination
  const totalCount = sortedPosts.length;

  // Apply pagination
  const offset = decodeCursor(cursor);
  const paginatedPosts = sortedPosts.slice(offset, offset + limit);
  const hasMore = offset + limit < totalCount;
  const nextCursor = hasMore ? encodeCursor(offset + limit) : undefined;

  return {
    posts: paginatedPosts,
    nextCursor,
    hasMore,
    totalCount,
  };
}

/**
 * Merge posts from multiple sources without any transformation
 * Useful when posts are already StreamPosts
 *
 * @param postArrays - Multiple arrays of stream posts to merge
 * @returns Single merged array
 */
export function mergeStreamPosts(...postArrays: StreamPost[][]): StreamPost[] {
  return postArrays.flat();
}
