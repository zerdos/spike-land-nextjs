/**
 * TikTok Collector
 *
 * Collects comments from TikTok videos.
 * Note: TikTok comments API requires special permissions and approval.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

interface TikTokUser {
  open_id: string;
  display_name: string;
  avatar_url?: string;
}

interface TikTokComment {
  id: string;
  text: string;
  video_id: string;
  create_time: number;
  like_count: number;
  parent_comment_id?: string;
}

interface TikTokCommentsResponse {
  data?: {
    comments?: TikTokComment[];
    cursor?: number;
    has_more?: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class TikTokCollector extends BaseCollector {
  readonly platform = "TIKTOK" as const;

  /**
   * Make authenticated request to TikTok API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${TIKTOK_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      const errorText = await response.text();
      throw new Error(`TikTok API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ data: { user: TikTokUser; }; }>(
        "/user/info/",
        accessToken,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collect comments from TikTok videos
   *
   * Note: This is a stub implementation. TikTok's comment API is limited
   * and requires special permissions. Full implementation would:
   * 1. Fetch user's videos
   * 2. For each video, fetch comments
   * 3. Convert to unified message format
   */
  async collect(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // TikTok comments API is not publicly available without special approval
      // This is a placeholder that returns empty results

      // In a full implementation, you would:
      // 1. GET /video/list/ to get user's videos
      // 2. For each video, GET /video/comment/list/ (requires approval)
      // 3. Convert comments to RawSocialMessage format

      const messages: RawSocialMessage[] = [];

      return {
        messages,
        hasMore: false,
        nextCursor: undefined,
      };
    });
  }

  /**
   * Convert TikTok comment to unified message format
   */
  private convertComment(
    comment: TikTokComment,
    videoId: string,
  ): RawSocialMessage {
    return {
      platform: "TIKTOK",
      platformMessageId: comment.id,
      messageType: "COMMENT",
      content: comment.text,
      senderPlatformId: comment.id, // TikTok doesn't expose user IDs in comments
      senderName: "TikTok User",
      senderHandle: undefined,
      senderAvatarUrl: undefined,
      timestamp: new Date(comment.create_time * 1000),
      threadId: videoId,
      parentMessageId: comment.parent_comment_id,
      url: `https://www.tiktok.com/video/${videoId}`,
      metadata: {
        likeCount: comment.like_count,
      },
    };
  }
}
