/**
 * Twitter/X Collector
 *
 * Collects mentions and DMs from Twitter/X API v2.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const TWITTER_API_BASE = "https://api.twitter.com/2";

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{
    type: "replied_to" | "quoted" | "retweeted";
    id: string;
  }>;
}

interface TwitterMentionsResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    tweets?: TwitterTweet[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
    newest_id?: string;
    oldest_id?: string;
  };
}

interface TwitterDMEvent {
  id: string;
  event_type: string;
  text: string;
  sender_id: string;
  created_at: string;
  dm_conversation_id: string;
}

interface TwitterDMResponse {
  data?: TwitterDMEvent[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

export class TwitterCollector extends BaseCollector {
  readonly platform = "TWITTER" as const;

  /**
   * Make authenticated request to Twitter API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${TWITTER_API_BASE}${endpoint}`);
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

    // Update rate limit status from headers
    const remaining = response.headers.get("x-rate-limit-remaining");
    const limit = response.headers.get("x-rate-limit-limit");
    const reset = response.headers.get("x-rate-limit-reset");

    if (remaining && limit && reset) {
      this.updateRateLimitStatus(
        parseInt(remaining, 10),
        parseInt(limit, 10),
        parseInt(reset, 10),
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      const errorText = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ data: TwitterUser; }>("/users/me", accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert Twitter user to sender info
   */
  private getUserInfo(
    userId: string,
    users?: TwitterUser[],
  ): { name: string; handle?: string; avatarUrl?: string; } {
    const user = users?.find((u) => u.id === userId);
    return {
      name: user?.name ?? "Unknown User",
      handle: user ? `@${user.username}` : undefined,
      avatarUrl: user?.profile_image_url,
    };
  }

  /**
   * Collect mentions for an account
   */
  async collectMentions(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      const params: Record<string, string> = {
        "tweet.fields": "created_at,author_id,in_reply_to_user_id,referenced_tweets",
        expansions: "author_id,referenced_tweets.id",
        "user.fields": "name,username,profile_image_url",
        max_results: (options?.maxResults ?? 100).toString(),
      };

      if (options?.sinceId) {
        params["since_id"] = options.sinceId;
      }

      if (options?.cursor) {
        params["pagination_token"] = options.cursor;
      }

      const response = await this.makeRequest<TwitterMentionsResponse>(
        `/users/${accountId}/mentions`,
        accessToken,
        params,
      );

      if (!response.data || response.data.length === 0) {
        return this.createEmptyResult(accountId);
      }

      const messages: RawSocialMessage[] = response.data.map((tweet) => {
        const sender = this.getUserInfo(tweet.author_id, response.includes?.users);
        const referencedTweet = tweet.referenced_tweets?.find(
          (ref) => ref.type === "replied_to",
        );
        const originalTweet = referencedTweet
          ? response.includes?.tweets?.find((t) => t.id === referencedTweet.id)
          : undefined;

        return {
          platformItemId: tweet.id,
          type: referencedTweet ? "REPLY" : "MENTION",
          content: tweet.text,
          senderName: sender.name,
          senderHandle: sender.handle,
          senderAvatarUrl: sender.avatarUrl,
          originalPostId: referencedTweet?.id,
          originalPostContent: originalTweet?.text,
          receivedAt: new Date(tweet.created_at),
          rawData: tweet as unknown as Record<string, unknown>,
        };
      });

      return {
        platform: this.platform,
        accountId,
        messages,
        hasMore: !!response.meta?.next_token,
        cursor: response.meta?.next_token,
        rateLimitRemaining: this.rateLimitStatus?.remaining,
        rateLimitReset: this.rateLimitStatus?.resetAt,
      };
    });
  }

  /**
   * Collect direct messages for an account
   * Note: Requires elevated API access
   */
  async collectDirectMessages(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      const params: Record<string, string> = {
        "dm_event.fields": "created_at,sender_id,dm_conversation_id",
        expansions: "sender_id",
        "user.fields": "name,username,profile_image_url",
        max_results: (options?.maxResults ?? 100).toString(),
      };

      if (options?.cursor) {
        params["pagination_token"] = options.cursor;
      }

      try {
        const response = await this.makeRequest<TwitterDMResponse>(
          "/dm_events",
          accessToken,
          params,
        );

        if (!response.data || response.data.length === 0) {
          return this.createEmptyResult(accountId);
        }

        const messages: RawSocialMessage[] = response.data
          .filter((event) => event.event_type === "MessageCreate")
          .map((event) => {
            const sender = this.getUserInfo(event.sender_id, response.includes?.users);

            return {
              platformItemId: event.id,
              type: "DIRECT_MESSAGE" as const,
              content: event.text,
              senderName: sender.name,
              senderHandle: sender.handle,
              senderAvatarUrl: sender.avatarUrl,
              receivedAt: new Date(event.created_at),
              rawData: event as unknown as Record<string, unknown>,
            };
          });

        return {
          platform: this.platform,
          accountId,
          messages,
          hasMore: !!response.meta?.next_token,
          cursor: response.meta?.next_token,
          rateLimitRemaining: this.rateLimitStatus?.remaining,
          rateLimitReset: this.rateLimitStatus?.resetAt,
        };
      } catch (error) {
        // DM access requires elevated permissions - return empty result if not available
        if (
          error instanceof Error &&
          (error.message.includes("403") || error.message.includes("401"))
        ) {
          return this.createEmptyResult(accountId);
        }
        throw error;
      }
    });
  }

  /**
   * Collect comments - Twitter doesn't have traditional comments,
   * but we can collect replies to the user's tweets
   */
  async collectComments(
    _accessToken: string,
    accountId: string,
    _options?: CollectionOptions,
  ): Promise<CollectionResult> {
    // For Twitter, comments are essentially replies to tweets
    // This would require fetching user's tweets first, then searching for replies
    // For now, we return empty as mentions already capture @ replies
    return this.createEmptyResult(accountId);
  }
}
