/**
 * Scheduled Posts Service
 *
 * Business logic for managing scheduled posts (Calendar feature)
 * Resolves #571
 */

import prisma from "@/lib/prisma";
import type { Prisma, ScheduledPostStatus } from "@prisma/client";
import type {
  CalendarPostItem,
  CalendarViewResponse,
  CreateScheduledPostInput,
  DateRange,
  PublishAccountResult,
  PublishScheduledPostResult,
  ScheduledPostMetadata,
  ScheduledPostsListResponse,
  ScheduledPostsQueryOptions,
  ScheduledPostsStats,
  ScheduledPostWithAccounts,
  UpdateScheduledPostInput,
} from "./types";

/**
 * Create a new scheduled post
 */
export async function createScheduledPost(
  workspaceId: string,
  createdById: string,
  input: CreateScheduledPostInput,
): Promise<ScheduledPostWithAccounts> {
  // Verify all accounts belong to this workspace
  const accounts = await prisma.socialAccount.findMany({
    where: {
      id: { in: input.accountIds },
      workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      platform: true,
      accountName: true,
    },
  });

  if (accounts.length !== input.accountIds.length) {
    throw new Error("One or more accounts are invalid or inactive");
  }

  const post = await prisma.scheduledPost.create({
    data: {
      content: input.content,
      scheduledAt: input.scheduledAt,
      timezone: input.timezone ?? "UTC",
      recurrenceRule: input.recurrenceRule,
      recurrenceEndAt: input.recurrenceEndAt,
      metadata: input.metadata as Prisma.JsonObject | undefined,
      status: "DRAFT",
      workspaceId,
      createdById,
      postAccounts: {
        create: input.accountIds.map((accountId) => ({
          accountId,
          status: "DRAFT" as ScheduledPostStatus,
        })),
      },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  return mapPostToWithAccounts(post);
}

/**
 * Update an existing scheduled post
 */
export async function updateScheduledPost(
  postId: string,
  workspaceId: string,
  input: UpdateScheduledPostInput,
): Promise<ScheduledPostWithAccounts> {
  // Verify post belongs to workspace
  const existingPost = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    select: { workspaceId: true, status: true },
  });

  if (!existingPost || existingPost.workspaceId !== workspaceId) {
    throw new Error("Scheduled post not found");
  }

  // Don't allow updates to published or publishing posts
  if (
    existingPost.status === "PUBLISHED" || existingPost.status === "PUBLISHING"
  ) {
    throw new Error("Cannot update a published or publishing post");
  }

  // Handle account changes if provided
  if (input.accountIds) {
    const accounts = await prisma.socialAccount.findMany({
      where: {
        id: { in: input.accountIds },
        workspaceId,
        status: "ACTIVE",
      },
    });

    if (accounts.length !== input.accountIds.length) {
      throw new Error("One or more accounts are invalid or inactive");
    }

    // Delete existing associations and create new ones
    await prisma.scheduledPostAccount.deleteMany({
      where: { postId },
    });

    await prisma.scheduledPostAccount.createMany({
      data: input.accountIds.map((accountId) => ({
        postId,
        accountId,
        status: "DRAFT" as ScheduledPostStatus,
      })),
    });
  }

  const post = await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      ...(input.content !== undefined && { content: input.content }),
      ...(input.scheduledAt !== undefined &&
        { scheduledAt: input.scheduledAt }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.recurrenceRule !== undefined &&
        { recurrenceRule: input.recurrenceRule }),
      ...(input.recurrenceEndAt !== undefined &&
        { recurrenceEndAt: input.recurrenceEndAt }),
      ...(input.metadata !== undefined &&
        { metadata: input.metadata as Prisma.JsonObject }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  return mapPostToWithAccounts(post);
}

/**
 * Delete a scheduled post
 */
export async function deleteScheduledPost(
  postId: string,
  workspaceId: string,
): Promise<void> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    select: { workspaceId: true, status: true },
  });

  if (!post || post.workspaceId !== workspaceId) {
    throw new Error("Scheduled post not found");
  }

  // Don't allow deleting posts that are currently publishing
  if (post.status === "PUBLISHING") {
    throw new Error("Cannot delete a post that is currently publishing");
  }

  await prisma.scheduledPost.delete({
    where: { id: postId },
  });
}

/**
 * Get a single scheduled post by ID
 */
export async function getScheduledPost(
  postId: string,
  workspaceId: string,
): Promise<ScheduledPostWithAccounts | null> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  if (!post || post.workspaceId !== workspaceId) {
    return null;
  }

  return mapPostToWithAccounts(post);
}

/**
 * List scheduled posts with filtering
 */
export async function listScheduledPosts(
  options: ScheduledPostsQueryOptions,
): Promise<ScheduledPostsListResponse> {
  const {
    workspaceId,
    dateRange,
    status,
    platforms,
    accountIds,
    limit = 50,
    offset = 0,
  } = options;

  const where: Prisma.ScheduledPostWhereInput = {
    workspaceId,
    ...(dateRange && {
      scheduledAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    }),
    ...(status && status.length > 0 && {
      status: { in: status },
    }),
    ...(platforms && platforms.length > 0 && {
      postAccounts: {
        some: {
          account: {
            platform: { in: platforms },
          },
        },
      },
    }),
    ...(accountIds && accountIds.length > 0 && {
      postAccounts: {
        some: {
          accountId: { in: accountIds },
        },
      },
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.scheduledPost.findMany({
      where,
      include: {
        postAccounts: {
          include: {
            account: {
              select: {
                platform: true,
                accountName: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.scheduledPost.count({ where }),
  ]);

  return {
    posts: posts.map(mapPostToWithAccounts),
    total,
    hasMore: offset + posts.length < total,
  };
}

/**
 * Get posts for calendar view (simplified data)
 */
export async function getCalendarView(
  workspaceId: string,
  dateRange: DateRange,
): Promise<CalendarViewResponse> {
  const posts = await prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      scheduledAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      status: { not: "CANCELLED" },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const calendarPosts: CalendarPostItem[] = posts.map((post) => ({
    id: post.id,
    content: post.content,
    scheduledAt: post.scheduledAt,
    status: post.status,
    platforms: [...new Set(post.postAccounts.map((pa) => pa.account.platform))],
    accountNames: post.postAccounts.map((pa) => pa.account.accountName),
    isRecurring: !!post.recurrenceRule,
  }));

  return {
    posts: calendarPosts,
    dateRange,
  };
}

/**
 * Schedule a post (change status from DRAFT to SCHEDULED)
 */
export async function schedulePost(
  postId: string,
  workspaceId: string,
): Promise<ScheduledPostWithAccounts> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: {
      postAccounts: true,
    },
  });

  if (!post || post.workspaceId !== workspaceId) {
    throw new Error("Scheduled post not found");
  }

  if (post.status !== "DRAFT" && post.status !== "PENDING") {
    throw new Error("Post must be in DRAFT or PENDING status to schedule");
  }

  if (post.postAccounts.length === 0) {
    throw new Error("Post must have at least one target account");
  }

  if (post.scheduledAt <= new Date()) {
    throw new Error("Scheduled time must be in the future");
  }

  const updatedPost = await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: "SCHEDULED",
      postAccounts: {
        updateMany: {
          where: { postId },
          data: { status: "SCHEDULED" },
        },
      },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  return mapPostToWithAccounts(updatedPost);
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(
  postId: string,
  workspaceId: string,
): Promise<ScheduledPostWithAccounts> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    select: { workspaceId: true, status: true },
  });

  if (!post || post.workspaceId !== workspaceId) {
    throw new Error("Scheduled post not found");
  }

  if (post.status === "PUBLISHED" || post.status === "PUBLISHING") {
    throw new Error("Cannot cancel a published or publishing post");
  }

  const updatedPost = await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: "CANCELLED",
      postAccounts: {
        updateMany: {
          where: { postId },
          data: { status: "CANCELLED" },
        },
      },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
            },
          },
        },
      },
    },
  });

  return mapPostToWithAccounts(updatedPost);
}

/**
 * Get posts that are due for publishing
 */
export async function getDueScheduledPosts(
  limit = 100,
): Promise<ScheduledPostWithAccounts[]> {
  const now = new Date();

  const posts = await prisma.scheduledPost.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
              accountName: true,
              accessTokenEncrypted: true,
              refreshTokenEncrypted: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  return posts.map(mapPostToWithAccounts);
}

/**
 * Mark a post as publishing (in progress)
 */
export async function markPostPublishing(postId: string): Promise<void> {
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: "PUBLISHING",
      lastAttemptAt: new Date(),
      postAccounts: {
        updateMany: {
          where: { postId, status: "SCHEDULED" },
          data: { status: "PUBLISHING" },
        },
      },
    },
  });
}

/**
 * Record the result of publishing to a single account
 */
export async function recordAccountPublishResult(
  postId: string,
  accountId: string,
  result: PublishAccountResult,
): Promise<void> {
  await prisma.scheduledPostAccount.update({
    where: {
      postId_accountId: { postId, accountId },
    },
    data: {
      status: result.success ? "PUBLISHED" : "FAILED",
      platformPostId: result.platformPostId,
      publishedAt: result.success ? new Date() : null,
      errorMessage: result.error,
    },
  });
}

/**
 * Finalize post publishing (update main post status based on account results)
 */
export async function finalizePostPublishing(
  postId: string,
): Promise<PublishScheduledPostResult> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const results: PublishAccountResult[] = post.postAccounts.map((pa) => ({
    accountId: pa.accountId,
    platform: pa.account.platform,
    success: pa.status === "PUBLISHED",
    platformPostId: pa.platformPostId ?? undefined,
    error: pa.errorMessage ?? undefined,
  }));

  const allSucceeded = results.every((r) => r.success);
  const anySucceeded = results.some((r) => r.success);
  const partialSuccess = anySucceeded && !allSucceeded;

  // Determine final status
  let finalStatus: ScheduledPostStatus;
  if (allSucceeded) {
    finalStatus = "PUBLISHED";
  } else if (partialSuccess) {
    // Some succeeded, some failed - mark as PUBLISHED but keep error info
    finalStatus = "PUBLISHED";
  } else {
    // Check retry count
    if (post.retryCount < post.maxRetries) {
      // Will be retried - keep as SCHEDULED
      finalStatus = "SCHEDULED";
    } else {
      finalStatus = "FAILED";
    }
  }

  // Update the post
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: finalStatus,
      publishedAt: anySucceeded ? new Date() : null,
      errorMessage: !allSucceeded
        ? results
          .filter((r) => !r.success)
          .map((r) => `${r.platform}: ${r.error}`)
          .join("; ")
        : null,
      retryCount: !anySucceeded ? post.retryCount + 1 : post.retryCount,
    },
  });

  return {
    postId,
    success: allSucceeded,
    results,
    allSucceeded,
    partialSuccess,
  };
}

/**
 * Get scheduled posts statistics for a workspace
 */
export async function getScheduledPostsStats(
  workspaceId: string,
): Promise<ScheduledPostsStats> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const [
    totalScheduled,
    todayCount,
    thisWeekCount,
    failedCount,
    publishedTodayCount,
  ] = await Promise.all([
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        status: "SCHEDULED",
      },
    }),
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        status: "SCHEDULED",
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        status: "SCHEDULED",
        scheduledAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    }),
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        status: "FAILED",
      },
    }),
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        status: "PUBLISHED",
        publishedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
  ]);

  return {
    totalScheduled,
    todayCount,
    thisWeekCount,
    failedCount,
    publishedTodayCount,
  };
}

/**
 * Helper function to map Prisma result to ScheduledPostWithAccounts
 */
function mapPostToWithAccounts(
  post: Prisma.ScheduledPostGetPayload<{
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true;
              accountName: true;
            };
          };
        };
      };
    };
  }>,
): ScheduledPostWithAccounts {
  return {
    id: post.id,
    content: post.content,
    scheduledAt: post.scheduledAt,
    timezone: post.timezone,
    recurrenceRule: post.recurrenceRule,
    recurrenceEndAt: post.recurrenceEndAt,
    status: post.status,
    metadata: post.metadata as ScheduledPostMetadata | null,
    publishedAt: post.publishedAt,
    errorMessage: post.errorMessage,
    retryCount: post.retryCount,
    maxRetries: post.maxRetries,
    lastAttemptAt: post.lastAttemptAt,
    nextOccurrenceAt: post.nextOccurrenceAt,
    workspaceId: post.workspaceId,
    createdById: post.createdById,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    accounts: post.postAccounts.map((pa) => ({
      id: pa.id,
      accountId: pa.accountId,
      platform: pa.account.platform,
      accountName: pa.account.accountName,
      platformPostId: pa.platformPostId,
      publishedAt: pa.publishedAt,
      status: pa.status,
      errorMessage: pa.errorMessage,
    })),
  };
}
