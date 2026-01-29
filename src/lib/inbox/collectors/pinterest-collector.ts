/**
 * Pinterest Collector
 *
 * Collects comments from Pinterest pins.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";

interface PinterestComment {
  id: string;
  text: string;
  created_at: string;
  pin_id: string;
}

export class PinterestCollector extends BaseCollector {
  readonly platform = "PINTEREST" as const;

  /**
   * Make authenticated request to Pinterest API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${PINTEREST_API_BASE}${endpoint}`);
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
      throw new Error(`Pinterest API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ username: string; }>("/user_account", accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collect comments from Pinterest pins
   *
   * Note: Pinterest API v5 does not provide comment access.
   * This is a stub implementation for future API expansion.
   */
  async collect(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // Pinterest API v5 does not expose comments
      // This would require Pinterest API to add comment endpoints

      const messages: RawSocialMessage[] = [];

      return {
        messages,
        hasMore: false,
        nextCursor: undefined,
      };
    });
  }

  /**
   * Convert Pinterest comment to unified message format
   */
  private convertComment(
    comment: PinterestComment,
  ): RawSocialMessage {
    return {
      platform: "PINTEREST",
      platformMessageId: comment.id,
      messageType: "COMMENT",
      content: comment.text,
      senderPlatformId: comment.id,
      senderName: "Pinterest User",
      senderHandle: undefined,
      senderAvatarUrl: undefined,
      timestamp: new Date(comment.created_at),
      threadId: comment.pin_id,
      url: `https://www.pinterest.com/pin/${comment.pin_id}/`,
      metadata: {},
    };
  }
}
