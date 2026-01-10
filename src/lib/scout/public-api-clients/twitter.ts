/**
 * Public Twitter API Client
 *
 * This client uses a public Nitter instance to fetch Twitter data without authentication.
 * Nitter provides RSS feeds, which are more stable to parse than scraping Twitter directly.
 * Note: Nitter instances can be unreliable. The implementation cycles through a list of fallback instances.
 */

import { XMLParser } from "fast-xml-parser";

// Configurable Nitter instances with fallbacks
const NITTER_INSTANCES = [
  process.env.NITTER_INSTANCE_URL || "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
];

let currentInstanceIndex = 0;

/**
 * Get the current Nitter instance URL and cycle to next on failure
 */
function getNitterInstance(): string {
  return NITTER_INSTANCES[currentInstanceIndex % NITTER_INSTANCES.length] ?? NITTER_INSTANCES[0]!;
}

/**
 * Try next Nitter instance in the fallback list
 */
function cycleToNextInstance(): void {
  currentInstanceIndex = (currentInstanceIndex + 1) % NITTER_INSTANCES.length;
}

export interface PublicTwitterAccount {
  handle: string;
  name: string;
  profileUrl: string;
  avatarUrl: string;
}

export interface PublicTweet {
  id: string;
  content: string;
  authorHandle: string;
  url: string;
  publishedAt: Date;
  likes: number;
  comments: number;
  shares: number; // Retweets
}

interface RssItem {
  link?: string;
  title?: string;
  description?: string;
  pubDate?: string;
  "dc:creator"?: string;
}

export class PublicTwitterClient {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  private getRssFeedUrl(handle: string): string {
    return `${getNitterInstance()}/${handle}/rss`;
  }

  /**
   * Fetches basic information for a Twitter account with fallback to alternative Nitter instances.
   * @param handle The Twitter handle of the user.
   * @returns PublicTwitterAccount info or null if not found.
   */
  async getAccountInfo(handle: string): Promise<PublicTwitterAccount | null> {
    // Try with multiple Nitter instances
    for (let attempt = 0; attempt < NITTER_INSTANCES.length; attempt++) {
      const rssUrl = this.getRssFeedUrl(handle);
      const instanceUrl = getNitterInstance();

      try {
        const response = await fetch(rssUrl);
        if (!response.ok) {
          console.error(
            `Failed to fetch Nitter feed for ${handle} from ${instanceUrl}: ${response.statusText}`,
          );
          cycleToNextInstance();
          continue;
        }

        const rssText = await response.text();
        const feed = this.parser.parse(rssText);

        const channel = feed.rss.channel;
        if (!channel || !channel.title) {
          return null;
        }

        const avatarUrl = channel.image?.url || "";

        return {
          handle,
          name: channel.title.replace(` (@${handle})`, ""),
          profileUrl: channel.link || `${instanceUrl}/${handle}`,
          avatarUrl,
        };
      } catch (error) {
        console.error(
          `Error fetching or parsing Nitter feed for ${handle} from ${instanceUrl}:`,
          error,
        );
        cycleToNextInstance();
      }
    }

    // All instances failed
    return null;
  }

  /**
   * Fetches recent posts for a Twitter account with fallback to alternative Nitter instances.
   * @param handle The Twitter handle of the user.
   * @returns An array of PublicTweet objects.
   */
  async getPosts(handle: string): Promise<PublicTweet[]> {
    // Try with multiple Nitter instances
    for (let attempt = 0; attempt < NITTER_INSTANCES.length; attempt++) {
      const rssUrl = this.getRssFeedUrl(handle);
      const instanceUrl = getNitterInstance();

      try {
        const response = await fetch(rssUrl);
        if (!response.ok) {
          cycleToNextInstance();
          continue;
        }

        const rssText = await response.text();
        const feed = this.parser.parse(rssText);

        const items = feed.rss.channel?.item;
        if (!items) {
          return [];
        }

        const posts: PublicTweet[] = (Array.isArray(items) ? items : [items]).map(
          (item: RssItem) => {
            const url = item.link || "";
            const id = url.split("/").pop()?.split("#")[0] || "";

            // Nitter RSS feed descriptions sometimes contain engagement stats, but it's not guaranteed.
            const description = item.description || "";
            const commentsMatch = description.match(/💬\s*([\d,]+)/);
            const likesMatch = description.match(/♥\s*([\d,]+)/) ||
              description.match(/♥️\s*([\d,]+)/);
            const sharesMatch = description.match(/🔁\s*([\d,]+)/);

            const parseCount = (match: RegExpMatchArray | null) =>
              match?.[1] ? parseInt(match[1].replace(/,/g, ""), 10) : 0;

            return {
              id,
              content: item.title || "",
              authorHandle: item["dc:creator"] ? item["dc:creator"].replace(/^@/, "") : handle,
              url,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              likes: parseCount(likesMatch),
              comments: parseCount(commentsMatch),
              shares: parseCount(sharesMatch),
            };
          },
        );

        return posts;
      } catch (error) {
        console.error(
          `Error fetching or parsing Nitter feed for ${handle} from ${instanceUrl}:`,
          error,
        );
        cycleToNextInstance();
      }
    }

    // All instances failed
    return [];
  }

  /**
   * Validates if a Twitter account exists by trying to fetch its info.
   * @param handle The Twitter handle to validate.
   * @returns True if the account exists, false otherwise.
   */
  async validateAccount(handle: string): Promise<boolean> {
    try {
      const accountInfo = await this.getAccountInfo(handle);
      return !!accountInfo;
    } catch {
      return false;
    }
  }
}
