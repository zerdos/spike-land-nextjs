/**
 * LinkedIn API Client
 *
 * Implements ISocialClient interface for LinkedIn Organization (Company) pages
 * Uses LinkedIn Marketing API v2
 * API Reference: https://learn.microsoft.com/en-us/linkedin/marketing/
 */

import type {
  ISocialClient,
  OAuthTokenResponse,
  PostOptions,
  PostResult,
  SocialAccountInfo,
  SocialClientOptions,
  SocialMetricsData,
  SocialPost,
} from "../types";

const LINKEDIN_API_BASE = "https://api.linkedin.com";
const LINKEDIN_OAUTH_AUTHORIZE = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_ENDPOINT = "https://www.linkedin.com/oauth/v2/accessToken";

// Scopes for organization management
const LINKEDIN_SCOPES = [
  "r_organization_social",
  "w_organization_social",
  "rw_organization_admin",
  "r_basicprofile",
].join(" ");

interface LinkedInApiError {
  message?: string;
  serviceErrorCode?: number;
  status?: number;
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

interface LinkedInProfile {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  profilePicture?: {
    displayImage?: string;
  };
}

interface LinkedInOrganization {
  organizationalTarget: string;
  role: string;
  roleAssignee: string;
  state: string;
}

interface LinkedInOrganizationInfo {
  id: number;
  localizedName: string;
  vanityName?: string;
  logoV2?: {
    "cropped~"?: {
      elements?: Array<{
        identifiers?: Array<{ identifier?: string; }>;
      }>;
    };
  };
  followersCount?: number;
}

interface LinkedInShareContent {
  shareCommentary: {
    text: string;
  };
  shareMediaCategory: "NONE" | "ARTICLE" | "IMAGE";
  media?: Array<{
    status: string;
    originalUrl?: string;
    media?: string; // LinkedIn asset URN for uploaded images (urn:li:digitalmediaAsset:xxx)
    title?: { text: string; };
    description?: { text: string; };
  }>;
}

interface LinkedInUGCPost {
  author: string;
  lifecycleState: string;
  specificContent: {
    "com.linkedin.ugc.ShareContent": LinkedInShareContent;
  };
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": string;
  };
}

interface LinkedInCreatePostResponse {
  id: string;
}

interface LinkedInShare {
  activity: string;
  created: { time: number; };
  text?: { text: string; };
  id: string;
}

interface LinkedInSharesResponse {
  elements: LinkedInShare[];
  paging?: {
    count: number;
    start: number;
    total?: number;
  };
}

interface LinkedInShareStatistics {
  totalShareStatistics: {
    shareCount: number;
    clickCount: number;
    engagement: number;
    likeCount: number;
    impressionCount: number;
    commentCount: number;
    uniqueImpressionsCount?: number;
  };
  organizationalEntity: string;
}

interface LinkedInFollowerStatistics {
  elements: Array<{
    followerCounts: {
      organicFollowerCount: number;
      paidFollowerCount: number;
    };
  }>;
}

export class LinkedInClient implements ISocialClient {
  readonly platform = "LINKEDIN" as const;

  private accessToken?: string;
  private organizationId?: string;
  private organizationUrn?: string;

  constructor(options?: SocialClientOptions & { organizationUrn?: string; }) {
    this.accessToken = options?.accessToken;
    // accountId stores the organization ID (numeric)
    if (options?.accountId) {
      this.organizationId = options.accountId;
      this.organizationUrn = `urn:li:organization:${options.accountId}`;
    }
    // Support organizationUrn directly in options
    if (options?.organizationUrn) {
      this.organizationUrn = options.organizationUrn;
      // Extract ID from URN
      const match = options.organizationUrn.match(/urn:li:organization:(\d+)/);
      if (match) {
        this.organizationId = match[1];
      }
    }
  }

  /**
   * Get the LinkedIn OAuth authorization URL
   * LinkedIn uses standard OAuth 2.0 (no PKCE required)
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();

    if (!clientId) {
      throw new Error("LINKEDIN_CLIENT_ID environment variable is not set");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: LINKEDIN_SCOPES,
    });

    return `${LINKEDIN_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      throw new Error(
        "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(LINKEDIN_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `LinkedIn token exchange failed: ${errorData.message || response.statusText}`,
      );
    }

    const data: LinkedInTokenResponse = await response.json();

    // Store access token for subsequent API calls
    this.accessToken = data.access_token;

    // LinkedIn access tokens expire in 60 days (5184000 seconds)
    // Refresh tokens expire in 365 days
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: "Bearer",
      scope: data.scope,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      throw new Error(
        "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables are required",
      );
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(LINKEDIN_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `LinkedIn token refresh failed: ${errorData.message || response.statusText}`,
      );
    }

    const data: LinkedInTokenResponse = await response.json();

    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: "Bearer",
      scope: data.scope,
    };
  }

  /**
   * Get authenticated user's profile information
   */
  async getUserProfile(): Promise<LinkedInProfile> {
    const token = this.getAccessTokenOrThrow();

    const response = await fetch(`${LINKEDIN_API_BASE}/v2/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to get LinkedIn user profile: ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Get list of organizations (company pages) the user can manage
   */
  async getOrganizations(): Promise<
    Array<{ id: string; name: string; urn: string; }>
  > {
    const token = this.getAccessTokenOrThrow();

    // Get organization ACLs - organizations the user can administer
    const response = await fetch(
      `${LINKEDIN_API_BASE}/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to get LinkedIn organizations: ${errorData.message || response.statusText}`,
      );
    }

    const data: { elements: LinkedInOrganization[]; } = await response.json();

    // Extract organization IDs from URNs and fetch details
    const organizations: Array<{ id: string; name: string; urn: string; }> = [];

    for (const acl of data.elements || []) {
      // Extract organization ID from URN like "urn:li:organization:12345"
      const urnMatch = acl.organizationalTarget.match(
        /urn:li:organization:(\d+)/,
      );
      if (!urnMatch) continue;

      const orgId = urnMatch[1];
      if (!orgId) continue;

      // Get organization details
      const orgResponse = await fetch(
        `${LINKEDIN_API_BASE}/v2/organizations/${orgId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        },
      );

      if (orgResponse.ok) {
        const orgData: LinkedInOrganizationInfo = await orgResponse.json();
        organizations.push({
          id: orgId,
          name: orgData.localizedName,
          urn: acl.organizationalTarget,
        });
      }
    }

    return organizations;
  }

  /**
   * Get organization (company page) information
   */
  async getAccountInfo(): Promise<SocialAccountInfo> {
    if (!this.organizationId) {
      throw new Error(
        "Organization ID is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    const response = await fetch(
      `${LINKEDIN_API_BASE}/v2/organizations/${this.organizationId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to get LinkedIn organization info: ${errorData.message || response.statusText}`,
      );
    }

    const data: LinkedInOrganizationInfo = await response.json();

    // Get follower count
    let followersCount = 0;
    const followersResponse = await fetch(
      `${LINKEDIN_API_BASE}/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${
        encodeURIComponent(
          this.organizationUrn || `urn:li:organization:${this.organizationId}`,
        )
      }`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (followersResponse.ok) {
      const followersData: LinkedInFollowerStatistics = await followersResponse
        .json();
      const followerCounts = followersData.elements?.[0]?.followerCounts;
      if (followerCounts) {
        followersCount = followerCounts.organicFollowerCount +
          followerCounts.paidFollowerCount;
      }
    }

    // Extract logo URL if available
    let avatarUrl: string | undefined;
    const logoElements = data.logoV2?.["cropped~"]?.elements;
    if (logoElements && logoElements.length > 0) {
      avatarUrl = logoElements[0]?.identifiers?.[0]?.identifier;
    }

    return {
      platformId: this.organizationId,
      username: data.vanityName || this.organizationId,
      displayName: data.localizedName,
      profileUrl: data.vanityName
        ? `https://www.linkedin.com/company/${data.vanityName}`
        : `https://www.linkedin.com/company/${this.organizationId}`,
      avatarUrl,
      followersCount,
    };
  }

  /**
   * Create a post on the organization's LinkedIn page
   * Uses UGC Post API
   */
  async createPost(
    content: string,
    options?: PostOptions,
  ): Promise<PostResult> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    // Build the share content
    const shareContent: LinkedInShareContent = {
      shareCommentary: {
        text: content,
      },
      shareMediaCategory: "NONE",
    };

    // Check for media IDs (pre-uploaded LinkedIn asset URNs)
    // LinkedIn requires images to be uploaded first via Assets API
    // Format: urn:li:digitalmediaAsset:xxx or urn:li:image:xxx
    if (options?.mediaIds && options.mediaIds.length > 0) {
      shareContent.shareMediaCategory = "IMAGE";
      shareContent.media = options.mediaIds.map((assetUrn) => ({
        status: "READY",
        media: assetUrn,
      }));
    } // Add link if provided in metadata (ARTICLE type - supports URL-based content)
    else {
      const link = options?.metadata?.["link"] as string | undefined;
      if (link) {
        shareContent.shareMediaCategory = "ARTICLE";
        shareContent.media = [
          {
            status: "READY",
            originalUrl: link,
          },
        ];
      }
    }

    const payload: LinkedInUGCPost = {
      author: this.organizationUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": shareContent,
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await fetch(`${LINKEDIN_API_BASE}/v2/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to create LinkedIn post: ${errorData.message || response.statusText}`,
      );
    }

    const data: LinkedInCreatePostResponse = await response.json();

    // The ID is in URN format like "urn:li:share:12345" or "urn:li:ugcPost:12345"
    return {
      platformPostId: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}`,
      publishedAt: new Date(),
    };
  }

  /**
   * Get posts from the organization's LinkedIn page
   */
  async getPosts(limit = 10): Promise<SocialPost[]> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    const params = new URLSearchParams({
      q: "owners",
      owners: this.organizationUrn,
      count: Math.min(limit, 100).toString(),
    });

    const response = await fetch(
      `${LINKEDIN_API_BASE}/v2/shares?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to get LinkedIn posts: ${errorData.message || response.statusText}`,
      );
    }

    const data: LinkedInSharesResponse = await response.json();

    return (data.elements || []).map((share) => ({
      id: share.id,
      platformPostId: share.activity || share.id,
      platform: "LINKEDIN" as const,
      content: share.text?.text || "",
      publishedAt: new Date(share.created.time),
      url: `https://www.linkedin.com/feed/update/${share.activity || share.id}`,
      rawData: share as unknown as Record<string, unknown>,
    }));
  }

  /**
   * Like a LinkedIn post
   * Uses the Social Actions API to create a like reaction
   */
  async likePost(postId: string): Promise<void> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    // LinkedIn uses URN format for posts
    // If postId is not already a URN, assume it's a share ID
    const actorUrn = this.organizationUrn;
    const objectUrn = postId.startsWith("urn:")
      ? postId
      : `urn:li:share:${postId}`;

    const payload = {
      actor: actorUrn,
      object: objectUrn,
    };

    const response = await fetch(
      `${LINKEDIN_API_BASE}/v2/socialActions/${encodeURIComponent(objectUrn)}/likes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to like LinkedIn post: ${errorData.message || response.statusText}`,
      );
    }
  }

  /**
   * Unlike a LinkedIn post
   */
  async unlikePost(postId: string): Promise<void> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    const objectUrn = postId.startsWith("urn:")
      ? postId
      : `urn:li:share:${postId}`;
    const actorUrn = this.organizationUrn;

    const response = await fetch(
      `${LINKEDIN_API_BASE}/v2/socialActions/${encodeURIComponent(objectUrn)}/likes/${
        encodeURIComponent(actorUrn)
      }`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to unlike LinkedIn post: ${errorData.message || response.statusText}`,
      );
    }
  }

  /**
   * Comment on a LinkedIn post
   */
  async commentOnPost(
    postId: string,
    content: string,
  ): Promise<{ id: string; }> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    const objectUrn = postId.startsWith("urn:")
      ? postId
      : `urn:li:share:${postId}`;

    const payload = {
      actor: this.organizationUrn,
      object: objectUrn,
      message: {
        text: content,
      },
    };

    const response = await fetch(
      `${LINKEDIN_API_BASE}/v2/socialActions/${encodeURIComponent(objectUrn)}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as LinkedInApiError;
      throw new Error(
        `Failed to comment on LinkedIn post: ${errorData.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as { id?: string; };
    return { id: data.id || postId };
  }

  /**
   * Get organization-level metrics and share statistics
   */
  async getMetrics(): Promise<SocialMetricsData> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    // Get follower statistics
    let followers = 0;
    const followersResponse = await fetch(
      `${LINKEDIN_API_BASE}/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${
        encodeURIComponent(this.organizationUrn)
      }`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (followersResponse.ok) {
      const followersData: LinkedInFollowerStatistics = await followersResponse
        .json();
      const followerCounts = followersData.elements?.[0]?.followerCounts;
      if (followerCounts) {
        followers = followerCounts.organicFollowerCount +
          followerCounts.paidFollowerCount;
      }
    }

    // Get share statistics for the organization
    let impressions = 0;
    let engagementRate = 0;

    const statsResponse = await fetch(
      `${LINKEDIN_API_BASE}/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${
        encodeURIComponent(this.organizationUrn)
      }`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (statsResponse.ok) {
      const statsData: { elements: LinkedInShareStatistics[]; } = await statsResponse.json();
      const stats = statsData.elements?.[0]?.totalShareStatistics;
      if (stats) {
        impressions = stats.impressionCount || 0;
        engagementRate = stats.engagement || 0;
      }
    }

    // Get post count
    let postsCount = 0;
    const postsResponse = await fetch(
      `${LINKEDIN_API_BASE}/v2/shares?q=owners&owners=${
        encodeURIComponent(this.organizationUrn)
      }&count=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );

    if (postsResponse.ok) {
      const postsData: LinkedInSharesResponse = await postsResponse.json();
      postsCount = postsData.paging?.total || postsData.elements?.length || 0;
    }

    return {
      followers,
      following: 0, // Organizations don't follow others
      postsCount,
      impressions,
      engagementRate,
    };
  }

  /**
   * Set the access token for API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Set the organization ID and URN
   */
  setOrganization(organizationId: string, organizationUrn?: string): void {
    this.organizationId = organizationId;
    this.organizationUrn = organizationUrn ||
      `urn:li:organization:${organizationId}`;
  }

  /**
   * Register and upload an image to LinkedIn
   * Returns the asset URN to use in createPost with mediaIds option
   *
   * @param imageBuffer - The image binary data as Buffer or ArrayBuffer
   * @param mimeType - The image MIME type (image/jpeg, image/png, image/gif)
   * @returns The LinkedIn asset URN (urn:li:digitalmediaAsset:xxx)
   */
  async uploadImage(
    imageData: ArrayBuffer | Uint8Array,
    mimeType: "image/jpeg" | "image/png" | "image/gif" = "image/jpeg",
  ): Promise<string> {
    if (!this.organizationUrn) {
      throw new Error(
        "Organization URN is required. Set via constructor options or setOrganization()",
      );
    }

    const token = this.getAccessTokenOrThrow();

    // Step 1: Register the upload to get an upload URL
    const registerPayload = {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: this.organizationUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    };

    const registerResponse = await fetch(
      `${LINKEDIN_API_BASE}/v2/assets?action=registerUpload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(registerPayload),
      },
    );

    if (!registerResponse.ok) {
      const errorData = (await registerResponse.json().catch(
        () => ({}),
      )) as LinkedInApiError;
      throw new Error(
        `Failed to register LinkedIn image upload: ${
          errorData.message || registerResponse.statusText
        }`,
      );
    }

    const registerData = (await registerResponse.json()) as {
      value: {
        uploadMechanism: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
            uploadUrl: string;
            headers: Record<string, string>;
          };
        };
        asset: string;
      };
    };

    const uploadInfo = registerData.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ];
    const assetUrn = registerData.value.asset;

    if (!uploadInfo?.uploadUrl || !assetUrn) {
      throw new Error("Failed to get upload URL from LinkedIn");
    }

    // Step 2: Upload the image binary
    // Convert to Blob for fetch compatibility
    // Handle both ArrayBuffer and Uint8Array inputs
    const blobPart: BlobPart = imageData instanceof ArrayBuffer
      ? imageData
      : new Uint8Array(imageData);
    const imageBlob = new Blob([blobPart], { type: mimeType });

    const uploadHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": mimeType,
      ...uploadInfo.headers,
    };

    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: "PUT",
      headers: uploadHeaders,
      body: imageBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload image to LinkedIn: ${uploadResponse.statusText}`,
      );
    }

    return assetUrn;
  }

  /**
   * Get access token or throw if not set
   */
  private getAccessTokenOrThrow(): string {
    if (!this.accessToken) {
      throw new Error(
        "Access token is required. Call exchangeCodeForTokens first.",
      );
    }
    return this.accessToken;
  }
}
