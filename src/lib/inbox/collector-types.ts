/**
 * Inbox Collector Types
 *
 * Type definitions for the inbox collection system.
 */

import type { InboxItemType, SocialPlatform } from "@prisma/client";

/**
 * Raw message from a social platform
 */
export interface RawSocialMessage {
  platformItemId: string;
  type: InboxItemType;
  content: string;
  senderName: string;
  senderHandle?: string;
  senderAvatarUrl?: string;
  originalPostId?: string;
  originalPostContent?: string;
  receivedAt: Date;
  rawData: Record<string, unknown>;
}

/**
 * Collection result from a platform
 */
export interface CollectionResult {
  platform: SocialPlatform;
  accountId: string;
  messages: RawSocialMessage[];
  hasMore: boolean;
  cursor?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

/**
 * Collection options for fetching messages
 */
export interface CollectionOptions {
  sinceId?: string;
  maxResults?: number;
  cursor?: string;
}

/**
 * Rate limit status for a platform
 */
export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
  isLimited: boolean;
}

/**
 * Backoff configuration for rate limiting
 */
export interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  maxRetries: number;
}

/**
 * Collection job status
 */
export type CollectionJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "RATE_LIMITED";

/**
 * Collection job result
 */
export interface CollectionJobResult {
  status: CollectionJobStatus;
  platform: SocialPlatform;
  accountId: string;
  messagesCollected: number;
  newMessages: number;
  duplicatesSkipped: number;
  error?: string;
  nextCursor?: string;
  startedAt: Date;
  completedAt?: Date;
  rateLimitStatus?: RateLimitStatus;
}

/**
 * Interface for platform-specific collectors
 */
export interface IPlatformCollector {
  readonly platform: SocialPlatform;

  /**
   * Check if the collector can collect for this account
   */
  canCollect(accessToken: string): Promise<boolean>;

  /**
   * Collect mentions for an account
   */
  collectMentions(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult>;

  /**
   * Collect direct messages for an account
   */
  collectDirectMessages(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult>;

  /**
   * Collect comments on posts for an account
   */
  collectComments(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult>;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus | null;
}

/**
 * Social account for collection
 */
export interface CollectableAccount {
  id: string;
  workspaceId: string;
  platform: SocialPlatform;
  platformAccountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

/**
 * Workspace collection config
 */
export interface WorkspaceCollectionConfig {
  workspaceId: string;
  accounts: CollectableAccount[];
  lastCollectedAt?: Date;
}
