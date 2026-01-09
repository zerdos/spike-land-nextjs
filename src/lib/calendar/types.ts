/**
 * Calendar / Scheduled Posts Types
 *
 * TypeScript types for the Calendar feature (Orbit)
 * Resolves #571
 */

import type { ScheduledPostStatus, SocialPlatform } from "@prisma/client";

// Re-export for convenience
export type { ScheduledPostStatus };

/**
 * Input for creating a scheduled post
 */
export interface CreateScheduledPostInput {
  content: string;
  scheduledAt: Date;
  timezone?: string;
  recurrenceRule?: string; // RRULE format (RFC 5545)
  recurrenceEndAt?: Date;
  accountIds: string[]; // Social account IDs to post to
  metadata?: ScheduledPostMetadata;
}

/**
 * Input for updating a scheduled post
 */
export interface UpdateScheduledPostInput {
  content?: string;
  scheduledAt?: Date;
  timezone?: string;
  recurrenceRule?: string | null;
  recurrenceEndAt?: Date | null;
  accountIds?: string[];
  metadata?: ScheduledPostMetadata;
  status?: ScheduledPostStatus;
}

/**
 * Metadata stored with scheduled posts
 */
export interface ScheduledPostMetadata {
  mediaUrls?: string[];
  mediaIds?: string[]; // Platform-specific media asset IDs
  link?: string;
  linkPreview?: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
  // Platform-specific overrides
  platformOverrides?: Record<
    SocialPlatform,
    {
      content?: string;
      mediaIds?: string[];
    }
  >;
}

/**
 * A scheduled post with its account targets
 */
export interface ScheduledPostWithAccounts {
  id: string;
  content: string;
  scheduledAt: Date;
  timezone: string;
  recurrenceRule: string | null;
  recurrenceEndAt: Date | null;
  status: ScheduledPostStatus;
  metadata: ScheduledPostMetadata | null;
  publishedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt: Date | null;
  nextOccurrenceAt: Date | null;
  workspaceId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  accounts: ScheduledPostAccountInfo[];
}

/**
 * Account info for a scheduled post target
 */
export interface ScheduledPostAccountInfo {
  id: string;
  accountId: string;
  platform: SocialPlatform;
  accountName: string;
  platformPostId: string | null;
  publishedAt: Date | null;
  status: ScheduledPostStatus;
  errorMessage: string | null;
}

/**
 * Calendar view item (simplified for calendar grid display)
 */
export interface CalendarPostItem {
  id: string;
  content: string;
  scheduledAt: Date;
  status: ScheduledPostStatus;
  platforms: SocialPlatform[];
  accountNames: string[];
  isRecurring: boolean;
}

/**
 * Date range for calendar queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Query options for fetching scheduled posts
 */
export interface ScheduledPostsQueryOptions {
  workspaceId: string;
  dateRange?: DateRange;
  status?: ScheduledPostStatus[];
  platforms?: SocialPlatform[];
  accountIds?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Response from the scheduled posts list API
 */
export interface ScheduledPostsListResponse {
  posts: ScheduledPostWithAccounts[];
  total: number;
  hasMore: boolean;
}

/**
 * Response from the calendar view API
 */
export interface CalendarViewResponse {
  posts: CalendarPostItem[];
  dateRange: DateRange;
}

/**
 * Publishing result for a single account
 */
export interface PublishAccountResult {
  accountId: string;
  platform: SocialPlatform;
  success: boolean;
  platformPostId?: string;
  error?: string;
}

/**
 * Publishing result for a scheduled post
 */
export interface PublishScheduledPostResult {
  postId: string;
  success: boolean;
  results: PublishAccountResult[];
  allSucceeded: boolean;
  partialSuccess: boolean;
}

/**
 * Statistics for scheduled posts (dashboard widget)
 */
export interface ScheduledPostsStats {
  totalScheduled: number;
  todayCount: number;
  thisWeekCount: number;
  failedCount: number;
  publishedTodayCount: number;
}
