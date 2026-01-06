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
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { createSocialClient } from "@/lib/social";
import {
  type AccountContext,
  type AggregateOptions,
  aggregateStreamPosts,
} from "@/lib/social/stream-aggregator";
import {
  type SocialPlatform,
  type SocialPost,
  type StreamFilter,
  type StreamSortBy,
  type StreamSortOrder,
  type StreamsQueryParams,
  type StreamsResponse,
} from "@/lib/social/types";
import { tryCatch } from "@/lib/try-catch";
import type { SocialAccount } from "@prisma/client";
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
 * Error info for accounts that failed to fetch
 */
interface AccountError {
  accountId: string;
  platform: SocialPlatform;
  message: string;
}

/**
 * Result of fetching posts from all accounts
 */
interface FetchAccountsResult {
  postsWithContext: Array<[SocialPost[], AccountContext]>;
  accounts: Array<{
    id: string;
    platform: SocialPlatform;
    accountName: string;
    avatarUrl?: string;
  }>;
  errors: AccountError[];
}

/**
 * Fetch connected social accounts for a workspace
 * Uses workspaceId to find the workspace's social accounts
 */
export async function fetchConnectedAccounts(
  workspaceId: string,
  platforms?: SocialPlatform[],
): Promise<SocialAccount[]> {
  const whereClause: {
    workspaceId: string;
    status: "ACTIVE";
    platform?: { in: SocialPlatform[]; };
  } = {
    workspaceId,
    status: "ACTIVE",
  };

  if (platforms && platforms.length > 0) {
    whereClause.platform = { in: platforms };
  }

  return prisma.socialAccount.findMany({
    where: whereClause,
  });
}

/**
 * Fetch posts from a single social account
 * Returns posts and account context, or throws on error
 */
export async function fetchAccountPosts(
  account: SocialAccount,
  limit: number,
): Promise<{ posts: SocialPost[]; context: AccountContext; }> {
  // Decrypt the access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create the appropriate social client based on platform
  const clientOptions: Record<string, string> = {
    accessToken,
    accountId: account.accountId,
  };

  // Platform-specific client options
  if (account.platform === "FACEBOOK") {
    // Facebook needs pageId set
    clientOptions.pageId = account.accountId;
  } else if (account.platform === "INSTAGRAM") {
    // Instagram needs igUserId set
    clientOptions.igUserId = account.accountId;
  }

  const client = createSocialClient(account.platform, clientOptions);

  // Fetch posts from the social platform API
  const posts = await client.getPosts(limit);

  // Create account context for stream transformation
  const context: AccountContext = {
    accountId: account.id,
    accountName: account.accountName,
    accountAvatarUrl: (account.metadata as { avatarUrl?: string; } | null)?.avatarUrl,
    platform: account.platform,
  };

  return { posts, context };
}

/**
 * Fetch posts from all connected accounts
 * Uses Promise.allSettled to handle partial failures gracefully
 */
export async function fetchAllAccountPosts(
  accounts: SocialAccount[],
  postsPerAccount: number,
): Promise<FetchAccountsResult> {
  const postsWithContext: Array<[SocialPost[], AccountContext]> = [];
  const accountInfos: Array<{
    id: string;
    platform: SocialPlatform;
    accountName: string;
    avatarUrl?: string;
  }> = [];
  const errors: AccountError[] = [];

  // Fetch posts from all accounts in parallel, handling failures gracefully
  const results = await Promise.allSettled(
    accounts.map((account) => fetchAccountPosts(account, postsPerAccount)),
  );

  // Process results
  results.forEach((result, index) => {
    const account = accounts[index];
    if (!account) return;

    if (result.status === "fulfilled") {
      const { posts, context } = result.value;
      postsWithContext.push([posts, context]);
      accountInfos.push({
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        avatarUrl: (account.metadata as { avatarUrl?: string; } | null)?.avatarUrl,
      });
    } else {
      // Account failed to fetch - log error and continue
      console.error(
        `Failed to fetch posts for account ${account.id} (${account.platform}):`,
        result.reason,
      );
      errors.push({
        accountId: account.id,
        platform: account.platform,
        message: result.reason instanceof Error
          ? result.reason.message
          : "Failed to fetch posts",
      });
      // Still include account in list even if fetching failed
      accountInfos.push({
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        avatarUrl: (account.metadata as { avatarUrl?: string; } | null)?.avatarUrl,
      });
    }
  });

  return { postsWithContext, accounts: accountInfos, errors };
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

  // Verify user has access to the workspace
  const { error: permError } = await tryCatch(
    requireWorkspaceMembership(session, params.workspaceId),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  try {
    const postsPerAccount = 10; // Fetch up to 10 posts per account

    // Fetch connected social accounts from the database (by workspace)
    const connectedAccounts = await fetchConnectedAccounts(params.workspaceId, params.platforms);

    // If no accounts are connected, return empty response
    if (connectedAccounts.length === 0) {
      const response: StreamsResponse = {
        posts: [],
        accounts: [],
        hasMore: false,
        nextCursor: undefined,
      };
      return NextResponse.json(response);
    }

    // Fetch posts from all connected accounts
    const { postsWithContext, accounts, errors } = await fetchAllAccountPosts(
      connectedAccounts,
      postsPerAccount,
    );

    // Build filter from query params
    const filter: StreamFilter = {
      platforms: params.platforms,
      sortBy: params.sortBy || "publishedAt",
      sortOrder: params.sortOrder || "desc",
      searchQuery: params.searchQuery,
    };

    // Add date range if provided
    if (params.startDate || params.endDate) {
      filter.dateRange = {
        start: params.startDate ? new Date(params.startDate) : new Date(0),
        end: params.endDate ? new Date(params.endDate) : new Date(),
      };
    }

    // Aggregate posts using stream-aggregator
    const aggregateOptions: AggregateOptions = {
      filter,
      limit: params.limit || 20,
      cursor: params.cursor,
    };

    const aggregatedResult = aggregateStreamPosts(postsWithContext, aggregateOptions);

    // Build response
    const response: StreamsResponse = {
      posts: aggregatedResult.posts,
      accounts,
      hasMore: aggregatedResult.hasMore,
      nextCursor: aggregatedResult.nextCursor,
      errors: errors.length > 0 ? errors : undefined,
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
