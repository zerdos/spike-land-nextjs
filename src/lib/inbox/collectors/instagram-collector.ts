/**
 * Instagram Collector
 *
 * Collects comments and DMs from Instagram Graph API.
 * Note: Instagram API is accessed through Facebook Graph API for business accounts.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";

interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  from: InstagramUser;
  parent_id?: string;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: string;
  permalink: string;
}

interface InstagramMention {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: string;
  permalink: string;
  username: string;
}

interface InstagramConversation {
  id: string;
  updated_time: string;
  participants: {
    data: InstagramUser[];
  };
}

interface InstagramMessage {
  id: string;
  message: string;
  created_time: string;
  from: {
    id: string;
    username?: string;
    name?: string;
  };
}

interface InstagramCommentsResponse {
  data: InstagramComment[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

interface InstagramMediaResponse {
  data: InstagramMedia[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

interface InstagramMentionsResponse {
  data: InstagramMention[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

interface InstagramConversationsResponse {
  data: InstagramConversation[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

interface InstagramMessagesResponse {
  data: InstagramMessage[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

export class InstagramCollector extends BaseCollector {
  readonly platform = "INSTAGRAM" as const;

  /**
   * Make authenticated request to Instagram Graph API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${INSTAGRAM_API_BASE}${endpoint}`);
    url.searchParams.set("access_token", accessToken);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString());

    // Track rate limits from Facebook/Instagram headers
    const appUsage = response.headers.get("x-app-usage");
    if (appUsage) {
      try {
        const usage = JSON.parse(appUsage) as Record<string, unknown>;
        const callCount = (usage["call_count"] as number) ?? 0;
        if (callCount >= 80) {
          this.updateRateLimitStatus(
            100 - callCount,
            100,
            Math.floor(Date.now() / 1000) + 3600,
          );
        }
      } catch {
        // Ignore parsing errors
      }
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      const errorText = await response.text();
      throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ id: string; username: string; }>(
        "/me",
        accessToken,
        { fields: "id,username" },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collect mentions (tagged media)
   */
  async collectMentions(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      const params: Record<string, string> = {
        fields: "id,caption,timestamp,media_type,permalink,username",
        limit: (options?.maxResults ?? 25).toString(),
      };

      if (options?.cursor) {
        params["after"] = options.cursor;
      }

      try {
        const response = await this.makeRequest<InstagramMentionsResponse>(
          `/${accountId}/tags`,
          accessToken,
          params,
        );

        if (!response.data || response.data.length === 0) {
          return this.createEmptyResult(accountId);
        }

        const messages: RawSocialMessage[] = response.data.map((mention) => ({
          platformItemId: mention.id,
          type: "MENTION" as const,
          content: mention.caption ?? "",
          senderName: mention.username,
          senderHandle: `@${mention.username}`,
          receivedAt: new Date(mention.timestamp),
          rawData: mention as unknown as Record<string, unknown>,
        }));

        return {
          platform: this.platform,
          accountId,
          messages,
          hasMore: !!response.paging?.next,
          cursor: response.paging?.cursors?.after,
          rateLimitRemaining: this.rateLimitStatus?.remaining,
          rateLimitReset: this.rateLimitStatus?.resetAt,
        };
      } catch (error) {
        // Tags endpoint may not be available for all account types
        if (error instanceof Error && error.message.includes("400")) {
          return this.createEmptyResult(accountId);
        }
        throw error;
      }
    });
  }

  /**
   * Collect direct messages
   * Requires instagram_manage_messages permission
   */
  async collectDirectMessages(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      const params: Record<string, string> = {
        fields: "id,updated_time,participants",
        limit: (options?.maxResults ?? 25).toString(),
      };

      if (options?.cursor) {
        params["after"] = options.cursor;
      }

      try {
        // Get conversations
        const conversationsResponse = await this.makeRequest<InstagramConversationsResponse>(
          `/${accountId}/conversations`,
          accessToken,
          { ...params, platform: "instagram" },
        );

        if (
          !conversationsResponse.data ||
          conversationsResponse.data.length === 0
        ) {
          return this.createEmptyResult(accountId);
        }

        const allMessages: RawSocialMessage[] = [];

        // Fetch messages from each conversation
        for (const conversation of conversationsResponse.data.slice(0, 10)) {
          try {
            const messagesResponse = await this.makeRequest<InstagramMessagesResponse>(
              `/${conversation.id}/messages`,
              accessToken,
              {
                fields: "id,message,created_time,from",
                limit: "10",
              },
            );

            if (messagesResponse.data) {
              const messages = messagesResponse.data
                .filter((msg) => msg.from.id !== accountId)
                .map((msg) => ({
                  platformItemId: msg.id,
                  type: "DIRECT_MESSAGE" as const,
                  content: msg.message,
                  senderName: msg.from.name ?? msg.from.username ?? "Unknown",
                  senderHandle: msg.from.username
                    ? `@${msg.from.username}`
                    : undefined,
                  receivedAt: new Date(msg.created_time),
                  rawData: msg as unknown as Record<string, unknown>,
                }));
              allMessages.push(...messages);
            }
          } catch {
            // Continue with other conversations if one fails
            continue;
          }
        }

        return {
          platform: this.platform,
          accountId,
          messages: allMessages,
          hasMore: !!conversationsResponse.paging?.next,
          cursor: conversationsResponse.paging?.cursors?.after,
          rateLimitRemaining: this.rateLimitStatus?.remaining,
          rateLimitReset: this.rateLimitStatus?.resetAt,
        };
      } catch (error) {
        // DM access requires specific permissions
        if (
          error instanceof Error &&
          (error.message.includes("403") ||
            error.message.includes("400") ||
            error.message.includes("permission"))
        ) {
          return this.createEmptyResult(accountId);
        }
        throw error;
      }
    });
  }

  /**
   * Collect comments on media posts
   */
  async collectComments(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // First get recent media
      const mediaParams: Record<string, string> = {
        fields: "id,caption,timestamp,media_type,permalink",
        limit: "10",
      };

      const mediaResponse = await this.makeRequest<InstagramMediaResponse>(
        `/${accountId}/media`,
        accessToken,
        mediaParams,
      );

      if (!mediaResponse.data || mediaResponse.data.length === 0) {
        return this.createEmptyResult(accountId);
      }

      const allComments: RawSocialMessage[] = [];

      // Fetch comments for each media item
      for (const media of mediaResponse.data) {
        const commentsParams: Record<string, string> = {
          fields: "id,text,timestamp,from,parent_id",
          limit: (options?.maxResults ?? 25).toString(),
        };

        if (options?.cursor) {
          commentsParams["after"] = options.cursor;
        }

        try {
          const commentsResponse = await this.makeRequest<InstagramCommentsResponse>(
            `/${media.id}/comments`,
            accessToken,
            commentsParams,
          );

          if (commentsResponse.data) {
            const comments = commentsResponse.data.map((comment) => ({
              platformItemId: comment.id,
              type: (comment.parent_id ? "REPLY" : "COMMENT") as "REPLY" | "COMMENT",
              content: comment.text,
              senderName: comment.from.name ?? comment.from.username,
              senderHandle: `@${comment.from.username}`,
              senderAvatarUrl: comment.from.profile_picture_url,
              originalPostId: media.id,
              originalPostContent: media.caption,
              receivedAt: new Date(comment.timestamp),
              rawData: comment as unknown as Record<string, unknown>,
            }));
            allComments.push(...comments);
          }
        } catch {
          // Continue with other media if one fails
          continue;
        }
      }

      return {
        platform: this.platform,
        accountId,
        messages: allComments,
        hasMore: !!mediaResponse.paging?.next,
        cursor: mediaResponse.paging?.cursors?.after,
        rateLimitRemaining: this.rateLimitStatus?.remaining,
        rateLimitReset: this.rateLimitStatus?.resetAt,
      };
    });
  }
}
