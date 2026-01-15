/**
 * Facebook Collector
 *
 * Collects messages and comments from Facebook Graph API.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const FACEBOOK_API_BASE = "https://graph.facebook.com/v18.0";

interface FacebookUser {
  id: string;
  name: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
  from: FacebookUser;
  parent?: {
    id: string;
  };
}

interface FacebookConversation {
  id: string;
  updated_time: string;
  participants: {
    data: FacebookUser[];
  };
}

interface FacebookMessage {
  id: string;
  message: string;
  created_time: string;
  from: FacebookUser;
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
}

interface FacebookCommentsResponse {
  data: FacebookComment[];
  paging?: {
    cursors?: {
      after?: string;
      before?: string;
    };
    next?: string;
  };
}

interface FacebookConversationsResponse {
  data: FacebookConversation[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

interface FacebookMessagesResponse {
  data: FacebookMessage[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

interface FacebookPostsResponse {
  data: FacebookPost[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

export class FacebookCollector extends BaseCollector {
  readonly platform = "FACEBOOK" as const;

  /**
   * Make authenticated request to Facebook Graph API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${FACEBOOK_API_BASE}${endpoint}`);
    url.searchParams.set("access_token", accessToken);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString());

    // Facebook doesn't use standard rate limit headers, but we can track usage limits
    const appUsage = response.headers.get("x-app-usage");
    if (appUsage) {
      try {
        const usage = JSON.parse(appUsage) as Record<string, unknown>;
        // If call_count or total_time approaches 100%, we're near rate limit
        const callCount = (usage["call_count"] as number) ?? 0;
        if (callCount >= 80) {
          this.updateRateLimitStatus(
            100 - callCount,
            100,
            Math.floor(Date.now() / 1000) + 3600, // Reset in 1 hour
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
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ id: string; name: string; }>("/me", accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collect mentions - Facebook doesn't have direct mentions like Twitter
   * We collect page mentions and tags instead
   */
  async collectMentions(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // Facebook page mentions come through the feed with type=tagged
      const params: Record<string, string> = {
        fields: "id,message,created_time,from{id,name,picture}",
        limit: (options?.maxResults ?? 25).toString(),
      };

      if (options?.cursor) {
        params.after = options.cursor;
      }

      try {
        const response = await this.makeRequest<FacebookCommentsResponse>(
          `/${accountId}/tagged`,
          accessToken,
          params,
        );

        if (!response.data || response.data.length === 0) {
          return this.createEmptyResult(accountId);
        }

        const messages: RawSocialMessage[] = response.data.map((item) => ({
          platformItemId: item.id,
          type: "MENTION" as const,
          content: item.message,
          senderName: item.from.name,
          senderAvatarUrl: item.from.picture?.data?.url,
          receivedAt: new Date(item.created_time),
          rawData: item as unknown as Record<string, unknown>,
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
        // Tagged endpoint may not be available for all page types
        if (error instanceof Error && error.message.includes("400")) {
          return this.createEmptyResult(accountId);
        }
        throw error;
      }
    });
  }

  /**
   * Collect direct messages (Messenger conversations)
   * Requires pages_messaging permission
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
        params.after = options.cursor;
      }

      try {
        // First get conversations
        const conversationsResponse = await this.makeRequest<FacebookConversationsResponse>(
          `/${accountId}/conversations`,
          accessToken,
          params,
        );

        if (
          !conversationsResponse.data ||
          conversationsResponse.data.length === 0
        ) {
          return this.createEmptyResult(accountId);
        }

        // Fetch messages from each conversation
        const allMessages: RawSocialMessage[] = [];

        for (const conversation of conversationsResponse.data.slice(0, 10)) {
          const messagesResponse = await this.makeRequest<FacebookMessagesResponse>(
            `/${conversation.id}/messages`,
            accessToken,
            {
              fields: "id,message,created_time,from{id,name,picture}",
              limit: "10",
            },
          );

          if (messagesResponse.data) {
            const messages = messagesResponse.data
              .filter((msg) => msg.from.id !== accountId) // Filter out own messages
              .map((msg) => ({
                platformItemId: msg.id,
                type: "DIRECT_MESSAGE" as const,
                content: msg.message,
                senderName: msg.from.name,
                senderAvatarUrl: msg.from.picture?.data?.url,
                receivedAt: new Date(msg.created_time),
                rawData: msg as unknown as Record<string, unknown>,
              }));
            allMessages.push(...messages);
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
        // Messenger access requires specific permissions
        if (
          error instanceof Error &&
          (error.message.includes("403") || error.message.includes("200"))
        ) {
          return this.createEmptyResult(accountId);
        }
        throw error;
      }
    });
  }

  /**
   * Collect comments on page posts
   */
  async collectComments(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // First get recent posts
      const postsParams: Record<string, string> = {
        fields: "id,message,created_time",
        limit: "10",
      };

      const postsResponse = await this.makeRequest<FacebookPostsResponse>(
        `/${accountId}/posts`,
        accessToken,
        postsParams,
      );

      if (!postsResponse.data || postsResponse.data.length === 0) {
        return this.createEmptyResult(accountId);
      }

      const allComments: RawSocialMessage[] = [];

      // Fetch comments for each post
      for (const post of postsResponse.data) {
        const commentsParams: Record<string, string> = {
          fields: "id,message,created_time,from{id,name,picture},parent",
          limit: (options?.maxResults ?? 25).toString(),
          filter: "stream", // Get all comments including replies
        };

        if (options?.cursor) {
          commentsParams.after = options.cursor;
        }

        try {
          const commentsResponse = await this.makeRequest<FacebookCommentsResponse>(
            `/${post.id}/comments`,
            accessToken,
            commentsParams,
          );

          if (commentsResponse.data) {
            const comments = commentsResponse.data.map((comment) => ({
              platformItemId: comment.id,
              type: (comment.parent ? "REPLY" : "COMMENT") as "REPLY" | "COMMENT",
              content: comment.message,
              senderName: comment.from.name,
              senderAvatarUrl: comment.from.picture?.data?.url,
              originalPostId: post.id,
              originalPostContent: post.message,
              receivedAt: new Date(comment.created_time),
              rawData: comment as unknown as Record<string, unknown>,
            }));
            allComments.push(...comments);
          }
        } catch {
          // Continue with other posts if one fails
          continue;
        }
      }

      return {
        platform: this.platform,
        accountId,
        messages: allComments,
        hasMore: !!postsResponse.paging?.next,
        cursor: postsResponse.paging?.cursors?.after,
        rateLimitRemaining: this.rateLimitStatus?.remaining,
        rateLimitReset: this.rateLimitStatus?.resetAt,
      };
    });
  }
}
