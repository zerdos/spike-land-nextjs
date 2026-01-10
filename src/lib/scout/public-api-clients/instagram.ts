/**
 * Public Instagram API Client (Mock)
 *
 * This client serves as a placeholder for fetching public Instagram data.
 * NOTE: Instagram's public API is heavily restricted and scraping is unreliable and against their ToS.
 * A production-ready solution would likely require a commercial scraping service or a private,
 * authenticated API integration, which is beyond the scope of this public-only client.
 *
 * This mock client provides predictable, fake data for development and testing.
 */

export interface PublicInstagramAccount {
  handle: string;
  name: string;
  profileUrl: string;
  avatarUrl: string;
}

export interface PublicInstagramPost {
  id: string;
  content: string;
  authorHandle: string;
  url: string;
  publishedAt: Date;
  likes: number;
  comments: number;
}

export class PublicInstagramClient {
  // Disable delays in test/CI environments for faster test execution
  private readonly enableDelays = process.env.NODE_ENV !== 'test' && !process.env.CI;

  /**
   * Fetches mock information for an Instagram account.
   * @param handle The Instagram username.
   * @returns A mock PublicInstagramAccount object.
   */
  async getAccountInfo(handle: string): Promise<PublicInstagramAccount | null> {
    if (!handle) return null;

    // Simulate an API call delay (disabled in test environments)
    if (this.enableDelays) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      handle,
      name: `${handle}'s Photos`,
      profileUrl: `https://www.instagram.com/${handle}`,
      avatarUrl: `https://via.placeholder.com/150/E4405F/FFFFFF?Text=${handle}`,
    };
  }

  /**
   * Fetches mock recent posts for an Instagram account.
   * @param handle The Instagram username.
   * @returns An array of mock PublicInstagramPost objects.
   */
  async getPosts(handle: string): Promise<PublicInstagramPost[]> {
    if (!handle) return [];

    // Simulate an API call delay (disabled in test environments)
    if (this.enableDelays) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const posts: PublicInstagramPost[] = Array.from({ length: 5 }, (_, i) => {
      const postId = `mock_ig_post_${i + 1}`;
      const publishedAt = new Date(Date.now() - i * 36 * 60 * 60 * 1000); // Posts every 1.5 days
      return {
        id: postId,
        content: `Mock photo post #${i + 1} from ${handle}. Imagine a beautiful picture here. #instagram #mock #test`,
        authorHandle: handle,
        url: `https://www.instagram.com/p/${postId}`,
        publishedAt,
        likes: Math.floor(Math.random() * 2000) + 50,
        comments: Math.floor(Math.random() * 200) + 10,
      };
    });

    return posts;
  }

  /**
   * Validates if an Instagram account exists.
   * For this mock client, it always returns true for non-empty handles.
   * @param handle The Instagram username to validate.
   * @returns True.
   */
  async validateAccount(handle: string): Promise<boolean> {
    return !!handle;
  }
}
