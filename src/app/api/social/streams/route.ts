/**
 * Social Streams API Route
 *
 * GET /api/social/streams - Fetch and aggregate social posts from all connected accounts
 *
 * Query Parameters:
 * - workspaceId: Required. The workspace ID to fetch streams for
 * - platforms: Optional. Comma-separated list of platforms to filter (TWITTER,FACEBOOK,INSTAGRAM,LINKEDIN)
 * - limit: Optional. Number of posts to return (default: 20, max: 100)
 * - sortBy: Optional. Sort field (publishedAt, likes, comments, engagementRate) default: publishedAt
 * - sortOrder: Optional. Sort direction (asc, desc) default: desc
 * - startDate: Optional. ISO date string for date range filter start
 * - endDate: Optional. ISO date string for date range filter end
 * - cursor: Optional. Pagination cursor for next page
 * - searchQuery: Optional. Text search in post content
 */

import { auth } from "@/auth";
import {
  PLATFORM_CAPABILITIES,
  type SocialPlatform,
  type StreamPost,
  type StreamSortBy,
  type StreamSortOrder,
  type StreamsQueryParams,
  type StreamsResponse,
} from "@/lib/social/types";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Valid platforms for filtering
 */
const VALID_PLATFORMS: SocialPlatform[] = [
  "TWITTER",
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "TIKTOK",
];

/**
 * Valid sort fields
 */
const VALID_SORT_BY: StreamSortBy[] = [
  "publishedAt",
  "likes",
  "comments",
  "engagementRate",
];

/**
 * Valid sort orders
 */
const VALID_SORT_ORDER: StreamSortOrder[] = ["asc", "desc"];

/**
 * Parse and validate query parameters
 */
function parseQueryParams(
  searchParams: URLSearchParams,
): { params: StreamsQueryParams; error?: string; } {
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return {
      params: {} as StreamsQueryParams,
      error: "workspaceId query parameter is required",
    };
  }

  // Parse platforms (comma-separated)
  let platforms: SocialPlatform[] | undefined;
  const platformsParam = searchParams.get("platforms");
  if (platformsParam) {
    const platformList = platformsParam.split(",").map((p) => p.trim().toUpperCase());
    const invalidPlatforms = platformList.filter(
      (p) => !VALID_PLATFORMS.includes(p as SocialPlatform),
    );
    if (invalidPlatforms.length > 0) {
      return {
        params: {} as StreamsQueryParams,
        error: `Invalid platform(s): ${invalidPlatforms.join(", ")}. Valid platforms: ${
          VALID_PLATFORMS.join(", ")
        }`,
      };
    }
    platforms = platformList as SocialPlatform[];
  }

  // Parse limit (default: 20, max: 100)
  const limitParam = searchParams.get("limit");
  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return {
        params: {} as StreamsQueryParams,
        error: "limit must be a positive integer",
      };
    }
    limit = Math.min(parsed, 100);
  }

  // Parse sortBy
  const sortByParam = searchParams.get("sortBy") as StreamSortBy | null;
  let sortBy: StreamSortBy = "publishedAt";
  if (sortByParam) {
    if (!VALID_SORT_BY.includes(sortByParam)) {
      return {
        params: {} as StreamsQueryParams,
        error: `Invalid sortBy value. Valid values: ${VALID_SORT_BY.join(", ")}`,
      };
    }
    sortBy = sortByParam;
  }

  // Parse sortOrder
  const sortOrderParam = searchParams.get("sortOrder") as StreamSortOrder | null;
  let sortOrder: StreamSortOrder = "desc";
  if (sortOrderParam) {
    if (!VALID_SORT_ORDER.includes(sortOrderParam)) {
      return {
        params: {} as StreamsQueryParams,
        error: `Invalid sortOrder value. Valid values: ${VALID_SORT_ORDER.join(", ")}`,
      };
    }
    sortOrder = sortOrderParam;
  }

  // Parse dates
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  // Validate date formats if provided
  if (startDate && isNaN(Date.parse(startDate))) {
    return {
      params: {} as StreamsQueryParams,
      error: "startDate must be a valid ISO date string",
    };
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    return {
      params: {} as StreamsQueryParams,
      error: "endDate must be a valid ISO date string",
    };
  }

  return {
    params: {
      workspaceId,
      platforms,
      limit,
      sortBy,
      sortOrder,
      startDate,
      endDate,
      cursor: searchParams.get("cursor") || undefined,
      searchQuery: searchParams.get("searchQuery") || undefined,
    },
  };
}

/**
 * Generate mock posts for a platform
 * This will be replaced with real API integration in ORB-006
 */
function generateMockPosts(
  platform: SocialPlatform,
  accountId: string,
  accountName: string,
  count: number,
): StreamPost[] {
  const capabilities = PLATFORM_CAPABILITIES[platform];
  const posts: StreamPost[] = [];

  const baseDate = new Date();

  for (let i = 0; i < count; i++) {
    const publishedAt = new Date(baseDate.getTime() - i * 3600000); // 1 hour apart
    const likes = Math.floor(Math.random() * 1000);
    const comments = Math.floor(Math.random() * 100);
    const shares = Math.floor(Math.random() * 50);
    const impressions = likes * 10 + comments * 5 + shares * 20;

    posts.push({
      id: `mock-${platform.toLowerCase()}-${accountId}-${i}`,
      platformPostId: `${platform.toLowerCase()}_post_${Date.now()}_${i}`,
      platform,
      content: `Sample ${platform} post #${
        i + 1
      }. This is a mock post for testing the unified stream feed. #socialMedia #mockData`,
      publishedAt,
      url: `https://${platform.toLowerCase()}.com/post/${Date.now()}_${i}`,
      accountId,
      accountName,
      accountAvatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${accountName}`,
      canLike: capabilities.canLike,
      canReply: capabilities.canReply,
      canShare: capabilities.canShare,
      metrics: {
        likes,
        comments,
        shares,
        impressions,
        engagementRate: impressions > 0 ? ((likes + comments + shares) / impressions) * 100 : 0,
      },
    });
  }

  return posts;
}

/**
 * Generate mock accounts for the response
 */
function generateMockAccounts(platforms: SocialPlatform[]): Array<{
  id: string;
  platform: SocialPlatform;
  accountName: string;
  avatarUrl?: string;
}> {
  return platforms.map((platform) => ({
    id: `mock-account-${platform.toLowerCase()}`,
    platform,
    accountName: `${platform.charAt(0)}${platform.slice(1).toLowerCase()} Account`,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${platform}`,
  }));
}

/**
 * Filter posts by search query
 */
function filterBySearch(posts: StreamPost[], searchQuery?: string): StreamPost[] {
  if (!searchQuery) return posts;
  const query = searchQuery.toLowerCase();
  return posts.filter(
    (post) =>
      post.content.toLowerCase().includes(query) ||
      post.accountName.toLowerCase().includes(query),
  );
}

/**
 * Filter posts by date range
 */
function filterByDateRange(
  posts: StreamPost[],
  startDate?: string,
  endDate?: string,
): StreamPost[] {
  let filtered = posts;

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((post) => post.publishedAt >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    filtered = filtered.filter((post) => post.publishedAt <= end);
  }

  return filtered;
}

/**
 * Sort posts by the specified field and order
 */
function sortPosts(
  posts: StreamPost[],
  sortBy: StreamSortBy,
  sortOrder: StreamSortOrder,
): StreamPost[] {
  return [...posts].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "publishedAt":
        comparison = a.publishedAt.getTime() - b.publishedAt.getTime();
        break;
      case "likes":
        comparison = (a.metrics?.likes || 0) - (b.metrics?.likes || 0);
        break;
      case "comments":
        comparison = (a.metrics?.comments || 0) - (b.metrics?.comments || 0);
        break;
      case "engagementRate":
        comparison = (a.metrics?.engagementRate || 0) - (b.metrics?.engagementRate || 0);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });
}

/**
 * GET /api/social/streams
 *
 * Fetch and aggregate social posts from all connected accounts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const { params, error: parseError } = parseQueryParams(searchParams);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    // For ORB-005, generate mock data
    // In ORB-006, this will be replaced with real API calls to connected accounts
    const targetPlatforms = params.platforms || VALID_PLATFORMS.filter(p => p !== "TIKTOK");
    const postsPerPlatform = 5;

    // Generate mock accounts
    const accounts = generateMockAccounts(targetPlatforms);

    // Generate mock posts for each platform
    let allPosts: StreamPost[] = [];
    for (const account of accounts) {
      const posts = generateMockPosts(
        account.platform,
        account.id,
        account.accountName,
        postsPerPlatform,
      );
      allPosts = allPosts.concat(posts);
    }

    // Apply filters
    allPosts = filterBySearch(allPosts, params.searchQuery);
    allPosts = filterByDateRange(allPosts, params.startDate, params.endDate);

    // Sort posts
    allPosts = sortPosts(allPosts, params.sortBy!, params.sortOrder!);

    // Apply pagination
    const limit = params.limit!;
    let startIndex = 0;

    if (params.cursor) {
      // Simple cursor-based pagination using index
      startIndex = parseInt(params.cursor, 10);
      if (isNaN(startIndex)) startIndex = 0;
    }

    const paginatedPosts = allPosts.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allPosts.length;
    const nextCursor = hasMore ? String(startIndex + limit) : undefined;

    const response: StreamsResponse = {
      posts: paginatedPosts,
      accounts,
      hasMore,
      nextCursor,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch social streams:", error);
    return NextResponse.json(
      { error: "Failed to fetch social streams" },
      { status: 500 },
    );
  }
}
