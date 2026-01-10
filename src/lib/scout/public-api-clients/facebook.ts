/**
 * Public Facebook API Client (Mock)
 *
 * This client provides a placeholder for fetching public Facebook data.
 * NOTE: Facebook has a very restrictive API and does not offer a public, unauthenticated
 * way to fetch user posts. A real implementation would require a commercial scraping
 * service or a complex, fragile internal scraper that is against their ToS.
 *
 * This mock client returns predictable, fake data for development and testing purposes.
 */

export interface PublicFacebookAccount {
  handle: string;
  name: string;
  profileUrl: string;
  avatarUrl: string;
}

export interface PublicFacebookPost {
  id: string;
  content: string;
  authorHandle: string;
  url: string;
  publishedAt: Date;
  likes: number;
  comments: number;
  shares: number;
}

export class PublicFacebookClient {
  // Disable delays in test/CI environments for faster test execution
  private readonly enableDelays = process.env.NODE_ENV !== 'test' && !process.env.CI;

  /**
   * Fetches mock information for a Facebook account.
   * @param handle The Facebook username/handle.
   * @returns A mock PublicFacebookAccount object.
   */
  async getAccountInfo(handle: string): Promise<PublicFacebookAccount | null> {
    if (!handle) return null;

    // Simulate an API call delay (disabled in test environments)
    if (this.enableDelays) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      handle,
      name: `${handle.charAt(0).toUpperCase() + handle.slice(1)}'s Page`,
      profileUrl: `https://www.facebook.com/${handle}`,
      avatarUrl: `https://via.placeholder.com/150/0000FF/808080?Text=${handle}`,
    };
  }

  /**
   * Fetches mock recent posts for a Facebook account.
   * @param handle The Facebook username/handle.
   * @returns An array of mock PublicFacebookPost objects.
   */
  async getPosts(handle: string): Promise<PublicFacebookPost[]> {
    if (!handle) return [];

    // Simulate an API call delay (disabled in test environments)
    if (this.enableDelays) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const posts: PublicFacebookPost[] = Array.from({ length: 5 }, (_, i) => {
      const postId = `mock_fb_post_${i + 1}`;
      const publishedAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000); // One post per day
      return {
        id: postId,
        content: `This is mock post number ${i + 1} from ${handle}. It's a great day for some fake content! #mock #testing`,
        authorHandle: handle,
        url: `https://www.facebook.com/${handle}/posts/${postId}`,
        publishedAt,
        likes: Math.floor(Math.random() * 500) + 10,
        comments: Math.floor(Math.random() * 100) + 5,
        shares: Math.floor(Math.random() * 50) + 1,
      };
    });

    return posts;
  }

  /**
   * Validates if a Facebook account exists.
   * For this mock client, it always returns true for non-empty handles.
   * @param handle The Facebook username to validate.
   * @returns True.
   */
  async validateAccount(handle: string): Promise<boolean> {
    return !!handle;
  }
}
