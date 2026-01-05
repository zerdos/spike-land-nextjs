/**
 * Instagram Graph API Client
 *
 * Instagram Business accounts are accessed via Facebook Graph API.
 * The access token is the Facebook Page token (not user token).
 * OAuth is handled by the Facebook callback route.
 */

import type { SocialPlatform } from "@prisma/client";

import { tryCatch } from "@/lib/try-catch";

import type {
  InstagramMedia,
  ISocialClient,
  OAuthTokenResponse,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
} from "../types";

// Facebook Graph API version (Instagram uses Facebook's Graph API)
// Note: Facebook deprecates API versions ~2 years after release
// v21.0 was released in October 2024, expected deprecation ~October 2026
// Monitor: https://developers.facebook.com/docs/graph-api/changelog
const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Container status polling configuration
// Instagram media container processing can take time for large images or slow networks
// These defaults can be overridden via environment variables
const DEFAULT_CONTAINER_STATUS_POLL_INTERVAL = 1000; // 1 second
const DEFAULT_CONTAINER_STATUS_MAX_ATTEMPTS = 30; // 30 seconds max wait

const CONTAINER_STATUS_POLL_INTERVAL =
  Number.parseInt(process.env.INSTAGRAM_CONTAINER_STATUS_POLL_INTERVAL_MS ?? "", 10) ||
  DEFAULT_CONTAINER_STATUS_POLL_INTERVAL;

const CONTAINER_STATUS_MAX_ATTEMPTS =
  Number.parseInt(process.env.INSTAGRAM_CONTAINER_STATUS_MAX_ATTEMPTS ?? "", 10) ||
  DEFAULT_CONTAINER_STATUS_MAX_ATTEMPTS;

interface InstagramAccountResponse {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

interface InstagramMediaContainer {
  id: string;
}

interface InstagramContainerStatus {
  status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
}

interface InstagramMediaListResponse {
  data: InstagramMedia[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

interface InstagramInsightsResponse {
  data: Array<{
    name: string;
    period: string;
    values: Array<{
      value: number;
    }>;
    title: string;
    description: string;
    id: string;
  }>;
}

export class InstagramClient implements ISocialClient {
  readonly platform: SocialPlatform = "INSTAGRAM";
  private accessToken: string;
  private igUserId: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken || "";
    this.igUserId = options?.igUserId || "";
  }

  /**
   * Get OAuth authorization URL
   * Instagram uses Facebook OAuth - redirect to Facebook auth instead
   */
  getAuthUrl(_redirectUri: string, _state: string): string {
    throw new Error(
      "Instagram uses Facebook OAuth. Use the Facebook auth flow instead and ensure instagram_basic permission is requested.",
    );
  }

  /**
   * Exchange authorization code for tokens
   * Handled by Facebook callback route
   */
  exchangeCodeForTokens(
    _code: string,
    _redirectUri: string,
    _codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    throw new Error(
      "Instagram token exchange is handled by the Facebook callback route. " +
        "The Facebook Page token is used for Instagram Business account access.",
    );
  }

  /**
   * Get Instagram account information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    this.validateConfig();

    const url = new URL(`${GRAPH_API_BASE}/${this.igUserId}`);
    url.searchParams.set(
      "fields",
      "id,username,name,profile_picture_url,followers_count,follows_count,media_count",
    );
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Instagram API error: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    const data: InstagramAccountResponse = await response.json();

    return {
      platformId: data.id,
      username: data.username,
      displayName: data.name || data.username,
      profileUrl: `https://instagram.com/${data.username}`,
      avatarUrl: data.profile_picture_url,
      followersCount: data.followers_count,
      followingCount: data.follows_count,
    };
  }

  /**
   * Create an Instagram post
   *
   * Instagram posts REQUIRE an image. The process is:
   * 1. Create media container with image URL and optional caption
   * 2. Poll for container status (wait for FINISHED)
   * 3. Publish the container
   */
  async createPost(content: string, options?: PostOptions): Promise<PostResult> {
    this.validateConfig();

    const imageUrl = options?.mediaUrls?.[0];
    if (!imageUrl) {
      throw new Error(
        "Instagram posts require an image. Provide at least one URL in mediaUrls.",
      );
    }

    // Step 1: Create media container
    const containerId = await this.createMediaContainer(imageUrl, content);

    // Step 2: Wait for container to be ready
    await this.waitForContainerReady(containerId);

    // Step 3: Publish the container
    const mediaId = await this.publishContainer(containerId);

    // Get the published post to return the permalink
    const postData = await this.getMediaById(mediaId);

    return {
      platformPostId: mediaId,
      url: postData.permalink,
      publishedAt: new Date(postData.timestamp),
    };
  }

  /**
   * Get Instagram posts/media
   */
  async getPosts(limit = 10): Promise<SocialPost[]> {
    this.validateConfig();

    const url = new URL(`${GRAPH_API_BASE}/${this.igUserId}/media`);
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Instagram API error: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    const data: InstagramMediaListResponse = await response.json();

    return data.data.map((media) => ({
      id: media.id,
      platformPostId: media.id,
      platform: "INSTAGRAM" as const,
      content: media.caption || "",
      mediaUrls: media.media_url ? [media.media_url] : undefined,
      publishedAt: new Date(media.timestamp),
      url: media.permalink,
      metrics: {
        likes: media.like_count || 0,
        comments: media.comments_count || 0,
        shares: 0, // Instagram doesn't expose shares in basic API
      },
      rawData: media as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Like an Instagram media post
   * Note: Instagram Graph API does not support programmatic likes on behalf of users.
   * This is a limitation of the Instagram Graph API for Business accounts.
   * The method is provided for interface consistency but will throw an error.
   */
  async likeMedia(_mediaId: string): Promise<void> {
    throw new Error(
      "Instagram Graph API does not support programmatic likes. " +
        "Users must like posts directly through the Instagram app.",
    );
  }

  /**
   * Unlike an Instagram media post
   * Note: Instagram Graph API does not support programmatic unlikes.
   */
  async unlikeMedia(_mediaId: string): Promise<void> {
    throw new Error(
      "Instagram Graph API does not support programmatic unlikes. " +
        "Users must unlike posts directly through the Instagram app.",
    );
  }

  /**
   * Comment on an Instagram media post
   */
  async commentOnMedia(mediaId: string, content: string): Promise<{ id: string; }> {
    this.validateConfig();

    const url = new URL(`${GRAPH_API_BASE}/${mediaId}/comments`);
    url.searchParams.set("message", content);
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString(), {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to comment on Instagram media: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    return response.json() as Promise<{ id: string; }>;
  }

  /**
   * Get Instagram account metrics/insights
   */
  async getMetrics(): Promise<SocialMetricsData> {
    this.validateConfig();

    // Get account info for follower counts
    const accountInfo = await this.getAccountInfo();

    // Get insights (requires Instagram Business or Creator account)
    const { data: insights } = await tryCatch(this.fetchInsights());

    // Calculate date range (last 28 days for Instagram insights)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    return {
      followers: accountInfo.followersCount || 0,
      following: accountInfo.followingCount || 0,
      postsCount: 0, // Would need separate API call
      impressions: insights?.impressions,
      reach: insights?.reach,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate that required configuration is present
   */
  private validateConfig(): void {
    const normalizedAccessToken = this.accessToken !== undefined && this.accessToken !== null
      ? String(this.accessToken).trim()
      : "";
    if (!normalizedAccessToken) {
      throw new Error("Instagram client requires an access token");
    }

    const normalizedIgUserId = this.igUserId !== undefined && this.igUserId !== null
      ? String(this.igUserId).trim()
      : "";
    if (!normalizedIgUserId) {
      throw new Error("Instagram client requires an Instagram User ID (igUserId)");
    }
  }

  /**
   * Create a media container for image upload
   */
  private async createMediaContainer(imageUrl: string, caption: string): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.igUserId}/media`);
    url.searchParams.set("image_url", imageUrl);
    if (caption) {
      url.searchParams.set("caption", caption);
    }
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString(), {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create Instagram media container: ${response.status} - ${
          JSON.stringify(errorData)
        }`,
      );
    }

    const data: InstagramMediaContainer = await response.json();
    return data.id;
  }

  /**
   * Poll for container status until it's ready for publishing
   */
  private async waitForContainerReady(containerId: string): Promise<void> {
    let attempts = 0;

    while (attempts < CONTAINER_STATUS_MAX_ATTEMPTS) {
      const status = await this.getContainerStatus(containerId);

      switch (status.status_code) {
        case "FINISHED":
          return; // Ready to publish

        case "IN_PROGRESS":
          // Wait and retry
          await this.sleep(CONTAINER_STATUS_POLL_INTERVAL);
          attempts++;
          break;

        case "ERROR":
          throw new Error(
            `Instagram media container failed: ${status.status || "Unknown error"}`,
          );

        case "EXPIRED":
          throw new Error(
            "Instagram media container expired. Please try again with a fresh upload.",
          );

        case "PUBLISHED":
          throw new Error(
            "Instagram media container was already published.",
          );

        default:
          throw new Error(
            `Unknown container status: ${status.status_code}`,
          );
      }
    }

    throw new Error(
      `Instagram media container processing timed out after ${CONTAINER_STATUS_MAX_ATTEMPTS} seconds`,
    );
  }

  /**
   * Get the status of a media container
   */
  private async getContainerStatus(containerId: string): Promise<InstagramContainerStatus> {
    const url = new URL(`${GRAPH_API_BASE}/${containerId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to check container status: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    return response.json();
  }

  /**
   * Publish a media container
   */
  private async publishContainer(containerId: string): Promise<string> {
    const url = new URL(`${GRAPH_API_BASE}/${this.igUserId}/media_publish`);
    url.searchParams.set("creation_id", containerId);
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString(), {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to publish Instagram media: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    const data: { id: string; } = await response.json();
    return data.id;
  }

  /**
   * Get a single media item by ID
   */
  private async getMediaById(mediaId: string): Promise<InstagramMedia> {
    const url = new URL(`${GRAPH_API_BASE}/${mediaId}`);
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
    );
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get Instagram media: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    return response.json();
  }

  /**
   * Fetch Instagram insights
   * Note: Requires Instagram Business or Creator account
   */
  private async fetchInsights(): Promise<{ impressions?: number; reach?: number; }> {
    // Instagram insights are available for business/creator accounts only
    // We request lifetime metrics for follower_count and day-based for impressions/reach
    const url = new URL(`${GRAPH_API_BASE}/${this.igUserId}/insights`);
    url.searchParams.set("metric", "impressions,reach,follower_count,profile_views");
    url.searchParams.set("period", "day");
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      // Insights may not be available for all accounts
      // Return empty data rather than throwing
      return {};
    }

    const data: InstagramInsightsResponse = await response.json();

    const result: { impressions?: number; reach?: number; } = {};

    for (const metric of data.data) {
      const latestValue = metric.values[metric.values.length - 1]?.value;
      if (metric.name === "impressions" && latestValue !== undefined) {
        result.impressions = latestValue;
      } else if (metric.name === "reach" && latestValue !== undefined) {
        result.reach = latestValue;
      }
    }

    return result;
  }

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
