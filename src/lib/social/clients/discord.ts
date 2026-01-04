/**
 * Discord Bot API Client
 *
 * Implements Discord Bot API for server management and announcements.
 * This is a bot-based client, NOT an OAuth client like the other social platforms.
 * The bot token is stored in environment variables, not per-user database records.
 *
 * API Reference: https://discord.com/developers/docs/reference
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Discord API error response format
 */
interface DiscordApiError {
  message: string;
  code?: number;
  errors?: Record<string, unknown>;
}

/**
 * Discord Guild (Server) information
 */
export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  owner_id: string;
  member_count?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  premium_tier: number;
  premium_subscription_count?: number;
}

/**
 * Discord Channel information
 */
export interface DiscordChannel {
  id: string;
  type: number;
  name?: string;
  guild_id?: string;
}

/**
 * Discord Message structure
 */
export interface DiscordMessage {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot?: boolean;
  };
  embeds?: DiscordEmbed[];
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
  }>;
}

/**
 * Discord Embed structure for rich messages
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

/**
 * Options for sending a Discord message
 */
export interface SendMessageOptions {
  embeds?: DiscordEmbed[];
  tts?: boolean;
}

/**
 * Discord server metrics
 */
export interface DiscordMetrics {
  memberCount: number;
  onlineCount: number;
  serverName: string;
  serverIcon: string | null;
  premiumTier: number;
  boostCount: number;
}

/**
 * Discord Bot Client
 *
 * Note: This client does NOT implement ISocialClient because Discord bots
 * use token-based auth, not OAuth. The bot token comes from environment
 * variables, not from user-specific database records.
 */
export class DiscordClient {
  private botToken: string;
  private guildId: string;

  constructor(options?: { botToken?: string; guildId?: string; }) {
    this.botToken = options?.botToken || process.env.DISCORD_BOT_TOKEN || "";
    this.guildId = options?.guildId || process.env.DISCORD_SERVER_ID || "";

    if (!this.botToken) {
      throw new Error(
        "DISCORD_BOT_TOKEN environment variable is not configured. " +
          "Create a bot at https://discord.com/developers/applications",
      );
    }

    if (!this.guildId) {
      throw new Error(
        "DISCORD_SERVER_ID environment variable is not configured. " +
          "This should be the ID of your Discord server (guild).",
      );
    }
  }

  /**
   * Make an authenticated request to the Discord API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${DISCORD_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new Error(
        `Discord rate limited. Retry after ${retryAfter || "unknown"} seconds.`,
      );
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as DiscordApiError;
      throw new Error(
        `Discord API error (${response.status}): ${errorData.message || response.statusText}`,
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get guild (server) information
   *
   * @param withCounts - Include approximate member and presence counts
   * @returns Guild information
   */
  async getGuildInfo(withCounts = false): Promise<DiscordGuild> {
    const params = withCounts ? "?with_counts=true" : "";
    return this.request<DiscordGuild>(`/guilds/${this.guildId}${params}`);
  }

  /**
   * Get the member count for the guild
   *
   * @returns Member count and online count
   */
  async getMemberCount(): Promise<{ memberCount: number; onlineCount: number; }> {
    const guild = await this.getGuildInfo(true);
    return {
      memberCount: guild.approximate_member_count ?? 0,
      onlineCount: guild.approximate_presence_count ?? 0,
    };
  }

  /**
   * Send a message to a Discord channel
   *
   * @param channelId - The channel ID to send the message to
   * @param content - The message content (max 2000 characters)
   * @param options - Additional message options (embeds, tts)
   * @returns The created message
   */
  async sendMessage(
    channelId: string,
    content: string,
    options?: SendMessageOptions,
  ): Promise<DiscordMessage> {
    // Validate content length
    if (content && content.length > 2000) {
      throw new Error("Message content exceeds 2000 character limit");
    }

    // Either content or embeds must be providedMessage must have content or embeds
    if (!content && (!options?.embeds || options.embeds.length === 0)) {
      throw new Error("Either content or embeds must be provided");
    }

    interface MessagePayload {
      content?: string;
      embeds?: DiscordEmbed[];
      tts?: boolean;
    }

    const payload: MessagePayload = {};

    if (content) {
      payload.content = content;
    }

    if (options?.embeds && options.embeds.length > 0) {
      // Discord allows max 10 embeds per message
      if (options.embeds.length > 10) {
        throw new Error("Maximum of 10 embeds allowed per message");
      }
      payload.embeds = options.embeds;
    }

    if (options?.tts) {
      payload.tts = true;
    }

    return this.request<DiscordMessage>(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get messages from a Discord channel
   *
   * @param channelId - The channel ID to fetch messages from
   * @param limit - Number of messages to fetch (1-100, default 50)
   * @returns Array of messages
   */
  async getChannelMessages(
    channelId: string,
    limit = 50,
  ): Promise<DiscordMessage[]> {
    // Discord allows 1-100 messages per request
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.request<DiscordMessage[]>(
      `/channels/${channelId}/messages?limit=${safeLimit}`,
    );
  }

  /**
   * Get guild metrics including member count, online count, and server info
   *
   * @returns Discord server metrics
   */
  async getMetrics(): Promise<DiscordMetrics> {
    const guild = await this.getGuildInfo(true);

    // Build icon URL if available
    let serverIcon: string | null = null;
    if (guild.icon) {
      const ext = guild.icon.startsWith("a_") ? "gif" : "png";
      serverIcon = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}`;
    }

    return {
      memberCount: guild.approximate_member_count ?? guild.member_count ?? 0,
      onlineCount: guild.approximate_presence_count ?? 0,
      serverName: guild.name,
      serverIcon,
      premiumTier: guild.premium_tier,
      boostCount: guild.premium_subscription_count ?? 0,
    };
  }

  /**
   * Get channel information
   *
   * @param channelId - The channel ID
   * @returns Channel information
   */
  async getChannel(channelId: string): Promise<DiscordChannel> {
    return this.request<DiscordChannel>(`/channels/${channelId}`);
  }

  /**
   * Verify the bot has access to a channel
   *
   * @param channelId - The channel ID to verify
   * @returns true if the bot can access the channel
   */
  async verifyChannelAccess(channelId: string): Promise<boolean> {
    try {
      await this.getChannel(channelId);
      return true;
    } catch {
      return false;
    }
  }
}
