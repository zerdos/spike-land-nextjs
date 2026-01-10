/**
 * Inbox Types
 *
 * Type definitions for the inbox management system.
 */

import type { InboxItem } from "@prisma/client";
import { InboxItemStatus, InboxItemType, SocialPlatform } from "@prisma/client";

/**
 * Options for creating an inbox item
 */
export interface CreateInboxItemInput {
  type: InboxItemType;
  platform: SocialPlatform;
  platformItemId: string;
  content: string;
  senderName: string;
  senderHandle?: string;
  senderAvatarUrl?: string;
  originalPostId?: string;
  originalPostContent?: string;
  metadata?: Record<string, unknown>;
  receivedAt: Date;
  workspaceId: string;
  accountId: string;
}

/**
 * Options for updating an inbox item
 */
export interface UpdateInboxItemInput {
  status?: InboxItemStatus;
  readAt?: Date | null;
  repliedAt?: Date | null;
  resolvedAt?: Date | null;
  assignedToId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for listing inbox items
 */
export interface InboxItemFilter {
  workspaceId: string;
  status?: InboxItemStatus | InboxItemStatus[];
  type?: InboxItemType | InboxItemType[];
  platform?: SocialPlatform | SocialPlatform[];
  assignedToId?: string | null;
  accountId?: string;
  receivedAfter?: Date;
  receivedBefore?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: "receivedAt" | "createdAt" | "updatedAt";
  orderDirection?: "asc" | "desc";
}

/**
 * Paginated response
 */
export interface PaginatedInboxItems {
  items: InboxItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Inbox statistics for a workspace
 */
export interface InboxStats {
  total: number;
  unread: number;
  pending: number;
  assigned: number;
  byPlatform: Record<SocialPlatform, number>;
  byType: Record<InboxItemType, number>;
}

/**
 * Result of assigning an inbox item
 */
export interface AssignmentResult {
  success: boolean;
  item: InboxItem;
  previousAssigneeId?: string | null;
}

// Re-export Prisma types for convenience
export type { InboxItem } from "@prisma/client";
export { InboxItemStatus, InboxItemType, SocialPlatform };
