/**
 * Public Twitter API Client
 *
 * This client uses a public Nitter instance to fetch Twitter data without authentication.
 * Nitter provides RSS feeds, which are more stable to parse than scraping Twitter directly.
 * Note: Nitter instances can be unreliable. A production implementation should cycle through a list of instances.
 */

import { XMLParser } from 'fast-xml-parser';

// A public Nitter instance. This should be configurable in a real application.
const NITTER_INSTANCE_URL = 'https://nitter.net';

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

export class PublicTwitterClient {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  private getRssFeedUrl(handle: string): string {
    return `${NITTER_INSTANCE_URL}/${handle}/rss`;
  }

  /**
   * Fetches basic information for a Twitter account.
   * @param handle The Twitter handle of the user.
   * @returns PublicTwitterAccount info or null if not found.
   */
  async getAccountInfo(handle: string): Promise<PublicTwitterAccount | null> {
    const rssUrl = this.getRssFeedUrl(handle);
    try {
      const response = await fetch(rssUrl);
      if (!response.ok) {
        console.error(`Failed to fetch Nitter feed for ${handle}: ${response.statusText}`);
        return null;
      }

      const rssText = await response.text();
      const feed = this.parser.parse(rssText);

      const channel = feed.rss.channel;
      if (!channel || !channel.title) {
        return null;
      }

      const avatarUrl = channel.image?.url || '';

      return {
        handle,
        name: channel.title.replace(` (@${handle})`, ''),
        profileUrl: channel.link || `${NITTER_INSTANCE_URL}/${handle}`,
        avatarUrl,
      };
    } catch (error) {
      console.error(`Error fetching or parsing Nitter feed for ${handle}:`, error);
      return null;
    }
  }

  /**
   * Fetches recent posts for a Twitter account.
   * @param handle The Twitter handle of the user.
   * @returns An array of PublicTweet objects.
   */
  async getPosts(handle: string): Promise<PublicTweet[]> {
    const rssUrl = this.getRssFeedUrl(handle);
    try {
      const response = await fetch(rssUrl);
      if (!response.ok) {
        return [];
      }
      const rssText = await response.text();
      const feed = this.parser.parse(rssText);

      const items = feed.rss.channel?.item;
      if (!items) {
        return [];
      }

      const posts: PublicTweet[] = (Array.isArray(items) ? items : [items]).map((item: any) => {
        const url = item.link || '';
        const id = url.split('/').pop()?.split('#')[0] || '';

        // Nitter RSS feed descriptions sometimes contain engagement stats, but it's not guaranteed.
        const description = item.description || '';
        const commentsMatch = description.match(/💬\s*([\d,]+)/);
        const likesMatch = description.match(/♥\s*([\d,]+)/) || description.match(/♥️\s*([\d,]+)/);
        const sharesMatch = description.match(/🔁\s*([\d,]+)/);

        const parseCount = (match: RegExpMatchArray | null) => match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;

        return {
          id,
          content: item.title || '',
          authorHandle: item['dc:creator'] ? item['dc:creator'].replace(/^@/, '') : handle,
          url,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          likes: parseCount(likesMatch),
          comments: parseCount(commentsMatch),
          shares: parseCount(sharesMatch),
        };
      });

      return posts;
    } catch (error) {
      console.error(`Error fetching or parsing Nitter feed for ${handle}:`, error);
      return [];
    }
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
