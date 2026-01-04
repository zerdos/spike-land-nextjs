/**
 * Facebook Graph API Client
 *
 * Implements ISocialClient for Facebook Pages and Instagram Business accounts
 * Uses Facebook Graph API v21.0
 */

import type {
  FacebookPage,
  FacebookPost,
  ISocialClient,
  OAuthTokenResponse,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
} from "../types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Scopes for Facebook OAuth
const FACEBOOK_SCOPES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_show_list",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds until expiration
}

interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: { before?: string; after?: string; };
    next?: string;
  };
}

interface FacebookFeedResponse {
  data: FacebookPost[];
  paging?: {
    cursors?: { before?: string; after?: string; };
    next?: string;
    previous?: string;
  };
}

interface FacebookInsightsResponse {
  data: Array<{
    name: string;
    period: string;
    values: Array<{ value: number; end_time?: string; }>;
    title: string;
    description: string;
    id: string;
  }>;
}

interface FacebookPageInfo {
  id: string;
  name: string;
  fan_count?: number;
  followers_count?: number;
  category?: string;
  link?: string;
  picture?: { data?: { url?: string; }; };
}

interface FacebookCreatePostResponse {
  id: string;
}

export class FacebookClient implements ISocialClient {
  readonly platform = "FACEBOOK" as const;

  private accessToken?: string;
  private pageId?: string;
  private pageAccessToken?: string;

  constructor(options?: SocialClientOptions) {
    this.accessToken = options?.accessToken;
    this.pageId = options?.pageId || options?.accountId;
    // If accessToken is provided and pageId is set, assume it's a page token
    if (options?.accessToken && this.pageId) {
      this.pageAccessToken = options.accessToken;
    }
  }

  /**
   * Get the Facebook OAuth authorization URL
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const appId = process.env.FACEBOOK_SOCIAL_APP_ID;

    if (!appId) {
      throw new Error("FACEBOOK_SOCIAL_APP_ID environment variable is not set");
    }

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: FACEBOOK_SCOPES,
      response_type: "code",
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   * Returns a short-lived user access token
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    const appId = process.env.FACEBOOK_SOCIAL_APP_ID;
    const appSecret = process.env.FACEBOOK_SOCIAL_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        "FACEBOOK_SOCIAL_APP_ID and FACEBOOK_SOCIAL_APP_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Facebook token exchange failed: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: FacebookTokenResponse = await response.json();

    // Calculate expiration time if provided
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresAt,
    };
  }

  /**
   * Exchange a short-lived token for a long-lived token (~60 days)
   */
  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<OAuthTokenResponse> {
    const appId = process.env.FACEBOOK_SOCIAL_APP_ID;
    const appSecret = process.env.FACEBOOK_SOCIAL_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        "FACEBOOK_SOCIAL_APP_ID and FACEBOOK_SOCIAL_APP_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Facebook long-lived token exchange failed: ${
          errorData.error?.message || response.statusText
        }`,
      );
    }

    const data: FacebookLongLivedTokenResponse = await response.json();

    // Long-lived tokens last ~60 days
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresAt,
    };
  }

  /**
   * Get list of Facebook Pages the user manages
   * Page access tokens returned here don't expire
   */
  async getPages(userAccessToken?: string): Promise<FacebookPage[]> {
    const token = userAccessToken || this.accessToken;

    if (!token) {
      throw new Error("Access token is required to get pages");
    }

    const params = new URLSearchParams({
      access_token: token,
      fields: "id,name,access_token,category,instagram_business_account",
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?${params.toString()}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get Facebook pages: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: FacebookPagesResponse = await response.json();
    return data.data || [];
  }

  /**
   * Get account (page) information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    if (!this.pageId || !this.pageAccessToken) {
      throw new Error("Page ID and page access token are required");
    }

    const params = new URLSearchParams({
      access_token: this.pageAccessToken,
      fields: "id,name,fan_count,followers_count,category,link,picture",
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.pageId}?${params.toString()}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get page info: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: FacebookPageInfo = await response.json();

    return {
      platformId: data.id,
      username: data.name,
      displayName: data.name,
      profileUrl: data.link,
      avatarUrl: data.picture?.data?.url,
      followersCount: data.followers_count || data.fan_count,
    };
  }

  /**
   * Create a post on the Facebook page
   */
  async createPost(content: string, options?: PostOptions): Promise<PostResult> {
    if (!this.pageId || !this.pageAccessToken) {
      throw new Error("Page ID and page access token are required");
    }

    const body: Record<string, string> = {
      message: content,
      access_token: this.pageAccessToken,
    };

    // Add link if provided in metadata
    const link = options?.metadata?.link as string | undefined;
    if (link) {
      body.link = link;
    }

    // Handle scheduled posts
    if (options?.scheduledAt) {
      const timestamp = Math.floor(options.scheduledAt.getTime() / 1000);
      body.published = "false";
      body.scheduled_publish_time = timestamp.toString();
    }

    const response = await fetch(`${GRAPH_API_BASE}/${this.pageId}/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create post: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: FacebookCreatePostResponse = await response.json();

    // Post ID format is {page_id}_{post_id}
    const postUrl = `https://www.facebook.com/${data.id.replace("_", "/posts/")}`;

    return {
      platformPostId: data.id,
      url: postUrl,
      publishedAt: options?.scheduledAt || new Date(),
    };
  }

  /**
   * Get posts from the Facebook page feed
   */
  async getPosts(limit = 25): Promise<SocialPost[]> {
    if (!this.pageId || !this.pageAccessToken) {
      throw new Error("Page ID and page access token are required");
    }

    const params = new URLSearchParams({
      access_token: this.pageAccessToken,
      fields:
        "id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)",
      limit: limit.toString(),
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/${this.pageId}/feed?${params.toString()}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get posts: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data: FacebookFeedResponse = await response.json();

    return (data.data || []).map((post) => ({
      id: post.id,
      platformPostId: post.id,
      platform: "FACEBOOK" as const,
      content: post.message || "",
      publishedAt: new Date(post.created_time),
      url: post.permalink_url ||
        `https://www.facebook.com/${post.id.replace("_", "/posts/")}`,
      metrics: {
        likes: post.reactions?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
      },
      rawData: post as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Delete a post from the Facebook page
   */
  async deletePost(postId: string): Promise<void> {
    if (!this.pageAccessToken) {
      throw new Error("Page access token is required");
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${postId}?access_token=${this.pageAccessToken}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to delete post: ${errorData.error?.message || response.statusText}`,
      );
    }
  }

  /**
   * Get page insights/metrics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    if (!this.pageId || !this.pageAccessToken) {
      throw new Error("Page ID and page access token are required");
    }

    // Get page info for follower counts
    const pageParams = new URLSearchParams({
      access_token: this.pageAccessToken,
      fields: "fan_count,followers_count",
    });

    const pageResponse = await fetch(
      `${GRAPH_API_BASE}/${this.pageId}?${pageParams.toString()}`,
      { method: "GET" },
    );

    if (!pageResponse.ok) {
      const errorData = await pageResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to get page info: ${errorData.error?.message || pageResponse.statusText}`,
      );
    }

    const pageData: { fan_count?: number; followers_count?: number; } = await pageResponse.json();

    // Get insights for impressions and reach
    const insightMetrics = [
      "page_impressions",
      "page_reach",
      "page_engaged_users",
      "page_fans",
    ].join(",");

    const insightsParams = new URLSearchParams({
      access_token: this.pageAccessToken,
      metric: insightMetrics,
      period: "day",
      date_preset: "last_7d",
    });

    const insightsResponse = await fetch(
      `${GRAPH_API_BASE}/${this.pageId}/insights?${insightsParams.toString()}`,
      { method: "GET" },
    );

    let impressions = 0;
    let reach = 0;

    if (insightsResponse.ok) {
      const insightsData: FacebookInsightsResponse = await insightsResponse.json();

      for (const metric of insightsData.data || []) {
        const latestValue = metric.values?.[0]?.value || 0;

        switch (metric.name) {
          case "page_impressions":
            impressions = latestValue;
            break;
          case "page_reach":
            reach = latestValue;
            break;
        }
      }
    }

    // Get post count
    const feedParams = new URLSearchParams({
      access_token: this.pageAccessToken,
      fields: "id",
      limit: "100",
    });

    const feedResponse = await fetch(
      `${GRAPH_API_BASE}/${this.pageId}/feed?${feedParams.toString()}`,
      { method: "GET" },
    );

    let postsCount = 0;
    if (feedResponse.ok) {
      const feedData: FacebookFeedResponse = await feedResponse.json();
      postsCount = feedData.data?.length || 0;
    }

    const followers = pageData.followers_count || pageData.fan_count || 0;

    return {
      followers,
      following: 0, // Facebook pages don't follow others
      postsCount,
      impressions,
      reach,
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }

  /**
   * Set the access token for API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set the page ID and page access token
   */
  setPage(pageId: string, pageAccessToken: string): void {
    this.pageId = pageId;
    this.pageAccessToken = pageAccessToken;
  }
}
