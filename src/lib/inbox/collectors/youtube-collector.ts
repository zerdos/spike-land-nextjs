/**
 * YouTube Collector
 *
 * Collects comments from YouTube videos.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeComment {
  id: string;
  snippet: {
    textDisplay: string;
    textOriginal: string;
    authorDisplayName: string;
    authorProfileImageUrl?: string;
    authorChannelUrl?: string;
    videoId: string;
    canRate: boolean;
    viewerRating: string;
    likeCount: number;
    publishedAt: string;
    updatedAt: string;
  };
}

interface YouTubeCommentsResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeComment[];
}

export class YouTubeCollector extends BaseCollector {
  readonly platform = "YOUTUBE" as const;

  /**
   * Make authenticated request to YouTube API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`);
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
      throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ items: unknown[]; }>(
        "/channels",
        accessToken,
        { part: "id", mine: "true" },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collect comments from YouTube videos
   */
  async collect(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // First, get the channel's videos
      const videosResponse = await this.makeRequest<{
        items?: Array<{ id: { videoId: string; }; }>;
      }>(
        "/search",
        accessToken,
        {
          part: "id",
          forMine: "true",
          type: "video",
          maxResults: "10",
        },
      );

      const videoIds = videosResponse.items?.map(item => item.id.videoId) || [];
      const messages: RawSocialMessage[] = [];

      // For each video, fetch comments
      for (const videoId of videoIds) {
        try {
          const commentsResponse = await this.makeRequest<YouTubeCommentsResponse>(
            "/commentThreads",
            accessToken,
            {
              part: "snippet",
              videoId,
              maxResults: options?.limit?.toString() || "20",
              pageToken: options?.cursor || "",
            },
          );

          if (commentsResponse.items) {
            for (const item of commentsResponse.items) {
              messages.push(this.convertComment(item, videoId));
            }
          }
        } catch (error) {
          // Continue with next video if comments are disabled
          console.warn(`Failed to fetch comments for video ${videoId}:`, error);
        }
      }

      return {
        messages,
        hasMore: false,
        nextCursor: undefined,
      };
    });
  }

  /**
   * Convert YouTube comment to unified message format
   */
  private convertComment(
    item: YouTubeComment,
    videoId: string,
  ): RawSocialMessage {
    const comment = item.snippet;
    return {
      platform: "YOUTUBE",
      platformMessageId: item.id,
      messageType: "COMMENT",
      content: comment.textDisplay,
      senderPlatformId: comment.authorChannelUrl || comment.authorDisplayName,
      senderName: comment.authorDisplayName,
      senderHandle: undefined,
      senderAvatarUrl: comment.authorProfileImageUrl,
      timestamp: new Date(comment.publishedAt),
      threadId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      metadata: {
        likeCount: comment.likeCount,
        canRate: comment.canRate,
      },
    };
  }
}
