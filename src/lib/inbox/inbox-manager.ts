/**
 * Inbox Manager
 *
 * Core functions for managing inbox items.
 */

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { RoutingEngine } from "@/lib/smart-routing/routing-engine";

import type {
  AssignmentResult,
  CreateInboxItemInput,
  InboxItem,
  InboxItemFilter,
  InboxStats,
  PaginatedInboxItems,
  PaginationOptions,
  UpdateInboxItemInput,
} from "./types";

/**
 * Create a new inbox item
 */
export async function createInboxItem(
  input: CreateInboxItemInput,
): Promise<InboxItem> {
  return prisma.inboxItem.create({
    data: {
      type: input.type,
      platform: input.platform,
      platformItemId: input.platformItemId,
      content: input.content,
      senderName: input.senderName,
      senderHandle: input.senderHandle,
      senderAvatarUrl: input.senderAvatarUrl,
      originalPostId: input.originalPostId,
      originalPostContent: input.originalPostContent,
      metadata: input.metadata as Prisma.InputJsonValue,
      receivedAt: input.receivedAt,
      workspaceId: input.workspaceId,
      accountId: input.accountId,
    },
  });
}

/**
 * Get an inbox item by ID
 */
export async function getInboxItem(id: string): Promise<InboxItem | null> {
  return prisma.inboxItem.findUnique({
    where: { id },
    include: {
      account: true,
      assignedTo: {
        include: { user: true },
      },
      drafts: true,
    },
  });
}

/**
 * Update an inbox item
 */
export async function updateInboxItem(
  id: string,
  input: UpdateInboxItemInput,
): Promise<InboxItem> {
  return prisma.inboxItem.update({
    where: { id },
    data: {
      status: input.status,
      readAt: input.readAt,
      repliedAt: input.repliedAt,
      resolvedAt: input.resolvedAt,
      assignedToId: input.assignedToId,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });
}

/**
 * Delete an inbox item (soft delete by archiving)
 */
export async function archiveInboxItem(id: string): Promise<InboxItem> {
  return prisma.inboxItem.update({
    where: { id },
    data: {
      status: "ARCHIVED",
      resolvedAt: new Date(),
    },
  });
}

/**
 * Mark an inbox item as read
 */
export async function markAsRead(id: string): Promise<InboxItem> {
  return prisma.inboxItem.update({
    where: { id },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });
}

/**
 * Mark an inbox item as unread
 */
export async function markAsUnread(id: string): Promise<InboxItem> {
  return prisma.inboxItem.update({
    where: { id },
    data: {
      status: "UNREAD",
      readAt: null,
    },
  });
}

/**
 * Mark multiple inbox items as read
 */
export async function markMultipleAsRead(ids: string[]): Promise<number> {
  const result = await prisma.inboxItem.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });
  return result.count;
}

/**
 * Assign an inbox item to a team member
 */
export async function assignInboxItem(
  id: string,
  assignedToId: string | null,
): Promise<AssignmentResult> {
  const existingItem = await prisma.inboxItem.findUnique({
    where: { id },
    select: { assignedToId: true },
  });

  if (!existingItem) {
    throw new Error(`Inbox item with id ${id} not found`);
  }

  const previousAssigneeId = existingItem.assignedToId;

  const item = await prisma.inboxItem.update({
    where: { id },
    data: {
      assignedToId,
    },
  });

  return {
    success: true,
    item,
    previousAssigneeId,
  };
}

/**
 * Build a Prisma where clause from filter options
 */
function buildWhereClause(filter: InboxItemFilter): Prisma.InboxItemWhereInput {
  const where: Prisma.InboxItemWhereInput = {
    workspaceId: filter.workspaceId,
  };

  if (filter.status) {
    where.status = Array.isArray(filter.status)
      ? { in: filter.status }
      : filter.status;
  }

  if (filter.type) {
    where.type = Array.isArray(filter.type)
      ? { in: filter.type }
      : filter.type;
  }

  if (filter.platform) {
    where.platform = Array.isArray(filter.platform)
      ? { in: filter.platform }
      : filter.platform;
  }

  if (filter.assignedToId !== undefined) {
    where.assignedToId = filter.assignedToId;
  }

  if (filter.accountId) {
    where.accountId = filter.accountId;
  }

  if (filter.receivedAfter || filter.receivedBefore) {
    where.receivedAt = {};
    if (filter.receivedAfter) {
      where.receivedAt.gte = filter.receivedAfter;
    }
    if (filter.receivedBefore) {
      where.receivedAt.lte = filter.receivedBefore;
    }
  }

  if (filter.sentiment) {
    where.sentiment = Array.isArray(filter.sentiment)
      ? { in: filter.sentiment }
      : filter.sentiment;
  }

  if (filter.minPriority !== undefined || filter.maxPriority !== undefined) {
    where.priorityScore = {};
    if (filter.minPriority !== undefined) {
      where.priorityScore.gte = filter.minPriority;
    }
    if (filter.maxPriority !== undefined) {
      where.priorityScore.lte = filter.maxPriority;
    }
  }

  if (filter.escalated !== undefined) {
    where.escalationStatus = filter.escalated
      ? { not: "NONE" }
      : "NONE";
  }

  return where;
}

/**
 * List inbox items with filtering and pagination
 */
export async function listInboxItems(
  filter: InboxItemFilter,
  pagination: PaginationOptions = {},
): Promise<PaginatedInboxItems> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const orderBy = pagination.orderBy ?? "receivedAt";
  const orderDirection = pagination.orderDirection ?? "desc";

  const where = buildWhereClause(filter);

  const [items, total] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        account: true,
        assignedTo: {
          include: { user: true },
        },
      },
    }),
    prisma.inboxItem.count({ where }),
  ]);

  // Fire-and-forget analysis for items needing it
  const unanalyzed = items.filter((i: InboxItem) =>
    !i.routingAnalyzedAt && i.content && i.type !== "review"
  ); // Avoid reviews/system if needed
  if (unanalyzed.length > 0) {
    // Determine unique workspaceIds involved filtering
    // Actually items might belong to different workspaces if not filtered by workspaceId (but filter requires workspaceId)
    // filter.workspaceId is mandatory in InboxItemFilter? Yes.

    Promise.all(unanalyzed.map(i => RoutingEngine.processItem(i.id, i.workspaceId)))
      .catch(error => console.error("Auto-analysis trigger failed:", error));
  }

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Get inbox statistics for a workspace
 */
export async function getInboxStats(workspaceId: string): Promise<InboxStats> {
  const [
    total,
    unread,
    pending,
    assigned,
    byPlatformRaw,
    byTypeRaw,
  ] = await Promise.all([
    prisma.inboxItem.count({ where: { workspaceId } }),
    prisma.inboxItem.count({ where: { workspaceId, status: "UNREAD" } }),
    prisma.inboxItem.count({ where: { workspaceId, status: "PENDING_REPLY" } }),
    prisma.inboxItem.count({
      where: { workspaceId, assignedToId: { not: null } },
    }),
    prisma.inboxItem.groupBy({
      by: ["platform"],
      where: { workspaceId },
      _count: true,
    }),
    prisma.inboxItem.groupBy({
      by: ["type"],
      where: { workspaceId },
      _count: true,
    }),
  ]);

  const byPlatform = byPlatformRaw.reduce(
    (acc, item) => {
      acc[item.platform] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byType = byTypeRaw.reduce(
    (acc, item) => {
      acc[item.type] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    total,
    unread,
    pending,
    assigned,
    byPlatform: byPlatform as InboxStats["byPlatform"],
    byType: byType as InboxStats["byType"],
  };
}

/**
 * Get inbox items by platform item ID (for deduplication)
 */
export async function getInboxItemByPlatformId(
  workspaceId: string,
  platform: string,
  platformItemId: string,
): Promise<InboxItem | null> {
  return prisma.inboxItem.findUnique({
    where: {
      workspaceId_platform_platformItemId: {
        workspaceId,
        platform: platform as InboxItem["platform"],
        platformItemId,
      },
    },
  });
}

/**
 * Upsert an inbox item (create if not exists, update if exists)
 */
export async function upsertInboxItem(
  input: CreateInboxItemInput,
): Promise<InboxItem> {
  return prisma.inboxItem.upsert({
    where: {
      workspaceId_platform_platformItemId: {
        workspaceId: input.workspaceId,
        platform: input.platform,
        platformItemId: input.platformItemId,
      },
    },
    create: {
      type: input.type,
      platform: input.platform,
      platformItemId: input.platformItemId,
      content: input.content,
      senderName: input.senderName,
      senderHandle: input.senderHandle,
      senderAvatarUrl: input.senderAvatarUrl,
      originalPostId: input.originalPostId,
      originalPostContent: input.originalPostContent,
      metadata: input.metadata as Prisma.InputJsonValue,
      receivedAt: input.receivedAt,
      workspaceId: input.workspaceId,
      accountId: input.accountId,
    },
    update: {
      content: input.content,
      senderName: input.senderName,
      senderHandle: input.senderHandle,
      senderAvatarUrl: input.senderAvatarUrl,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });
}
